export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'CASHIER'
  | 'WAREHOUSE'
  | 'super_admin'
  | 'admin'
  | 'cashier'
  | 'warehouse';

export function isSuperAdmin(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return normalized === 'SUPER_ADMIN';
}

export function isAdminOrSuperAdmin(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return normalized === 'SUPER_ADMIN' || normalized === 'ADMIN';
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
  photoURL?: string;
  photoPublicId?: string;
  themePreference?: 'light' | 'dark';
  createdAt?: string | Date;
}

export interface AuthSession {
  user: AppUser;
  token: string;
}

