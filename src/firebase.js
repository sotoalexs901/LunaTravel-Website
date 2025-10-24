import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBUiJ9u2GyPBovgoaS64r89E1tydCP5Na4",
  authDomain: "lunatrack-95199.firebaseapp.com",
  projectId: "lunatrack-95199",
  storageBucket: "lunatrack-95199.firebasestorage.app",
  messagingSenderId: "82970120947",
  appId: "1:82970120947:web:2d7b70d052816802c05d86",
  measurementId: "G-QCYKV5DXKD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.buscarEquipaje = async function () {
  const orderNumber = document.getElementById("orderNumber").value.trim();
  const resultDiv = document.getElementById("result");

  if (!orderNumber) {
    resultDiv.innerHTML = `<p style="color:red;">Por favor, ingresa un número de orden.</p>`;
    return;
  }

  try {
    const docRef = doc(db, "equipaje", orderNumber); // 👈 Debe coincidir con el nombre de tu colección
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      resultDiv.innerHTML = `
        <div style="background:#f8f9fa;padding:1rem;border-radius:8px;">
          <h3>Resultado del rastreo:</h3>
          <p><strong>Estado:</strong> ${data.estado}</p>
          <p><strong>Ubicación:</strong> ${data.ubicacion}</p>
          <p><strong>Última actualización:</strong> ${data.fecha}</p>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `<p>No se encontró información para ese número de orden.</p>`;
    }
  } catch (error) {
    console.error("Firestore error ->", error);
    resultDiv.innerHTML = `<p style="color:red;">Error conectando con la base de datos: ${error.message}</p>`;
  }
};


