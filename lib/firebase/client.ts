import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserSessionPersistence, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'dailymart-pos',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  if (!firebaseConfig.apiKey) {
    console.warn(
      '⚠️ [Firebase Client] NEXT_PUBLIC_FIREBASE_API_KEY tidak terdeteksi. Pastikan file .env.local sudah memuat konfigurasi berawalan NEXT_PUBLIC_ dan server sudah di-restart.'
    );
  }

  return initializeApp(firebaseConfig);
}

export const app: FirebaseApp = getFirebaseApp();
export const clientAuth: Auth = getAuth(app);
export const clientDb: Firestore = getFirestore(app);

// Enforce Session-Only persistence (Clears auth session on tab/browser close)
setPersistence(clientAuth, browserSessionPersistence).catch((err) => {
  console.error('Failed to set browserSessionPersistence for Firebase Auth:', err);
});