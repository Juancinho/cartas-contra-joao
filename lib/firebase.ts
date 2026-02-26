import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Guard: don't initialize during server-side prerendering (no API key)
function getApp_(): FirebaseApp {
  if (!firebaseConfig.apiKey) {
    throw new Error("Firebase API key not found. Add NEXT_PUBLIC_FIREBASE_* to your environment variables.");
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getApp_());
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) _db = getFirestore(getApp_());
  return _db;
}

// Lazy getters — same API for existing imports
export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    return (getFirebaseAuth() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    return (getFirebaseDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
