import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/admin/users/[id]
 * Memperbarui profil pengguna (displayName, role, isActive, phone)
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { displayName, role, isActive, phone } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID pengguna tidak valid.' },
        { status: 400 }
      );
    }

    // 1. Update profil di Firestore
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (phone !== undefined) updateData.phone = phone;

    await adminDb.collection('users').doc(id).update(updateData);

    // 2. Update Auth DisplayName jika ada
    if (displayName) {
      try {
        await adminAuth.updateUser(id, { displayName });
      } catch (authErr) {
        console.warn(`[Auth Update Warning] Gagal update Auth displayName untuk UID ${id}:`, authErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Data pengguna berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('[API /api/admin/users/[id] PUT Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memperbarui pengguna.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Reset kata sandi pengguna via Firebase Auth
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { password } = body;

    if (!id || !password) {
      return NextResponse.json(
        { success: false, message: 'ID pengguna dan kata sandi baru wajib diisi.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi minimal 6 karakter.' },
        { status: 400 }
      );
    }

    // Update password di Firebase Auth
    await adminAuth.updateUser(id, { password });

    return NextResponse.json({
      success: true,
      message: 'Kata sandi pengguna berhasil diperbarui.',
    });
  } catch (error: any) {
    console.error('[API /api/admin/users/[id] PATCH Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mereset kata sandi.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Menghapus pengguna dari Firebase Auth & Firestore dengan proteksi self-delete
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID pengguna tidak valid.' },
        { status: 400 }
      );
    }

    // Proteksi Self-Delete: Cek session cookie user saat ini
    const sessionCookie = req.cookies.get('session')?.value;
    if (sessionCookie) {
      try {
        const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
        if (decodedToken.uid === id) {
          return NextResponse.json(
            { success: false, message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!' },
            { status: 400 }
          );
        }
      } catch (e) {
        // Abaikan verifikasi jika sesi tidak aktif
      }
    }

    // 1. Hapus dari Firebase Auth
    try {
      await adminAuth.deleteUser(id);
    } catch (authErr: any) {
      console.warn(`[Auth Delete Warning] UID ${id} mungkin sudah terhapus di Auth:`, authErr?.message);
    }

    // 2. Hapus dokumen dari Firestore
    await adminDb.collection('users').doc(id).delete();

    return NextResponse.json({
      success: true,
      message: 'Pengguna berhasil dihapus dari sistem.',
    });
  } catch (error: any) {
    console.error('[API /api/admin/users/[id] DELETE Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menghapus pengguna.' },
      { status: 500 }
    );
  }
}
