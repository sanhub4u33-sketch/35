import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBHlu5iaHQPI1b0g_MLZFfFE5vuWmDuWD0",
  authDomain: "shri-hanumant-library.firebaseapp.com",
  databaseURL: "https://shri-hanumant-library-default-rtdb.firebaseio.com",
  projectId: "shri-hanumant-library",
  storageBucket: "shri-hanumant-library.firebasestorage.app",
  messagingSenderId: "962284702454",
  appId: "1:962284702454:web:dee1487fe7f5688aaabad7",
  measurementId: "G-T4QW51HL4L"
};

const app = initializeApp(firebaseConfig);

// Use initializeAuth with IndexedDB persistence (primary) and localStorage (fallback)
// IndexedDB works better in PWA standalone mode
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence]
});

// Secondary app for creating new users without signing out the current user
const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
export const secondaryAuth = initializeAuth(secondaryApp, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence]
});

export const database = getDatabase(app);
export default app;
