# app.py
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from flask import Flask, request, jsonify, render_template, send_file
import io
import json
from datetime import datetime
import numpy as np
from tensorflow import keras
from utils.preprocessing import preprocess_image
from utils.qr_utils import generate_qr_image_bytes
from utils.export_utils import export_predictions_to_csv

# -------------------------
# Inicialización de Flask
# -------------------------
app = Flask(
    __name__,
    template_folder=os.path.join(os.path.dirname(__file__), 'templates'),
    static_folder=os.path.join(os.path.dirname(__file__), 'static')
)
app.config['UPLOAD_FOLDER'] = os.path.join('app','uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# -------------------------
# Carga de modelos
# -------------------------
MLP_PATH = os.path.join('models', 'MLP_NUEVO.keras')
CNN_PATH = os.path.join('models', 'CNN_MNIST.keras')

mlp_model = keras.models.load_model(MLP_PATH, compile=False) if os.path.exists(MLP_PATH) else None
cnn_model = keras.models.load_model(CNN_PATH, compile=False) if os.path.exists(CNN_PATH) else None

if mlp_model:
    mlp_model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])
if cnn_model:
    cnn_model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])

# -------------------------
# Log de predicciones
# -------------------------
PRED_LOG = os.path.join('app','predictions.json')
if not os.path.exists(PRED_LOG):
    with open(PRED_LOG, 'w') as f:
        json.dump([], f)

def save_prediction_local(record: dict):
    with open(PRED_LOG, 'r+', encoding='utf-8') as fh:
        try:
            data = json.load(fh)
        except json.JSONDecodeError:
            data = []
        data.insert(0, record)
        fh.seek(0)
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.truncate()

# -------------------------
# Función para predecir con ambos modelos (MLP y CNN separados)
# -------------------------
def predict_both_models(image_array):
    result = {}

    if mlp_model:
        mlp_input = image_array.reshape(1, -1)
        mlp_pred = mlp_model.predict(mlp_input)
        result['mlp'] = {
            'pred': int(np.argmax(mlp_pred)),
            'confidence': float(np.max(mlp_pred))
        }

    if cnn_model:
        cnn_input = image_array.reshape(1,28,28,1)
        cnn_pred = cnn_model.predict(cnn_input)
        result['cnn'] = {
            'pred': int(np.argmax(cnn_pred)),
            'confidence': float(np.max(cnn_pred))
        }

    return result

# -------------------------
# Rutas principales
# -------------------------
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        return f"Login recibido para {username}"
    return render_template('login.html')

@app.route('/register', methods=['GET','POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        return f"Registro recibido para {username}"
    return render_template('register.html')

# -------------------------
# Predicciones individuales
# -------------------------
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'error': 'No image provided'}), 400

    try:
        arr = preprocess_image(data['image'], target_size=(28,28), flatten=False)
        predictions = predict_both_models(arr)

        # Guardar registro
        record = {
            'time': datetime.utcnow().isoformat(),
            'user': data.get('user'),
            'pred_mlp': predictions.get('mlp', {}).get('pred', None),
            'conf_mlp': predictions.get('mlp', {}).get('confidence', None),
            'pred_cnn': predictions.get('cnn', {}).get('pred', None),
            'conf_cnn': predictions.get('cnn', {}).get('confidence', None),
        }
        save_prediction_local(record)

        return jsonify(predictions)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# -------------------------
# Predicciones batch
# -------------------------
@app.route('/predict_batch', methods=['POST'])
def predict_batch():
    results = []
    files = request.files.getlist('files')
    if not files:
        return jsonify({'error': 'No files provided'}), 400

    for f in files:
        try:
            arr = preprocess_image(f.read(), target_size=(28,28), flatten=False)
            predictions = predict_both_models(arr)
            record = {
                'time': datetime.utcnow().isoformat(),
                'filename': f.filename,
                'pred_mlp': predictions.get('mlp', {}).get('pred', None),
                'conf_mlp': predictions.get('mlp', {}).get('confidence', None),
                'pred_cnn': predictions.get('cnn', {}).get('pred', None),
                'conf_cnn': predictions.get('cnn', {}).get('confidence', None),
            }
            save_prediction_local(record)
            results.append(record)
        except Exception as e:
            results.append({'filename': getattr(f,'filename', None), 'error': str(e)})

    return jsonify(results)

# -------------------------
# Historial de predicciones (JSON) para frontend
# -------------------------
@app.route('/history', methods=['GET'])
def history():
    limit = int(request.args.get('limit', 50))
    user = request.args.get('user')

    with open(PRED_LOG, 'r', encoding='utf-8') as fh:
        data = json.load(fh)

    if user:
        data = [d for d in data if d.get('user') == user]

    return jsonify(data[:limit])

# -------------------------
# Ver predicciones en HTML
# -------------------------
@app.route('/predictions_view', methods=['GET'])
def predictions_view():
    limit = int(request.args.get('limit', 10))
    user = request.args.get('user')
    pred_filter = request.args.get('pred')

    with open(PRED_LOG, 'r', encoding='utf-8') as fh:
        data = json.load(fh)

    if user:
        data = [d for d in data if d.get('user') == user]
    if pred_filter is not None:
        try:
            pval = int(pred_filter)
            data = [d for d in data if d.get('pred_mlp') == pval or d.get('pred_cnn') == pval]
        except ValueError:
            pass

    return render_template("predictions_view.html", predictions=data[:limit])

# -------------------------
# Generación de QR
# -------------------------
@app.route('/generate_qr', methods=['POST'])
def generate_qr():
    payload = request.get_json()
    if not payload:
        return jsonify({'error': 'No payload'}), 400

    text = payload.get('url') or payload.get('text') or "https://tus-predicciones.com"
    img_bytes = generate_qr_image_bytes(text)
    return send_file(io.BytesIO(img_bytes), mimetype='image/png')

# -------------------------
# Exportar CSV
# -------------------------
@app.route('/export', methods=['GET'])
def export():
    with open(PRED_LOG, 'r', encoding='utf-8') as fh:
        data = json.load(fh)
    csv_bytes = export_predictions_to_csv(data)
    return send_file(
        io.BytesIO(csv_bytes),
        mimetype='text/csv',
        as_attachment=True,
        download_name='predictions_export.csv'
    )

# -------------------------
# Run server
# -------------------------
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
