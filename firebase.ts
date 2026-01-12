import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDWrZeJtkzxMIGUpNOEf7LLta5FA5GQ82Q",
  authDomain: "faithconnect-1aa1f.firebaseapp.com",
  projectId: "faithconnect-1aa1f",
  storageBucket: "faithconnect-1aa1f.firebasestorage.app",
  messagingSenderId: "564710310102",
  appId: "1:564710310102:web:e8ef43faa8c4a6963d8977"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
