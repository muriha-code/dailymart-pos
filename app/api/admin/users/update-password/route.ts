import { adminAuth } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
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
