import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AppUser, UserRole } from '@/types/auth.types';

// Duration: 5 days in milliseconds
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const FIVE_DAYS_SEC = 5 * 24 * 60 * 60;

/**
 * POST /api/auth/session
 * Menerima idToken dari client, memverifikasi token, mengecek data user di Firestore,
 * lalu membuat HTTP-only session cookie (5 hari) dan cookie user_role.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { success: false, message: 'idToken wajib dikirim' },
        { status: 400 }
      );
    }

    // 1. Verifikasi ID Token via Admin Auth
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';

    // 2. Fetch data user dari koleksi Firestore `users` berdasarkan `uid`
    const userDocRef = adminDb.collection('users').doc(uid);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          message: 'Akun Anda belum terdaftar dalam sistem DailyMart POS.',
        },
        { status: 403 }
      );
    }

    const userData = userDoc.data() as AppUser;

    // Validasi status isActive
    if (userData.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          message: 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.',
        },
        { status: 403 }
      );
    }

    const role: UserRole = userData.role || 'CASHIER';
    const displayName = userData.displayName || decodedToken.name || email.split('@')[0] || 'User';

    // 3. Buat Session Cookie via Firebase Admin SDK
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: FIVE_DAYS_MS,
    });

    const isProduction = process.env.NODE_ENV === 'production';

    // 4. Siapkan NextResponse dengan cookie
    const response = NextResponse.json(
      {
        success: true,
        data: {
          uid,
          email,
          displayName,
          role,
          isActive: userData.isActive ?? true,
        },
      },
      { status: 200 }
    );

    // Set Cookie `session`
    response.cookies.set('session', sessionCookie, {
      maxAge: FIVE_DAYS_SEC,
      httpOnly: true,
      secure: isProduction,
      path: '/',
      sameSite: 'lax',
    });

    // Set Cookie `user_role` (untuk dibaca oleh Next.js Middleware)
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
        message: error?.message || 'Gagal memproses sesi autentikasi.',
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
 * Mengembalikan informasi user aktif berdasarkan cookie session (jika valid).
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
    const userDoc = await adminDb.collection('users').doc(decodedClaims.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    const userData = userDoc.data() as AppUser;
    if (userData.isActive === false) {
      return NextResponse.json(
        { success: false, message: 'Akun dinonaktifkan' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        displayName: userData.displayName,
        role: userData.role,
        isActive: userData.isActive,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Sesi tidak valid atau telah kedaluwarsa' },
      { status: 401 }
    );
  }
}
