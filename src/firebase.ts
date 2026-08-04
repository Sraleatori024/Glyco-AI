import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import config from "../firebase-applet-config.json";

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || config.apiKey,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || config.projectId,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || config.appId
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Use custom firestore database ID only if non-empty string provided in env or config
const customDbId = (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || config.firestoreDatabaseId;
export const db = (customDbId && customDbId.trim() !== "" && customDbId !== "(default)")
  ? getFirestore(app, customDbId)
  : getFirestore(app);

export default app;
