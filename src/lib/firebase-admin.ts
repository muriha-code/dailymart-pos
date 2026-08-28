import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/^"(.*)"$/, '$1').replace(/\\n/g, '\n');
}

const app = getApps().length === 0
  ? initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
  : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
