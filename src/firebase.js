// src/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ Intentar leer variables de entorno (Netlify / Vite)
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_API_KEY || "AIzaSyXXXXXXXXXXXX",
  authDomain: import.meta.env?.VITE_AUTH_DOMAIN || "lunatrack-95199.firebaseapp.com",
  projectId: import.meta.env?.VITE_PROJECT_ID || "lunatrack-95199",
  measurementId: import.meta.env?.VITE_MEASUREMENT_ID || ""
};

// 🔍 Mostrar en consola para debug
console.log("Firebase config usada:", firebaseConfig);

// ✅ Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

