// app/static/darkmode.js
document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("toggle-darkmode-navbar");
    const darkmodeLink = document.getElementById("darkmode-css");

    if (!toggleBtn) return console.error("No se encontró el botón de darkmode!");
    if (!darkmodeLink) return console.error("No se encontró el link de darkmode!");

    // Cargar estado del localStorage
    const darkmodeActive = localStorage.getItem("darkmode") === "true";
    darkmodeLink.disabled = !darkmodeActive;
    toggleBtn.textContent = darkmodeActive ? "🌞 Modo Claro" : "🌙 Modo Oscuro";

    // Evento para alternar
    toggleBtn.addEventListener("click", () => {
        darkmodeLink.disabled = !darkmodeLink.disabled;
        const isActive = !darkmodeLink.disabled;
        toggleBtn.textContent = isActive ? "🌞 Modo Claro" : "🌙 Modo Oscuro";
        localStorage.setItem("darkmode", isActive);
    });
});
