import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "my-private-pad.firebaseapp.com",
  projectId: "my-private-pad",
  storageBucket: "my-private-pad.firebasestorage.app",
  messagingSenderId: "667463087312",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);