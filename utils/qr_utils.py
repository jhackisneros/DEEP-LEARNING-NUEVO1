# utils/qr_utils.py
import qrcode
import io

def generate_qr_image_bytes(text: str, box_size: int = 10, border: int = 4) -> bytes:
    """
    Genera un QR a partir de un texto o URL y devuelve los bytes de la imagen PNG.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=box_size,
        border=border,
    )
    qr.add_data(text)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    # Convertir a bytes
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    return img_byte_arr.getvalue()
