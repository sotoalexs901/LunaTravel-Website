import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);
let records = [];
let signingIn = false;

function showError(prefix, error) {
  const code = error?.code || 'unknown';
  const message = error?.message || 'Unknown error';
  console.error(prefix, error);
  $('loginError').textContent = `${prefix} (${code}): ${message}`;
}

const cell = (row, value) => {
  const td = document.createElement('td');
  td.textContent = String(value ?? '');
  row.appendChild(td);
};
const formatDate = v => v?.toDate?.()?.toLocaleString() || '—';

function render() {
  const term = $('search').value.trim().toLowerCase();
  const found = records.filter(r => [r.name, r.email, r.phone, r.zip, r.propertyType]
    .some(v => String(v || '').toLowerCase().includes(term)));
  $('requestsBody').replaceChildren();
  for (const r of found) {
    const tr = document.createElement('tr');
    [formatDate(r.createdAt), r.name, r.phone, r.email, r.propertyType,
      r.zip, r.frequency, r.preferredDate, r.status, r.details].forEach(v => cell(tr, v));
    $('requestsBody').appendChild(tr);
  }
  $('total').textContent = records.length;
  $('newCount').textContent = records.filter(r => r.status === 'new').length;
  $('dashboardStatus').textContent = found.length
    ? `Showing ${found.length} requests (most recent 200).`
    : 'No matching requests.';
}

async function load() {
  $('dashboardStatus').textContent = 'Loading requests...';
  try {
    const snap = await getDocs(query(collection(db, 'quoteRequests'), orderBy('createdAt', 'desc'), limit(200)));
    records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  } catch (error) {
    console.error('Quote requests read failed', error);
    $('dashboardStatus').textContent = `Unable to load requests (${error.code || 'unknown'}): ${error.message}`;
  }
}

onAuthStateChanged(auth, async user => {
  if (!user || user.isAnonymous) {
    $('loginPanel').hidden = false;
    $('dashboard').hidden = true;
    return;
  }
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) throw new Error(`No users/${user.uid} profile found in Firestore`);
    const profile = snap.data();
    if (profile.role !== 'super_admin' || profile.status !== 'active') {
      throw new Error(`Profile is not authorized: role=${profile.role || '(missing)'}, status=${profile.status || '(missing)'}`);
    }
    $('loginError').textContent = '';
    $('loginPanel').hidden = true;
    $('dashboard').hidden = false;
    await load();
  } catch (error) {
    $('loginPanel').hidden = false;
    $('dashboard').hidden = true;
    showError('Admin authorization failed', error);
    // Do not silently sign out: preserve the diagnostic message and session for troubleshooting.
  }
});

$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (signingIn) return;
  signingIn = true;
  $('loginError').textContent = 'Signing in...';
  try {
    await signInWithEmailAndPassword(auth, $('adminEmail').value.trim(), $('adminPassword').value);
    $('loginError').textContent = 'Credentials accepted. Checking administrator access...';
  } catch (error) {
    showError('Firebase sign-in failed', error);
  } finally {
    signingIn = false;
  }
});

$('logout').onclick = () => signOut(auth);
$('refresh').onclick = load;
$('search').oninput = render;
