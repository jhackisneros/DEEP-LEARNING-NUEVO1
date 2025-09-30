document.addEventListener("DOMContentLoaded", () => {
    // -------------------------
    // Animación QR
    // -------------------------
    const qrBtn = document.getElementById("generate-qr-btn");
    const qrImg = document.getElementById("qr-img");
    const qrInput = document.getElementById("qr-text");

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

    // -------------------------
    // Canvas MNIST interactivo (tipo Paint)
    // -------------------------
    const canvas = document.getElementById("canvas-mnist");
    const ctx = canvas.getContext("2d");
    const predText = document.getElementById("prediction-realtime");
    let drawing = false;

    // Configuración del pincel
    ctx.lineWidth = 15;
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
        predictCanvas();
        e.preventDefault();
    }

    function stopDrawing() {
        if (!drawing) return;
        drawing = false;
        ctx.closePath();
    }

    // Eventos mouse
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    // Eventos touch (móvil)
    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", stopDrawing);
    canvas.addEventListener("touchcancel", stopDrawing);

    // Limpiar canvas
    document.getElementById("clear-canvas").addEventListener("click", () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        predText.textContent = "Predicción en tiempo real: -";
    });

    // -------------------------
    // Predicción en tiempo real
    // -------------------------
    function predictCanvas() {
        const imgData = canvas.toDataURL("image/png");
        fetch("/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: imgData })
        })
            .then(res => res.json())
            .then(data => {
                if (!data.error) {
                    predText.textContent = `Predicción en tiempo real: ${data.pred} (Confianza: ${Math.round(data.confidence * 100)}%)`;
                }
            })
            .catch(err => console.error(err));
    }
});
