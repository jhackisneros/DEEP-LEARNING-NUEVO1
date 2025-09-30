// app/static/main.js
document.addEventListener("DOMContentLoaded", () => {

    // --- Canvas MNIST ---
    const canvas = document.getElementById("canvas-mnist");
    const ctx = canvas.getContext("2d");

    // Inicializar canvas negro
    function clearCanvas() {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
    }
    clearCanvas();

    ctx.strokeStyle = "white"; // color del pincel
    ctx.lineWidth = 15;
    ctx.lineCap = "round";

    let drawing = false;

    canvas.addEventListener("mousedown", () => drawing = true);
    canvas.addEventListener("mouseup", () => drawing = false);
    canvas.addEventListener("mouseout", () => drawing = false);

    canvas.addEventListener("mousemove", (e) => {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y); // solo un punto si no se mueve
        ctx.stroke();
    });

    document.getElementById("clear-canvas").addEventListener("click", clearCanvas);

    function getCanvasData() {
        return canvas.toDataURL("image/png");
    }

    // --- Subida de imágenes ---
    const fileInput = document.getElementById("file-input");
    const predictBtn = document.getElementById("predict-files-btn");
    const resultsList = document.getElementById("file-results");

    predictBtn.addEventListener("click", async () => {
        const files = fileInput.files;
        if (!files.length) return alert("Selecciona archivos primero");

        const formData = new FormData();
        for (let f of files) formData.append("files", f);

        try {
            const res = await fetch("/predict_batch", { method: "POST", body: formData });
            const data = await res.json();
            resultsList.innerHTML = "";
            data.forEach(d => {
                const li = document.createElement("li");
                if (d.error) li.textContent = `Error (${d.filename}): ${d.error}`;
                else li.textContent = `${d.filename}: Predicción ${d.pred} (Confianza ${(d.confidence*100).toFixed(2)}%)`;
                resultsList.appendChild(li);
            });
        } catch (err) {
            alert("Error al predecir archivos: " + err.message);
        }
    });

    // --- Generar QR ---
    const qrBtn = document.getElementById("generate-qr-btn");
    const qrText = document.getElementById("qr-text");
    const qrImg = document.getElementById("qr-img");

    qrBtn.addEventListener("click", async () => {
        const text = qrText.value.trim();
        if (!text) return alert("Ingresa texto o URL");
        try {
            const res = await fetch("/generate_qr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text })
            });
            const blob = await res.blob();
            qrImg.src = URL.createObjectURL(blob);
        } catch (err) {
            alert("Error al generar QR: " + err.message);
        }
    });
});
