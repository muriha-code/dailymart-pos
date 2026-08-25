'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { clientAuth, clientDb } from '@/lib/firebase/client';
import { AppUser } from '@/types/auth.types';
import { useTheme } from 'next-themes';

interface AuthContextType {
  user: AppUser | null;
  setUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  isVerifying: boolean;
  markTabActive: () => void;
  clearTabActive: () => void;
  updateThemePreference: (newTheme: 'light' | 'dark') => Promise<void>;
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  isVerifying: true,
  markTabActive: () => {},
  clearTabActive: () => {},
  updateThemePreference: async () => {},
  refreshUserData: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();

  const [user, setUser] = useState<AppUser | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);

  const isLoginPage = pathname === '/login';

  const markTabActive = useCallback(() => {
    try {
      sessionStorage.setItem('pos_tab_active', 'true');
    } catch (e) {
      console.warn('Failed to access sessionStorage:', e);
    }
  }, []);

  const clearTabActive = useCallback(() => {
    try {
      sessionStorage.removeItem('pos_tab_active');
    } catch (e) {
      console.warn('Failed to access sessionStorage:', e);
    }
  }, []);

  // Update Theme Preference in Firestore and Next-Themes
  const updateThemePreference = useCallback(
    async (newTheme: 'light' | 'dark') => {
      // 1. Terapkan ke Next-Themes secara instan
      setTheme(newTheme);

      // 2. Update state user lokal
      setUser((prev) => (prev ? { ...prev, themePreference: newTheme } : null));

      const activeUid = user?.uid || clientAuth.currentUser?.uid;

      if (activeUid) {
        // 3. Update Firestore Client SDK
        try {
          const userDocRef = doc(clientDb, 'users', activeUid);
          await updateDoc(userDocRef, {
            themePreference: newTheme,
            updatedAt: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('[Firestore Client] Update theme preference fallback to API:', dbErr);
        }

        // 4. Update via API Route (Server-side Firestore update)
        try {
          await fetch('/api/user/theme', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ themePreference: newTheme }),
          });
        } catch (apiErr) {
          console.warn('[API /api/user/theme] Failed syncing theme to server:', apiErr);
        }
      }
    },
    [user?.uid, setTheme]
  );

  // Logout Handler
  const logout = useCallback(async () => {
    try {
      // 1. Reset theme ke 'light' agar user berikutnya tidak mewarisi mode user sebelumnya
      setTheme('light');
      try {
        localStorage.removeItem('theme');
      } catch (e) {
        console.warn('Failed clearing theme in localStorage:', e);
      }

      clearTabActive();
      setUser(null);

      // 2. Invalidate cookies & Firebase session
      await fetch('/api/auth/logout', { method: 'POST' });
      await fetch('/api/auth/session', { method: 'DELETE' });
      await signOut(clientAuth);
    } catch (err) {
      console.error('[Logout Error]:', err);
    } finally {
      router.replace('/login');
    }
  }, [clearTabActive, router, setTheme]);

  // Fetch session & synchronize user's theme preference from Firestore
  const fetchSessionAndSyncTheme = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const userData = json.data as AppUser;
          setUser(userData);

          // Terapkan preferensi tema user dari Firestore (default: 'light')
          const userTheme = userData.themePreference || 'light';
          setTheme(userTheme);
          return;
        }
      }
    } catch (err) {
      console.warn('Failed fetching session in AuthProvider:', err);
    }

    // Fallback if session API is not yet ready
    const currentUser = clientAuth.currentUser;
    if (currentUser) {
      try {
        const userDocRef = doc(clientDb, 'users', currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userData = userSnap.data() as AppUser;
          setUser(userData);
          setTheme(userData.themePreference || 'light');
          return;
        }
      } catch (fErr) {
        console.warn('Failed fetching user doc from Firestore:', fErr);
      }

      setUser((prev) =>
        prev || {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'User',
          role: 'ADMIN',
          isActive: true,
          themePreference: 'light',
        }
      );
    }
  }, [setTheme]);

  // Explicit refresh user profile data from Firestore
  const refreshUserData = useCallback(async () => {
    const activeUid = user?.uid || clientAuth.currentUser?.uid;
    if (!activeUid) return;
    try {
      const userDocRef = doc(clientDb, 'users', activeUid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const userData = userSnap.data() as AppUser;
        setUser(userData);
      }
    } catch (err) {
      console.warn('[AuthProvider] refreshUserData error:', err);
    }
  }, [user?.uid]);

  // Listener real-time onSnapshot untuk dokumen Firestore users/{activeUid}
  useEffect(() => {
    const activeUid = user?.uid || clientAuth.currentUser?.uid;
    if (!activeUid) return;

    const userDocRef = doc(clientDb, 'users', activeUid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data() as AppUser;
          setUser(userData);
        }
      },
      (err) => {
        console.warn('[AuthProvider] Real-time onSnapshot listener error:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Listener onAuthStateChanged untuk sinkronisasi otomatis status autentikasi & tema
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(clientAuth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(clientDb, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data() as AppUser;
            setUser(userData);
            const userTheme = userData.themePreference || 'light';
            setTheme(userTheme);
          }
        } catch (e) {
          console.warn('[onAuthStateChanged] Error fetching theme from Firestore:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [setTheme]);

  useEffect(() => {
    // Rute login tidak perlu verifikasi penanda tab
    if (isLoginPage) {
      setIsVerifying(false);
      return;
    }

    // Pengecekan Strict Single-Tab Session Guard
    const isTabActive = typeof window !== 'undefined' ? sessionStorage.getItem('pos_tab_active') : null;

    if (!isTabActive) {
      // Tab tidak valid (misal: tab baru dibuka setelah tab lama ditutup tanpa logout)
      setIsVerifying(true);

      const handleUnauthorizedTab = async () => {
        try {
          // Reset tema ke default saat sesi unauthorized
          setTheme('light');
          await fetch('/api/auth/logout', { method: 'POST' });
          await signOut(clientAuth);
        } catch (err) {
          console.error('[Strict Single-Tab Guard] Error clearing session:', err);
        } finally {
          clearTabActive();
          setUser(null);
          router.replace('/login');
        }
      };

      handleUnauthorizedTab();
    } else {
      // Tab valid dan aktif -> Muat sesi dan preferensi tema Firestore
      setIsVerifying(false);
      fetchSessionAndSyncTheme();
    }
  }, [pathname, isLoginPage, router, clearTabActive, fetchSessionAndSyncTheme, setTheme]);

  // Tampilkan loading screen minimalis (Cegah FOUC / Flash of Unauthenticated Content)
  if (isVerifying && !isLoginPage) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/20 animate-pulse">
            D
          </div>
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-semibold text-slate-200">
              Memverifikasi Sesi Keamanan Tab...
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xs">
            Memastikan integritas sesi Single-Tab DailyMart POS
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isVerifying,
        markTabActive,
        clearTabActive,
        updateThemePreference,
        refreshUserData,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

