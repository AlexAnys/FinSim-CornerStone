
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBwVP3fqVrDAHArLNNYSWHYVONHWusGWx8",
  authDomain: "finsim-d4594.firebaseapp.com",
  projectId: "finsim-d4594",
  storageBucket: "finsim-d4594.firebasestorage.app",
  messagingSenderId: "260998912702",
  appId: "1:260998912702:web:e148b5e5bf29b1ebcbdcef",
  measurementId: "G-W8QDB8KYJ4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
