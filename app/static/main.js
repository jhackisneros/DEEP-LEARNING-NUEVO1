// app/static/main.js
document.addEventListener("DOMContentLoaded", () => {
    // -------------------------
    // Animación QR
    // -------------------------
    const qrBtn = document.getElementById("generate-qr-btn");
    const qrImg = document.getElementById("qr-img");
    const qrInput = document.getElementById("qr-text");

    if (qrBtn) {
        qrBtn.addEventListener("click", () => {
            qrImg.classList.remove("show");
            setTimeout(() => {
                const val = qrInput.value || "https://tus-predicciones.com";
                fetch("/generate_qr", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: val })
                })
                    .then(res => res.blob())
                    .then(blob => {
                        qrImg.src = URL.createObjectURL(blob);
                        qrImg.classList.add("show");
                    });
            }, 200);
        });
    }

    // -------------------------
    // Canvas MNIST interactivo (tipo Paint)
    // -------------------------
    const canvas = document.getElementById("canvas-mnist");
    const predText = document.getElementById("prediction-realtime");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let drawing = false;

    // Configuración del pincel
    ctx.lineWidth = 20;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        if (e.touches) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: e.offsetX,
                y: e.offsetY
            };
        }
    }

    function startDrawing(e) {
        drawing = true;
        const { x, y } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        e.preventDefault();
    }

    function draw(e) {
        if (!drawing) return;
        const { x, y } = getCoords(e);
        ctx.lineTo(x, y);
        ctx.stroke();
        e.preventDefault();
    }

    function stopDrawing() {
        if (!drawing) return;
        drawing = false;
        ctx.closePath();
        // Solo predecir cuando el usuario deja de dibujar
        predictCanvas();
    }

    // Eventos mouse
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    // Eventos touch (móvil)
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing);
    canvas.addEventListener("touchcancel", stopDrawing);

    // Limpiar canvas
    document.getElementById("clear-canvas").addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        predText.textContent = "Predicción en tiempo real: -";
    });

    // -------------------------
    // Predicción en tiempo real (solo al terminar de dibujar)
    // -------------------------
    function predictCanvas() {
        try {
            // Canvas temporal para invertir colores
            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;

            tempCtx.drawImage(canvas, 0, 0);

            const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const dataPixels = imgData.data;

            let hasDrawing = false;
            for (let i = 0; i < dataPixels.length; i += 4) {
                if (dataPixels[i] !== 255 || dataPixels[i+1] !== 255 || dataPixels[i+2] !== 255) {
                    hasDrawing = true;
                }
                // Invertir colores
                dataPixels[i] = 255 - dataPixels[i];
                dataPixels[i + 1] = 255 - dataPixels[i + 1];
                dataPixels[i + 2] = 255 - dataPixels[i + 2];
            }

            if (!hasDrawing) return; // Si no hay dibujo, no predecir
            tempCtx.putImageData(imgData, 0, 0);

            const imgBase64 = tempCanvas.toDataURL("image/png");

            fetch("/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: imgBase64 })
            })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    predText.textContent = "Error en predicción";
                    return;
                }

                const combined = data.combined || {};
                const pred = combined.pred !== undefined ? combined.pred : "-";
                const conf = combined.confidence !== undefined ? Math.round(combined.confidence * 100) : "-";

                predText.textContent = `Predicción combinada: ${pred} (Confianza: ${conf}%)`;
            })
            .catch(err => {
                console.error("Error en predicción:", err);
                predText.textContent = "Error al procesar predicción";
            });

        } catch (err) {
            console.error("Error al procesar el canvas:", err);
            predText.textContent = "Error interno al procesar el canvas";
        }
    }
});
