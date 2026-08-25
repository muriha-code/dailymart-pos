import { AppUser, UserRole } from '@/types/auth.types';

export interface CreateUserPayload {
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  photoURL?: string;
}

export interface UpdateUserPayload {
  displayName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
  photoURL?: string;
}

export const userManagementService = {
  /**
   * Mengambil daftar seluruh pengguna
   */
  async getUsers(): Promise<AppUser[]> {
    const res = await fetch('/api/admin/users', { cache: 'no-store' });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memuat data pengguna.');
    }

    return json.data || [];
  },

  /**
   * Membuat pengguna baru
   */
  async createUser(payload: CreateUserPayload): Promise<AppUser> {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal menambahkan pengguna baru.');
    }

    return json.data;
  },

  /**
   * Memperbarui profil pengguna (displayName, role, isActive, phone)
   */
  async updateUser(uid: string, payload: UpdateUserPayload): Promise<void> {
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memperbarui data pengguna.');
    }
  },

  /**
   * Reset kata sandi pengguna
   */
  async resetPassword(uid: string, password: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal mereset kata sandi pengguna.');
    }
  },

  /**
   * Menghapus pengguna dari Firebase Auth & Firestore
   */
  async deleteUser(uid: string): Promise<void> {
    const res = await fetch(`/api/admin/users/${uid}`, {
      method: 'DELETE',
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal menghapus pengguna.');
    }
  },
};
