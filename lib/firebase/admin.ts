import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * Format string Private Key Firebase secara robust.
 * Menangani karakter newline '\n', backslash ganda '\\n', dan tanda kutip pembungkus ("...").
 */
function formatPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return key
    .trim()
    .replace(/^["']|["']$/g, '') // Hapus tanda kutip di awal & akhir string
    .replace(/\\n/g, '\n');       // Ubah literal '\\n' menjadi karakter newline sesungguhnya
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

let app: App;

if (!getApps().length) {
  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      '[Firebase Admin Initialization Error]: Environmental variables missing or incomplete.',
      {
        hasProjectId: !!projectId,
        hasClientEmail: !!clientEmail,
        hasPrivateKey: !!privateKey,
      }
    );
  }

  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);