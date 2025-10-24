// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Configuración directa de tu app Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBUiJ9u2GyPBovgoaS64r89E1tydCP5Na4",
  authDomain: "lunatrack-95199.firebaseapp.com",
  projectId: "lunatrack-95199",
  storageBucket: "lunatrack-95199.firebasestorage.app",
  messagingSenderId: "82970120947",
  appId: "1:82970120947:web:2d7b70d052816802c05d86",
  measurementId: "G-QCYKV5DXKD"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);


