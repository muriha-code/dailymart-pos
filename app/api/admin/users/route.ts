import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { AppUser, UserRole } from '@/types/auth.types';

/**
 * GET /api/admin/users
 * Mengambil seluruh daftar pengguna dari Firestore
 */
export async function GET() {
  try {
    const snapshot = await adminDb.collection('users').get();
    const users: AppUser[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        uid: doc.id,
        email: data.email || '',
        displayName: data.displayName || 'User',
        role: (data.role as UserRole) || 'CASHIER',
        isActive: data.isActive ?? true,
        phone: data.phone || '',
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : undefined,
      });
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    console.error('[API /api/admin/users GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mengambil data pengguna.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Membuat pengguna baru di Firebase Auth & Firestore
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { displayName, email, password, role, phone } = body;

    if (!displayName || !email || !password || !role) {
      return NextResponse.json(
        { success: false, message: 'Nama, Email, Kata Sandi, dan Role wajib diisi.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi minimal 6 karakter.' },
        { status: 400 }
      );
    }

    // 1. Buat user di Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
    });

    // 2. Simpan profil user di Firestore
    const newUser: AppUser = {
      uid: userRecord.uid,
      displayName,
      email,
      role: role as UserRole,
      isActive: true,
      phone: phone || '',
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection('users').doc(userRecord.uid).set(newUser);

    return NextResponse.json({
      success: true,
      message: 'Pengguna baru berhasil ditambahkan.',
      data: newUser,
    });
  } catch (error: any) {
    console.error('[API /api/admin/users POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal membuat pengguna baru.' },
      { status: 500 }
    );
  }
}
