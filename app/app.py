# Proyecto Deep-Learning
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from flask import Flask, request, jsonify, render_template, send_file
import os
import io
import json
from datetime import datetime
import numpy as np
import tensorflow as tf
from tensorflow import keras
from utils.preprocessing import preprocess_image
from utils.qr_utils import generate_qr_image_bytes
from utils.export_utils import export_predictions_to_csv

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join('app','uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Try to load the model (if exists)
MODEL_PATH = os.path.join('models', 'mnist_compiled_model.keras')

model = keras.models.load_model(MODEL_PATH)
if os.path.exists(MODEL_PATH):
    model = keras.models.load_model(MODEL_PATH, compile=False, safe_mode=False)
    model.compile(optimizer="adam", loss="categorical_crossentropy", metrics=["accuracy"])
else:
    print(f"Warning: modelo no encontrado en {MODEL_PATH}. Rutas de predicción estarán inactivas hasta entrenar/colocar el modelo.")

PRED_LOG = os.path.join('app','predictions.json')
# Ensure predictions log exists
if not os.path.exists(PRED_LOG):
    with open(PRED_LOG, 'w') as f:
        json.dump([], f)


def save_prediction_local(record: dict):
    """Guarda la predicción localmente en predictions.json"""
    with open(PRED_LOG, 'r+', encoding='utf-8') as fh:
        try:
            data = json.load(fh)
        except json.JSONDecodeError:
            data = []
        data.insert(0, record)  # newest first
        fh.seek(0)
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.truncate()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    """Recibe JSON {image: 'data:image/png;base64,...', user: 'username' (optional)}"""
    if model is None:
        return jsonify({'error': 'Modelo no cargado'}), 500

    data = request.get_json()
    if not data or 'image' not in data:
        return jsonify({'error': 'No image provided'}), 400

    img_input = data['image']
    user = data.get('user', None)

    try:
        arr = preprocess_image(img_input, target_size=(28,28), flatten=True)
        pred = model.predict(arr.reshape(1, -1))
        label = int(np.argmax(pred))
        confidence = float(np.max(pred))

        record = {
            'time': datetime.utcnow().isoformat(),
            'user': user,
            'pred': label,
            'confidence': confidence,
        }
        save_prediction_local(record)

        return jsonify({'pred': label, 'confidence': confidence})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/predict_batch', methods=['POST'])
def predict_batch():
    """Recibe archivos via form-data (files). Retorna lista de predicciones."""
    if model is None:
        return jsonify({'error': 'Modelo no cargado'}), 500

    results = []
    files = request.files.getlist('files')
    if not files:
        return jsonify({'error': 'No files provided'}), 400

    for f in files:
        try:
            img_bytes = f.read()
            arr = preprocess_image(img_bytes, target_size=(28,28), flatten=True)
            pred = model.predict(arr.reshape(1, -1))
            label = int(np.argmax(pred))
            confidence = float(np.max(pred))
            record = {
                'time': datetime.utcnow().isoformat(),
                'filename': f.filename,
                'pred': label,
                'confidence': confidence,
            }
            save_prediction_local(record)
            results.append(record)
        except Exception as e:
            results.append({'filename': getattr(f, 'filename', None), 'error': str(e)})

    return jsonify(results)


@app.route('/history', methods=['GET'])
def history():
    """Devuelve historial filtrable por query params: user, pred, limit"""
    user = request.args.get('user')
    pred = request.args.get('pred')
    limit = int(request.args.get('limit', 50))

    with open(PRED_LOG, 'r', encoding='utf-8') as fh:
        data = json.load(fh)

    # Apply filters
    if user:
        data = [d for d in data if d.get('user') == user]
    if pred is not None:
        try:
            pval = int(pred)
            data = [d for d in data if d.get('pred') == pval]
        except ValueError:
            pass

    return jsonify(data[:limit])


@app.route('/export', methods=['GET'])
def export():
    """Exporta las predicciones a CSV y devuelve como attachment."""
    with open(PRED_LOG, 'r', encoding='utf-8') as fh:
        data = json.load(fh)

    csv_bytes = export_predictions_to_csv(data)
    return send_file(
        io.BytesIO(csv_bytes),
        mimetype='text/csv',
        as_attachment=True,
        download_name='predictions_export.csv'
    )


@app.route('/generate_qr', methods=['POST'])
def generate_qr():
    """Genera un QR a partir de un JSON {url: 'https://...' } o texto y devuelve la imagen PNG."""
    payload = request.get_json()
    if not payload:
        return jsonify({'error': 'No payload'}), 400

    text = payload.get('url') or payload.get('text')
    if not text:
        return jsonify({'error': 'No url/text provided'}), 400

    img_bytes = generate_qr_image_bytes(text)
    return send_file(io.BytesIO(img_bytes), mimetype='image/png')


if __name__ == '__main__':
    # Development server
    app.run(host='0.0.0.0', port=5000, debug=True)
