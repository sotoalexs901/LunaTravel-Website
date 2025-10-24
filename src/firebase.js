// Importa Firebase directamente desde el CDN (sin Node ni Vite)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Configuración usando las variables de entorno de Render
const firebaseConfig = {
  apiKey: window.FIREBASE_API_KEY || "TU_API_KEY",
  authDomain: window.FIREBASE_AUTH_DOMAIN || "TU_AUTH_DOMAIN",
  projectId: window.FIREBASE_PROJECT_ID || "TU_PROJECT_ID",
  storageBucket: window.FIREBASE_STORAGE_BUCKET || "TU_STORAGE_BUCKET",
  messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || "TU_MESSAGING_SENDER_ID",
  appId: window.FIREBASE_APP_ID || "TU_APP_ID",
  measurementId: window.FIREBASE_MEASUREMENT_ID || "TU_MEASUREMENT_ID"
};

// Inicializa Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Función para buscar equipaje
async function buscarEquipaje() {
  const orderInput = document.getElementById("orderNumber");
  const resultBox = document.getElementById("resultado");

  const orderId = orderInput.value.trim();

  if (!orderId) {
    resultBox.innerHTML = "<p style='color:red;'>Por favor ingresa un número de orden.</p>";
    return;
  }

  try {
    const docRef = doc(db, "equipaje", orderId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      resultBox.innerHTML = `
        <h3>Resultado de búsqueda</h3>
        <p><strong>Estado:</strong> ${data.estado}</p>
        <p><strong>Ubicación:</strong> ${data.ubicacion}</p>
        <p><strong>Última actualización:</strong> ${data.fecha}</p>
      `;
    } else {
      resultBox.innerHTML = "<p>No se encontró información para este código.</p>";
    }
  } catch (error) {
    console.error("Error al buscar:", error);
    resultBox.innerHTML = "<p style='color:red;'>Error al conectar con el servidor.</p>";
  }
}

// Expone la función al HTML
window.buscarEquipaje = buscarEquipaje;
