// app/static/darkmode.js
document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("toggle-darkmode-navbar");
    const darkmodeLink = document.getElementById("darkmode-css");

    if (!toggleBtn) return console.error("No se encontró el botón de darkmode!");
    if (!darkmodeLink) return console.error("No se encontró el link de darkmode!");

    // Restaurar preferencia guardada
    const savedMode = localStorage.getItem("darkmode");
    if (savedMode === "on") {
        darkmodeLink.disabled = false;
        toggleBtn.textContent = "🌞 Modo Claro";
    } else {
        darkmodeLink.disabled = true;
        toggleBtn.textContent = "🌙 Modo Oscuro";
    }

    // Alternar y guardar preferencia
    toggleBtn.addEventListener("click", () => {
        darkmodeLink.disabled = !darkmodeLink.disabled;
        const darkmodeActive = !darkmodeLink.disabled;
        toggleBtn.textContent = darkmodeActive ? "🌞 Modo Claro" : "🌙 Modo Oscuro";
        localStorage.setItem("darkmode", darkmodeActive ? "on" : "off");
        console.log("Darkmode activo:", darkmodeActive);
    });
});
