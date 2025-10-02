# utils/interpreter.py
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Input

def compile_model(architecture_string: str, input_dim: int):
    """
    Recibe un string de arquitectura, ejemplo:
    "Dense(256, relu) -> Dense(128, relu) -> Dense(10, softmax)"
    y devuelve un modelo Keras compilado.
    """
    model = Sequential()
    model.add(Input(shape=(input_dim,)))

    layers = [layer.strip() for layer in architecture_string.split("->")]
    for layer_def in layers:
        if not layer_def.startswith("Dense"):
            raise ValueError(f"Tipo de capa no soportado: {layer_def}")

        # Extraer parámetros
        inner = layer_def[layer_def.find("(")+1:layer_def.find(")")]
        units_str, activation = [x.strip() for x in inner.split(",")]
        units = int(units_str)
        model.add(Dense(units, activation=activation))

    # Compilar con parámetros estándar
    model.compile(optimizer='adam', loss='categorical_crossentropy', metrics=['accuracy'])
    return model
