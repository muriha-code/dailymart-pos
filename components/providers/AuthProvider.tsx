'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
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

  // Halaman /login HARUS selalu tampil dalam mode Light
  useEffect(() => {
    if (isLoginPage) {
      setTheme('light');
    }
  }, [isLoginPage, setTheme]);

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

  // Update Theme Preference (Local State & localStorage ONLY - No Firestore DB calls)
  const updateThemePreference = useCallback(
    async (newTheme: 'light' | 'dark') => {
      // 1. Terapkan ke Next-Themes secara instan
      setTheme(newTheme);

      // 2. Simpan preferensi ke localStorage
      try {
        localStorage.setItem('theme', newTheme);
      } catch (e) {
        console.warn('Failed saving theme to localStorage:', e);
      }

      // 3. Update state user lokal (in-memory)
      setUser((prev) => (prev ? { ...prev, themePreference: newTheme } : null));
    },
    [setTheme]
  );

  // Logout Handler (Reset theme ke light & bersihkan state)
  const logout = useCallback(async () => {
    try {
      setTheme('light');
      try {
        localStorage.removeItem('theme');
      } catch (e) {
        console.warn('Failed clearing theme in localStorage:', e);
      }

      clearTabActive();
      setUser(null);

      await fetch('/api/auth/logout', { method: 'POST' });
      await fetch('/api/auth/session', { method: 'DELETE' });
      await signOut(clientAuth);
    } catch (err) {
      console.error('[Logout Error]:', err);
    } finally {
      router.replace('/login');
    }
  }, [clearTabActive, router, setTheme]);

  // Fetch session & synchronize local theme
  const fetchSessionAndSyncTheme = useCallback(async () => {
    // Terapkan preferensi tema lokal dari localStorage jika ada
    try {
      const localTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (localTheme) {
        setTheme(localTheme);
      }
    } catch (e) {
      console.warn('Failed reading theme from localStorage:', e);
    }

    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const userData = json.data as AppUser;
          setUser(userData);
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
          return;
        }
      } catch (fErr: any) {
        console.warn('[AuthProvider] Firestore user fetch error:', fErr?.message || fErr);
      }

      setUser((prev) =>
        prev || {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'User',
          role: 'ADMIN',
          isActive: true,
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
        if (userData) setUser(userData);
      }
    } catch (err: any) {
      console.warn('[AuthProvider] refreshUserData error:', err?.message || err);
    }
  }, [user?.uid]);

  // Listener real-time onSnapshot untuk profil user
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
      (error: any) => {
        console.warn('[Firestore] Real-time listener suppressed:', error.message);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Listener onAuthStateChanged untuk sinkronisasi profil user
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(clientAuth, async (fbUser) => {
      if (fbUser && fbUser.uid) {
        try {
          const userDocRef = doc(clientDb, 'users', fbUser.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data() as AppUser;
            setUser(userData);
          }
        } catch (e: any) {
          console.warn('[onAuthStateChanged] Error fetching user profile:', e?.message || e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoginPage) {
      setIsVerifying(false);
      return;
    }

    const isTabActive = typeof window !== 'undefined' ? sessionStorage.getItem('pos_tab_active') : null;

    if (!isTabActive) {
      setIsVerifying(true);

      const handleUnauthorizedTab = async () => {
        try {
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
