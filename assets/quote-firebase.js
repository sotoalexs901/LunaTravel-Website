import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const form = document.getElementById('quoteForm');
const status = document.getElementById('quoteStatus');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const button = form.querySelector('[type="submit"]');
  if (button) button.disabled = true;
  if (status) status.textContent = 'Submitting / Enviando...';

  try {
    // Public visitors use Firebase Anonymous Authentication.
    // Never replace this with public Firestore write permissions.
    if (!auth.currentUser) await signInAnonymously(auth);

    const val = (id) => document.getElementById(id)?.value?.trim() ?? '';
    const propertyMap = {
      'House': 'House',
      'Apartment': 'Apartment',
      'Apartment / Condo': 'Apartment',
      'Office': 'Office',
      'Office / Commercial': 'Office',
      'Other': 'Other'
    };
    const propertyType = propertyMap[val('type')];
    if (!propertyType) throw new Error('invalid-property-type');

    const data = {
      name: val('name'),
      email: val('email'),
      phone: val('phone'),
      propertyType,
      frequency: val('frequency'),
      sizeSqFt: val('size'),
      zip: val('zip'),
      preferredDate: val('date'),
      details: val('details'),
      status: 'new',
      source: 'website',
      createdAt: serverTimestamp()
    };

    await addDoc(collection(db, 'quoteRequests'), data);
    form.reset();
    if (status) status.textContent = 'Request received! / ¡Solicitud recibida!';
  } catch (error) {
    const code = error?.code || error?.message || 'unknown-error';
    console.error('FreshBorn quote submission failed:', code, error);
    // Temporary diagnostic message. Remove the error code from the public page after debugging.
    if (status) status.textContent = `Unable to submit / No se pudo enviar. Error: ${code}`;
  } finally {
    if (button) button.disabled = false;
  }
});
