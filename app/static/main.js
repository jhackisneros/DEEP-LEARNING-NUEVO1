document.addEventListener("DOMContentLoaded", () => {
    // -------------------------
    // Animación QR Manual
    // -------------------------
    const qrBtn = document.getElementById("generate-qr-btn");
    const qrImgManual = document.getElementById("qr-img");
    const qrInput = document.getElementById("qr-text");

    if (qrBtn) {
        qrBtn.addEventListener("click", () => {
            qrImgManual.classList.remove("show");
            setTimeout(() => {
                const val = qrInput.value || "https://tus-predicciones.com";
                fetch("/generate_qr", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: val })
                })
                .then(res => res.blob())
                .then(blob => {
                    qrImgManual.src = URL.createObjectURL(blob);
                    qrImgManual.classList.add("show");
                });
            }, 200);
        });
    }

    // -------------------------
    // Canvas MNIST interactivo
    // -------------------------
    const canvas = document.getElementById("canvas-mnist");
    const predText = document.getElementById("prediction-realtime");
    const qrContainer = document.getElementById("qr-container");
    const qrImg = document.getElementById("qr-prediction-img");

    if (canvas) {
        const ctx = canvas.getContext("2d");
        let drawing = false;

        ctx.lineWidth = 20;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#000";

        function getCoords(e) {
            const rect = canvas.getBoundingClientRect();
            if (e.touches) {
                return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
            } else {
                return { x: e.offsetX, y: e.offsetY };
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
            predictCanvas();
        }

        // Eventos mouse
        canvas.addEventListener("mousedown", startDrawing);
        canvas.addEventListener("mousemove", draw);
        canvas.addEventListener("mouseup", stopDrawing);
        canvas.addEventListener("mouseleave", stopDrawing);

        // Eventos touch
        canvas.addEventListener("touchstart", startDrawing, { passive: false });
        canvas.addEventListener("touchmove", draw, { passive: false });
        canvas.addEventListener("touchend", stopDrawing);
        canvas.addEventListener("touchcancel", stopDrawing);

        // Limpiar canvas
        document.getElementById("clear-canvas").addEventListener("click", () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            predText.textContent = "Predicción en tiempo real: -";
            qrContainer.style.display = "none";
        });

        // -------------------------
        // Predicción + QR automático
        // -------------------------
        function predictCanvas() {
            try {
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
                    dataPixels[i] = 255 - dataPixels[i];
                    dataPixels[i + 1] = 255 - dataPixels[i + 1];
                    dataPixels[i + 2] = 255 - dataPixels[i + 2];
                }

                if (!hasDrawing) return;
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
                        predText.textContent = "Error al procesar predicción";
                        return;
                    }

                    const mlp = data.predictions.mlp || {};
                    const cnn = data.predictions.cnn || {};

                    const mlpPred = mlp.pred ?? "-";
                    const mlpConf = mlp.confidence !== undefined ? Math.round(mlp.confidence * 100) : "-";
                    const cnnPred = cnn.pred ?? "-";
                    const cnnConf = cnn.confidence !== undefined ? Math.round(cnn.confidence * 100) : "-";

                    predText.textContent = `MLP: ${mlpPred} (${mlpConf}%), CNN: ${cnnPred} (${cnnConf}%)`;

                    // Mostrar QR con predicción
                    qrContainer.style.display = "block";
                    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=MLP:${mlpPred}(${mlpConf}%),CNN:${cnnPred}(${cnnConf}%)`;
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
    }

    // -------------------------
    // Predicción por archivos
    // -------------------------
    const fileInput = document.getElementById("file-input");
    const predictFilesBtn = document.getElementById("predict-files-btn");
    const fileResults = document.getElementById("file-results");

    if (predictFilesBtn) {
        predictFilesBtn.addEventListener("click", () => {
            const files = fileInput.files;
            if (!files.length) return alert("Selecciona al menos un archivo");

            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append("files", files[i]);
            }

            fetch("/predict_batch", { method: "POST", body: formData })
            .then(res => res.json())
            .then(results => {
                fileResults.innerHTML = "";
                results.forEach(r => {
                    const li = document.createElement("li");
                    if (r.error) {
                        li.textContent = `${r.filename || "Archivo"}: Error -> ${r.error}`;
                    } else {
                        const mlpPred = r.pred_mlp ?? "-";
                        const mlpConf = r.conf_mlp !== undefined ? Math.round(r.conf_mlp*100) : "-";
                        const cnnPred = r.pred_cnn ?? "-";
                        const cnnConf = r.conf_cnn !== undefined ? Math.round(r.conf_cnn*100) : "-";
                        li.textContent = `${r.filename}: MLP ${mlpPred} (${mlpConf}%), CNN ${cnnPred} (${cnnConf}%)`;
                    }
                    fileResults.appendChild(li);
                });
            })
            .catch(err => {
                console.error(err);
                alert("Error al predecir archivos");
            });
        });
    }
});
