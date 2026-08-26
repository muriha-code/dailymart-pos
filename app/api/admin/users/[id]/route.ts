import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { v2 as cloudinary } from 'cloudinary';

// Cloudinary Configuration
cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    'dailymart-pos',
  api_key: process.env.CLOUDINARY_API_KEY || '123456789012345',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'secret',
  secure: true,
});

interface Params {
  params: Promise<{ id: string }>;
}

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

/**
 * PUT /api/admin/users/[id]
 * Memperbarui profil pengguna (displayName, role, isActive, phone, photoURL, photoPublicId)
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const isSuper = await verifySuperAdmin(req);
    if (!isSuper) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Super Admin yang diizinkan memperbarui data pengguna.' },
        { status: 403 }
      );
    }
    const { id } = await params;
    const body = await req.json();
    const { displayName, role, isActive, phone, photoURL, photoPublicId } = body;

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
    if (photoURL !== undefined) updateData.photoURL = photoURL;
    if (photoPublicId !== undefined) updateData.photoPublicId = photoPublicId;

    await adminDb.collection('users').doc(id).update(updateData);

    // 2. Update Auth DisplayName & PhotoURL jika ada
    const authUpdatePayload: { displayName?: string; photoURL?: string } = {};
    if (displayName) authUpdatePayload.displayName = displayName;
    if (photoURL !== undefined) authUpdatePayload.photoURL = photoURL;

    if (Object.keys(authUpdatePayload).length > 0) {
      try {
        await adminAuth.updateUser(id, authUpdatePayload);
      } catch (authErr) {
        console.warn(`[Auth Update Warning] Gagal update Auth profile untuk UID ${id}:`, authErr);
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
    const isSuper = await verifySuperAdmin(req);
    if (!isSuper) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Super Admin yang diizinkan mereset kata sandi.' },
        { status: 403 }
      );
    }

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
 * Menghapus pengguna dari Firebase Auth & Firestore dengan proteksi self-delete & auto-delete foto Cloudinary
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const isSuper = await verifySuperAdmin(req);
    if (!isSuper) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya Super Admin yang diizinkan menghapus pengguna.' },
        { status: 403 }
      );
    }

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

    // Fetch data user dari Firestore untuk dapatkan photoPublicId
    let photoPublicId = '';
    try {
      const docSnap = await adminDb.collection('users').doc(id).get();
      if (docSnap.exists) {
        const data = docSnap.data();
        photoPublicId = data?.photoPublicId || '';
      }
    } catch (_) {}

    // Hapus foto Cloudinary jika ada
    if (photoPublicId) {
      try {
        await cloudinary.uploader.destroy(photoPublicId, { invalidate: true });
      } catch (cloudErr: any) {
        console.warn(`[Cloudinary User Photo Delete Warning] ${photoPublicId}:`, cloudErr?.message || cloudErr);
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
