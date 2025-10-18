// trigger-deploy.js
document.addEventListener("DOMContentLoaded", function () {
  if (window.CMS) {
    console.log("✅ Netlify CMS detectado — activando deploy automático.");

    window.CMS.registerEventListener({
      name: "postSave",
      handler: async () => {
        try {
          const hookURL = "https://api.netlify.com/build_hooks/68f385ceb6df808073f90acd"; // tu URL real
          await fetch(hookURL, { method: "POST" });
          alert("✅ Cambios guardados. Netlify está publicando el sitio...");
        } catch (error) {
          console.error("Error al activar deploy automático:", error);
          alert("⚠️ No se pudo activar el deploy automático.");
        }
      },
    });
  }
});

