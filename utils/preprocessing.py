# utils/preprocessing.py
import numpy as np
from PIL import Image, ImageOps
import base64
import io
import cv2  # Necesario para centrado y bounding box

# Compatibilidad con diferentes versiones de Pillow
try:
    resample_method = Image.Resampling.LANCZOS  # Pillow 10+
except AttributeError:
    resample_method = Image.LANCZOS  # Pillow <10

def _mnist_style_preprocess(img: Image.Image, target_size=(28, 28)):
    """
    Convierte la imagen a un formato similar a MNIST:
    - Blanco sobre negro
    - Recortada al bounding box
    - Escalada proporcionalmente a 20x20
    - Centrada en un lienzo de 28x28
    """
    # Convertir a escala de grises e invertir (MNIST es blanco sobre negro)
    img = img.convert("L")
    img = ImageOps.invert(img)

    # Convertir a array numpy para procesar
    arr = np.array(img)

    # Binarizar para facilitar el recorte
    _, thresh = cv2.threshold(arr, 10, 255, cv2.THRESH_BINARY)

    # Encontrar bounding box (donde hay dibujo)
    coords = cv2.findNonZero(thresh)
    if coords is None:
        # Imagen vacía
        return np.zeros(target_size, dtype=np.float32)
    x, y, w, h = cv2.boundingRect(coords)

    # Recortar al bounding box
    cropped = arr[y:y+h, x:x+w]

    # Escalar manteniendo proporción a 20x20 máximo
    max_side = max(w, h)
    scale = 20.0 / max_side
    new_w, new_h = int(round(w * scale)), int(round(h * scale))

    resized = cv2.resize(cropped, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # Crear lienzo 28x28 y centrar
    canvas = np.zeros(target_size, dtype=np.uint8)
    x_offset = (target_size[0] - new_w) // 2
    y_offset = (target_size[1] - new_h) // 2
    canvas[y_offset:y_offset+new_h, x_offset:x_offset+new_w] = resized

    # Normalizar a [0,1]
    canvas = canvas.astype(np.float32) / 255.0
    return canvas

def preprocess_image(image_input, target_size=(28,28), flatten=True):
    """
    Convierte una imagen (bytes o base64) a un array normalizado listo para Keras,
    aplicando un preprocesamiento tipo MNIST.
    """
    # Si es base64 tipo 'data:image/png;base64,...'
    if isinstance(image_input, str) and image_input.startswith('data:image'):
        header, base64_data = image_input.split(',', 1)
        image_input = base64.b64decode(base64_data)

    img = Image.open(io.BytesIO(image_input))
    processed = _mnist_style_preprocess(img, target_size)

    if flatten:
        processed = processed.flatten()

    return processed

def preprocess_canvas_data(canvas_data, target_size=(28,28), flatten=True):
    """
    Convierte datos de canvas (p. ej. array de píxeles) a formato listo para Keras.
    """
    arr = np.array(canvas_data, dtype=np.float32)
    if arr.max() > 1:
        arr /= 255.0  # normalizar

    img = Image.fromarray((arr*255).astype(np.uint8)).convert('L')
    processed = _mnist_style_preprocess(img, target_size)

    if flatten:
        processed = processed.flatten()

    return processed
