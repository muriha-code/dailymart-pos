export type UserRole = 'ADMIN' | 'CASHIER' | 'WAREHOUSE';

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

