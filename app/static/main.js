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
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({text: val})
            })
            .then(res => res.blob())
            .then(blob => {
                qrImg.src = URL.createObjectURL(blob);
                qrImg.classList.add("show");
            });
        }, 200);
    });

    // -------------------------
    // Canvas MNIST interactivo
    // -------------------------
    const canvas = document.getElementById("canvas-mnist");
    const ctx = canvas.getContext("2d");
    const predText = document.getElementById("prediction-realtime");
    let drawing = false;

    // Configuración del canvas
    ctx.lineWidth = 15;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";

    // Funciones de dibujo
    function startDrawing(e) {
        drawing = true;
        ctx.beginPath();
        ctx.moveTo(e.offsetX || e.touches[0].clientX - canvas.getBoundingClientRect().left,
                   e.offsetY || e.touches[0].clientY - canvas.getBoundingClientRect().top);
    }

    function draw(e) {
        if (!drawing) return;
        const x = e.offsetX || e.touches[0].clientX - canvas.getBoundingClientRect().left;
        const y = e.offsetY || e.touches[0].clientY - canvas.getBoundingClientRect().top;
        ctx.lineTo(x, y);
        ctx.stroke();
        predictCanvas(); // predicción en tiempo real
    }

    function stopDrawing() {
        drawing = false;
        ctx.closePath();
    }

    // Eventos mouse/touch
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);

    canvas.addEventListener("touchstart", startDrawing);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", stopDrawing);

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
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({image: imgData})
        })
        .then(res => res.json())
        .then(data => {
            if (!data.error) {
                predText.textContent = `Predicción en tiempo real: ${data.pred} (Confianza: ${Math.round(data.confidence*100)}%)`;
            }
        })
        .catch(err => console.error(err));
    }
});
