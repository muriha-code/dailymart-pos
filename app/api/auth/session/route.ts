import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AppUser, UserRole } from '@/types/auth.types';

// Duration: 5 days in milliseconds & seconds
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const FIVE_DAYS_SEC = 5 * 24 * 60 * 60;

/**
 * POST /api/auth/session
 * Menerima idToken dari client, memverifikasi token, mengecek/menyiapkan data user di Firestore,
 * lalu membuat HTTP-only session cookie (5 hari) dan cookie user_role.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { success: false, message: 'Firebase ID Token (idToken) wajib disertakan' },
        { status: 400 }
      );
    }

    // 1. Verifikasi ID Token melalui Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    // 2. Ambil data role dan profil pengguna dari Firestore (koleksi users)
    let role: UserRole = 'CASHIER';
    let displayName = decodedToken.name || email.split('@')[0] || 'User';
    let isActive = true;

    try {
      const userDocRef = adminDb.collection('users').doc(uid);
      const userDoc = await userDocRef.get();

      if (userDoc.exists) {
        const userData = userDoc.data() as AppUser;
        if (userData.isActive === false) {
          return NextResponse.json(
            {
              success: false,
              message: 'Akun Anda telah dinonaktifkan. Silakan hubungi Administrator.',
            },
            { status: 403 }
          );
        }
        role = userData.role || role;
        displayName = userData.displayName || displayName;
        isActive = userData.isActive ?? true;
      }
    } catch (dbErr) {
      console.warn('Gagal mengambil data user dari Firestore, menggunakan fallback default role:', dbErr);
    }

    // 3. Buat Session Cookie Firebase (Masa berlaku 5 hari)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: FIVE_DAYS_MS,
    });

    const isProduction = process.env.NODE_ENV === 'production';

    // 4. Siapkan NextResponse JSON dengan Cookie Store
    const response = NextResponse.json(
      {
        success: true,
        message: 'Sesi login berhasil diverifikasi dan dibuat',
        user: {
          uid,
          email,
          name: displayName,
          role,
        },
        data: {
          uid,
          email,
          displayName,
          role,
          isActive,
          photoURL: null,
        },
      },
      { status: 200 }
    );

    // Set Cookie HTTP-Only `session`
    response.cookies.set('session', sessionCookie, {
      maxAge: FIVE_DAYS_SEC,
      httpOnly: true,
      secure: isProduction,
      path: '/',
      sameSite: 'lax',
    });

    // Set Cookie `user_role` (untuk Middleware & RBAC proxy)
    response.cookies.set('user_role', role, {
      maxAge: FIVE_DAYS_SEC,
      httpOnly: false,
      secure: isProduction,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('[API /api/auth/session POST Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Gagal memproses sesi autentikasi',
      },
      { status: 401 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * Menghapus cookie session dan user_role (Logout).
 */
export async function DELETE() {
  try {
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logout berhasil',
      },
      { status: 200 }
    );

    // Hapus cookie session dan user_role
    response.cookies.set('session', '', {
      maxAge: 0,
      path: '/',
    });
    response.cookies.set('user_role', '', {
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('[API /api/auth/session DELETE Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Gagal melakukan logout sesi.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/session
 * Mengembalikan informasi user aktif berdasarkan cookie session.
 */
export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada sesi aktif' },
        { status: 401 }
      );
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    let displayName = decodedClaims.name || decodedClaims.email?.split('@')[0] || 'User';
    let role: UserRole = 'CASHIER';
    let isActive = true;

    try {
      const userDoc = await adminDb.collection('users').doc(decodedClaims.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data() as AppUser;
        if (userData.isActive === false) {
          return NextResponse.json(
            { success: false, message: 'Akun dinonaktifkan' },
            { status: 403 }
          );
        }
        displayName = userData.displayName || displayName;
        role = userData.role || role;
        isActive = userData.isActive ?? true;
      }
    } catch (e) {
      console.warn('Gagal mengambil data user dari Firestore pada GET session:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        displayName,
        role,
        isActive,
        photoURL: null,
      },
      user: {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        name: displayName,
        role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Sesi tidak valid atau telah kedaluwarsa' },
      { status: 401 }
    );
  }
}
