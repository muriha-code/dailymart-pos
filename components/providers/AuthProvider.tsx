'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { clientAuth, clientDb } from '@/lib/firebase/client';
import { AppUser } from '@/types/auth.types';
import { useTheme } from 'next-themes';
import { AnimatePresence } from 'framer-motion';
import SplashScreen from '@/components/common/SplashScreen';

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
      (error) => {
        console.warn('[Firestore] Real-time listener suppressed:', error.message);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Listener onAuthStateChanged untuk sinkronisasi otomatis status autentikasi & tema
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(clientAuth, async (fbUser) => {
      if (fbUser && fbUser.uid) {
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
      <AnimatePresence mode="wait">
        {isVerifying && !isLoginPage && <SplashScreen key="cyber-splash-screen" />}
      </AnimatePresence>
      {!isVerifying || isLoginPage ? children : null}
    </AuthContext.Provider>
  );
}

