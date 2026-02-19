import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDXyj4UM3T5vQPyDko9riB3YxZZQI5C-Q8",
  authDomain: "wisebray-library.firebaseapp.com",
  databaseURL: "https://wisebray-library-default-rtdb.firebaseio.com",
  projectId: "wisebray-library",
  storageBucket: "wisebray-library.firebasestorage.app",
  messagingSenderId: "952083057499",
  appId: "1:952083057499:web:1f861d390352a2f834687e",
  measurementId: "G-GQTK3LPDXQ"
};

const app = initializeApp(firebaseConfig);

// In PWA standalone mode, indexedDB can sometimes be blocked or fail.
// Use browserLocalPersistence as primary fallback to prevent white screen.
const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

export const auth = initializeAuth(app, {
  persistence: isPWA
    ? [browserLocalPersistence, indexedDBLocalPersistence]
    : [indexedDBLocalPersistence, browserLocalPersistence]
});

const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
export const secondaryAuth = initializeAuth(secondaryApp, {
  persistence: isPWA
    ? [browserLocalPersistence, indexedDBLocalPersistence]
    : [indexedDBLocalPersistence, browserLocalPersistence]
});

export const firestore = getFirestore(app);
export const database = getDatabase(app);
export default app;
