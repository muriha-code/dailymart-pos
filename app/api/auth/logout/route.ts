import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Menghapus seluruh session cookies (session, session_token, __session, token, user_role)
 */
export async function POST() {
  try {
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logout berhasil. Cookie sesi telah dibersihkan.',
      },
      { status: 200 }
    );

    const cookiesToClear = ['session', 'session_token', '__session', 'token', 'user_role'];

    cookiesToClear.forEach((cookieName) => {
      response.cookies.set(cookieName, '', {
        maxAge: 0,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
    });

    return response;
  } catch (error: any) {
    console.error('[API /api/auth/logout POST Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Gagal membersihkan cookie sesi.',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/logout
 * Alias support untuk metode DELETE.
 */
export async function DELETE() {
  return POST();
}
