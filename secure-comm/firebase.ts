// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBZ_CMC_dkvpD26fQB02No_83mBaOD2GrA",
  authDomain: "aura-comm.firebaseapp.com",
  databaseURL: "https://aura-comm-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aura-comm",
  storageBucket: "aura-comm.firebasestorage.app",
  messagingSenderId: "946099391290",
  appId: "1:946099391290:web:649273179aafdd7c185e03",
  measurementId: "G-2ZBY53P287"
};

// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Export the database so App.tsx can use it
export const db = getDatabase(app);