import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
export const auth = getAuth(app);
export const database = getDatabase(app);
export default app;
