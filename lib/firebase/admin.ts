import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

const privateKey = rawPrivateKey
  ? rawPrivateKey.replace(/\\n/g, '\n').trim().replace(/^["']|["']$/g, '')
  : undefined;

let app: App;

if (getApps().length === 0) {
  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      '[Firebase Admin Error]: Missing environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY).',
      {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
      }
    );
  }

  try {
    app = initializeApp({
      credential: cert({
        projectId: projectId || undefined,
        clientEmail: clientEmail || undefined,
        privateKey: privateKey || undefined,
      }),
    });
  } catch (error) {
    console.error('[Firebase Admin initializeApp Error]:', error);
    app = getApps().length > 0 ? getApps()[0] : ({} as App);
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);