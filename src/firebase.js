// ===========================
// Luna Travel - Firebase Setup
// ===========================

// Importa Firebase desde el CDN oficial (no usa Vite ni Node)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// 🔹 Configuración de Firebase para LunaTrack
const firebaseConfig = {
  apiKey: "AIzaSyBUiJ9u2GyPBovgoaS64r89E1tydCP5Na4",
  authDomain: "lunatrack-95199.firebaseapp.com",
  projectId: "lunatrack-95199",
  storageBucket: "lunatrack-95199.firebasestorage.app",
  messagingSenderId: "82970120947",
  appId: "1:82970120947:web:2d7b70d052816802c05d86",
  measurementId: "G-QCYKV5DXKD"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("✅ Firebase inicializado correctamente");

// ==================================
// Función para buscar equipaje
// ==================================
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

// Exponer la función al HTML
window.buscarEquipaje = buscarEquipaje;

