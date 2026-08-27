import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AppUser, UserRole } from '@/types/auth.types';

// Duration: 5 days in milliseconds
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

const ROLE_REDIRECT_MAP: Record<string, string> = {
  SUPER_ADMIN: '/admin/users',
  ADMIN: '/admin/dashboard',
  CASHIER: '/cashier/transactions',
  WAREHOUSE: '/warehouse/stock-in',
  super_admin: '/admin/users',
  admin: '/admin/dashboard',
  cashier: '/cashier/transactions',
  warehouse: '/warehouse/stock-in',
};

/**
 * POST /api/auth/login
 * Endpoint teroptimasi untuk pembuatan sesi login cepat.
 * Memanfaatkan Firebase Custom Claims untuk bypass Firestore read pada login berikutnya.
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

    // 2. Baca role dan preferensi tema dari Firebase Firestore / Custom Claims
    let role: UserRole = (decodedToken.role || decodedToken.userRole) as UserRole;
    let displayName = decodedToken.name || email.split('@')[0] || 'User';
    let isActive = true;
    let themePreference: 'light' | 'dark' = 'light';

    try {
      const userDoc = await adminDb.collection('users').doc(uid).get();
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
        role = userData.role || role || 'CASHIER';
        displayName = userData.displayName || displayName;
        isActive = userData.isActive ?? true;
        themePreference = userData.themePreference || 'light';

        // Sematkan custom claim secara asinkron agar login berikutnya super cepat
        adminAuth.setCustomUserClaims(uid, { role, displayName, themePreference }).catch((claimErr) => {
          console.warn('[Custom Claims Async Error]:', claimErr);
        });
      } else {
        role = role || 'CASHIER';
      }
    } catch (dbErr) {
      console.warn('Gagal mengambil data user dari Firestore, menggunakan fallback default role:', dbErr);
      role = role || 'CASHIER';
    }

    // 3. Buat Session Cookie Firebase (Masa berlaku 5 hari)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: FIVE_DAYS_MS,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const redirectTo = ROLE_REDIRECT_MAP[role] || '/cashier/transactions';

    // 4. Siapkan NextResponse JSON dengan Cookie Store & Direct Redirect URL
    const response = NextResponse.json(
      {
        success: true,
        message: 'Sesi login berhasil diverifikasi dan dibuat',
        redirectTo,
        user: {
          uid,
          email,
          name: displayName,
          role,
          themePreference,
        },
        data: {
          uid,
          email,
          displayName,
          role,
          isActive,
          themePreference,
          photoURL: null,
        },
      },
      { status: 200 }
    );

    // Set Cookie HTTP-Only `session`
    response.cookies.set('session', sessionCookie, {
      httpOnly: true,
      secure: isProduction,
      path: '/',
      sameSite: 'lax',
    });

    // Set Cookie `user_role`
    response.cookies.set('user_role', role, {
      httpOnly: false,
      secure: isProduction,
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('[API /api/auth/login POST Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Gagal memproses sesi autentikasi login',
      },
      { status: 401 }
    );
  }
}
