// app/charts.js

document.addEventListener("DOMContentLoaded", () => {
    // --- Gráfica de precisión y pérdida ---
    const ctxLoss = document.getElementById("loss-chart").getContext("2d");
    const ctxAcc = document.getElementById("accuracy-chart").getContext("2d");

    let lossChart = new Chart(ctxLoss, {
        type: 'line',
        data: {
            labels: [], // epochs
            datasets: [{
                label: 'Loss',
                data: [],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });

    let accChart = new Chart(ctxAcc, {
        type: 'line',
        data: {
            labels: [], // epochs
            datasets: [{
                label: 'Accuracy',
                data: [],
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: { y: { min: 0, max: 1 } }
        }
    });

    // Función para actualizar los datos dinámicamente
    async function updateCharts() {
        const res = await fetch("/history?limit=50"); // ejemplo: usar historial de predicciones
        const data = await res.json();
        if (!data.length) return;

        // Extraer precisión por predicción (ejemplo simple)
        const labels = data.map((d, i) => i+1);
        const accData = data.map(d => d.confidence);
        const lossData = data.map(d => 1 - d.confidence);

        accChart.data.labels = labels;
        accChart.data.datasets[0].data = accData;
        accChart.update();

        lossChart.data.labels = labels;
        lossChart.data.datasets[0].data = lossData;
        lossChart.update();
    }

    updateCharts();
    setInterval(updateCharts, 5000); // refrescar cada 5s
});
