import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app);
const form = document.getElementById('quoteForm'), status = document.getElementById('quoteStatus');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;
  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  status.textContent = 'Submitting your request / Enviando solicitud...';
  try {
    if (!auth.currentUser) await signInAnonymously(auth);
    const val = (id) => document.getElementById(id).value.trim();
    const data = {
      name: val('name'), email: val('email'), phone: val('phone'),
      propertyType: val('type'), frequency: val('frequency'),
      sizeSqFt: val('size'), zip: val('zip'), preferredDate: val('date'),
      details: val('details'), status: 'new', source: 'website',
      createdAt: serverTimestamp()
    };
    await addDoc(collection(db, 'quoteRequests'), data);
    form.reset();
    status.textContent = 'Request received! We will contact you soon. / ¡Solicitud recibida! Te contactaremos pronto.';
  } catch (err) {
    console.error('FreshBorn quote submission:', err.code || err.message);
    status.textContent = 'Unable to submit right now. Please use our live chat. / No se pudo enviar. Utiliza el chat.';
  } finally { btn.disabled = false; }
});
