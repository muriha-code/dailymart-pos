import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

async function verifySuperAdmin(req: NextRequest): Promise<boolean> {
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) return false;
  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    let role = (decodedToken.role || decodedToken.userRole || '') as string;
    if (!role) {
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      if (userDoc.exists) {
        role = userDoc.data()?.role || '';
      }
    }
    const r = role.toUpperCase();
    return r === 'SUPER_ADMIN';
  } catch (err) {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const isSuper = await verifySuperAdmin(req);
    if (!isSuper) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Super Admin yang diizinkan memperbarui password pengguna.', error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { targetUid, newPassword } = await req.json();

    if (!targetUid || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Password minimal 6 karakter.', error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Update password pengguna via Firebase Admin Auth
    await adminAuth.updateUser(targetUid, { password: newPassword });

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diperbarui',
    });
  } catch (error: any) {
    console.error('[API /api/admin/users/update-password Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memperbarui password.', error: error?.message },
      { status: 500 }
    );
  }
}
