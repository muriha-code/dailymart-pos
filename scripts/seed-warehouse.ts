import { adminAuth, adminDb } from '../lib/firebase/admin';
import { UserRole } from '../types/auth.types';

interface WarehouseUserSeed {
  displayName: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  themePreference: 'light' | 'dark';
}

const WAREHOUSE_USERS: WarehouseUserSeed[] = [
  {
    displayName: 'Guntur Pambudi',
    email: 'guntur.dailymart@gmail.com',
    password: 'DMGuntur#Gudang',
    phone: '081234567890',
    role: 'WAREHOUSE',
    isActive: true,
    themePreference: 'light',
  },
  {
    displayName: 'Hana Susanti',
    email: 'hana.dailymart@gmail.com',
    password: 'DMHana#Gudang',
    phone: '081234567891',
    role: 'WAREHOUSE',
    isActive: true,
    themePreference: 'light',
  },
  {
    displayName: 'Indah Lestari',
    email: 'indah.dailymart@gmail.com',
    password: 'DMIndah#Gudang',
    phone: '081234567892',
    role: 'WAREHOUSE',
    isActive: true,
    themePreference: 'light',
  },
  {
    displayName: 'Johan Arifin',
    email: 'johan.dailymart@gmail.com',
    password: 'DMJohan#Gudang',
    phone: '081234567893',
    role: 'WAREHOUSE',
    isActive: true,
    themePreference: 'light',
  },
  {
    displayName: 'Kartika Sari',
    email: 'kartika.dailymart@gmail.com',
    password: 'DMKartika#Gudang',
    phone: '081234567894',
    role: 'WAREHOUSE',
    isActive: true,
    themePreference: 'light',
  },
  {
    displayName: 'Lukman Hakim',
    email: 'lukman.dailymart@gmail.com',
    password: 'DMLukman#Gudang',
    phone: '081234567895',
    role: 'WAREHOUSE',
    isActive: true,
    themePreference: 'light',
  },
];

async function seedWarehouseUsers() {
  console.log('🚀 Memulai seeding akun Staff Gudang...');
  const results = [];

  for (const user of WAREHOUSE_USERS) {
    try {
      let uid: string;

      // Cek apakah user sudah ada di Firebase Auth
      try {
        const existingUser = await adminAuth.getUserByEmail(user.email);
        uid = existingUser.uid;
        console.log(`ℹ️ User ${user.email} sudah ada di Auth (UID: ${uid}). Updating...`);
        await adminAuth.updateUser(uid, {
          displayName: user.displayName,
          password: user.password,
        });
      } catch (_) {
        // Buat user baru di Firebase Auth jika belum ada
        const userRecord = await adminAuth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
        });
        uid = userRecord.uid;
        console.log(`✅ Berhasil membuat user Auth: ${user.email} (UID: ${uid})`);
      }

      // Simpan/update profil lengkap ke Firestore users/{uid} sesuai skema AppUser
      await adminDb.collection('users').doc(uid).set(
        {
          uid,
          displayName: user.displayName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          photoURL: null,
          photoPublicId: null,
          themePreference: user.themePreference,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      results.push({ email: user.email, uid, status: 'Success' });
    } catch (err: any) {
      console.error(`❌ Gagal membuat user ${user.email}:`, err?.message || err);
    }
  }

  console.log(`🎉 Selesai! Berhasil memproses ${results.length} akun Staff Gudang.`);
}

seedWarehouseUsers();