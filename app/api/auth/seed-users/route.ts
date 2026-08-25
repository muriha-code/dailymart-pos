import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { UserRole } from '@/types/auth.types';

const INITIAL_USERS = [
  {
    email: 'admin@dailymart.com',
    password: 'password123',
    displayName: 'Administrator Utama',
    role: 'ADMIN' as UserRole,
  },
  {
    email: 'cashier@dailymart.com',
    password: 'password123',
    displayName: 'Kasir Shift 1',
    role: 'CASHIER' as UserRole,
  },
  {
    email: 'warehouse@dailymart.com',
    password: 'password123',
    displayName: 'Staf Gudang Utama',
    role: 'WAREHOUSE' as UserRole,
  },
];

export async function POST(req: NextRequest) {
  try {
    const results = [];

    for (const userData of INITIAL_USERS) {
      let uid: string;

      try {
        // Cek apakah user sudah ada di Firebase Auth
        const existingUser = await adminAuth.getUserByEmail(userData.email);
        uid = existingUser.uid;
        // Update password jika sudah ada
        await adminAuth.updateUser(uid, {
          password: userData.password,
          displayName: userData.displayName,
        });
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          // Buat user baru jika belum ada
          const newUser = await adminAuth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: userData.displayName,
          });
          uid = newUser.uid;
        } else {
          throw err;
        }
      }

      // Simpan data profil ke Firestore collection `users`
      const now = new Date();
      await adminDb.collection('users').doc(uid).set(
        {
          uid,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          isActive: true,
          themePreference: 'light',
          updatedAt: now,
          createdAt: now,
        },
        { merge: true }
      );

      results.push({ uid, email: userData.email, role: userData.role });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Berhasil melakukan seeder user akun demo ke Firebase Auth & Firestore.',
        data: results,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API /api/auth/seed-users POST Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Gagal melakukan seed user.',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Kirim POST ke /api/auth/seed-users untuk membuat akun demo (Admin, Cashier, Warehouse).',
  });
}
