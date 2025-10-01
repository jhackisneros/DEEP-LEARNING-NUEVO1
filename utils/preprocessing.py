# utils/preprocessing.py
import numpy as np
from PIL import Image, ImageOps
import base64
import io
import re

# Compatibilidad con Pillow 10+
try:
    resample_method = Image.Resampling.LANCZOS
except AttributeError:
    resample_method = Image.LANCZOS

def preprocess_image(image_input, target_size=(28, 28), flatten=True):
    """
    Preprocesa imágenes para que se asemejen al formato MNIST:
    - Acepta base64 o bytes
    - Convierte a escala de grises
    - Invierte colores (blanco -> negro)
    - Binariza
    - Recorta bordes blancos
    - Centra en un lienzo 28x28
    - Normaliza a [0, 1]
    """
    # 🧠 1️⃣ Decodificar si es base64
    if isinstance(image_input, str) and image_input.startswith('data:image'):
        image_input = re.sub('^data:image/.+;base64,', '', image_input)
        image_input = base64.b64decode(image_input)

    # 🧠 2️⃣ Abrir y convertir a escala de grises
    img = Image.open(io.BytesIO(image_input)).convert('L')

    # 🧠 3️⃣ Invertir colores → Fondo negro, número blanco
    img = ImageOps.invert(img)

    # 🧠 4️⃣ Binarizar (umbral)
    img = img.point(lambda x: 0 if x < 50 else 255, 'L')

    # 🧠 5️⃣ Recortar los bordes en blanco
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    # 🧠 6️⃣ Redimensionar manteniendo proporciones
    img.thumbnail((20, 20), resample_method)

    # 🧠 7️⃣ Centrar en lienzo 28x28
    new_img = Image.new('L', target_size, (0))  # fondo negro
    left = (target_size[0] - img.size[0]) // 2
    top = (target_size[1] - img.size[1]) // 2
    new_img.paste(img, (left, top))

    # 🧠 8️⃣ Convertir a array y normalizar
    img_array = np.array(new_img, dtype=np.float32) / 255.0

    if flatten:
        img_array = img_array.flatten()

    return img_array

def preprocess_canvas_data(canvas_data, target_size=(28, 28), flatten=True):
    """
    Convierte datos de canvas (array 2D o 1D) a formato listo para Keras.
    """
    arr = np.array(canvas_data, dtype=np.float32)
    if arr.max() > 1:
        arr /= 255.0  # normalizar

    img = Image.fromarray((arr * 255).astype(np.uint8)).convert('L')
    img = ImageOps.invert(img)
    img = img.resize(target_size, resample_method)
    img_array = np.array(img, dtype=np.float32) / 255.0

    if flatten:
        img_array = img_array.flatten()

    return img_array
