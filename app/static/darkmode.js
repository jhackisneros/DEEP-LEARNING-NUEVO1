// app/static/darkmode.js
document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("toggle-darkmode-navbar");
    const darkmodeLink = document.getElementById("darkmode-css");

    if (!toggleBtn) return console.error("No se encontró el botón de darkmode!");
    if (!darkmodeLink) return console.error("No se encontró el link de darkmode!");

    toggleBtn.addEventListener("click", () => {
        darkmodeLink.disabled = !darkmodeLink.disabled;
        toggleBtn.textContent = darkmodeLink.disabled ? "🌙 Modo Oscuro" : "🌞 Modo Claro";
        console.log("Darkmode activo:", !darkmodeLink.disabled);
    });
});
