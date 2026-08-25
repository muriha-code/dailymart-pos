import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * PATCH /api/user/theme
 * Memperbarui preferensi tema pengguna (light / dark) di Firestore.
 */
export async function PATCH(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada sesi aktif. Silakan masuk kembali.' },
        { status: 401 }
      );
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;

    const body = await req.json();
    const { themePreference } = body;

    if (!themePreference || (themePreference !== 'light' && themePreference !== 'dark')) {
      return NextResponse.json(
        { success: false, message: 'themePreference harus bernilai "light" atau "dark"' },
        { status: 400 }
      );
    }

    // Perbarui dokumen user di Firestore
    await adminDb.collection('users').doc(uid).set(
      {
        themePreference,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Preferensi tema berhasil disimpan ke profil pengguna.',
      themePreference,
    });
  } catch (error: any) {
    console.error('[API /api/user/theme Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menyimpan preferensi tema' },
      { status: 500 }
    );
  }
}
