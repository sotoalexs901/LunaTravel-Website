// trigger-deploy.js
document.addEventListener("DOMContentLoaded", function () {
  if (window.CMS) {
    console.log("✅ Netlify CMS detectado — activando deploy automático con notificaciones.");

    // Crear notificación visual
    const statusBox = document.createElement("div");
    statusBox.style.position = "fixed";
    statusBox.style.top = "15px";
    statusBox.style.right = "15px";
    statusBox.style.background = "#0a0a0a";
    statusBox.style.color = "#fff";
    statusBox.style.padding = "10px 15px";
    statusBox.style.borderRadius = "8px";
    statusBox.style.fontSize = "14px";
    statusBox.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
    statusBox.style.zIndex = "9999";
    statusBox.style.display = "none";
    document.body.appendChild(statusBox);

    function showStatus(text, color = "#2196f3") {
      statusBox.style.display = "block";
      statusBox.style.background = color;
      statusBox.textContent = text;
      setTimeout(() => (statusBox.style.display = "none"), 8000);
    }

    window.CMS.registerEventListener({
      name: "postSave",
      handler: async () => {
        try {
          const hookURL = "https://api.netlify.com/build_hooks/68f385ceb6df808073f90acd"; // tu hook real
          showStatus("🟡 Publicando cambios...", "#f9a825");
          const res = await fetch(hookURL, { method: "POST" });

          if (res.ok) {
            showStatus("🟢 Sitio actualizado correctamente en Netlify ✅", "#43a047");
          } else {
            showStatus("🔴 Error al actualizar el sitio ❌", "#e53935");
          }
        } catch (error) {
          console.error("Error al activar deploy automático:", error);
          showStatus("⚠️ No se pudo activar el deploy automático", "#e53935");
        }
      },
    });
  }
});
