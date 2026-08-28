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
        // 3. Update Firestore Client SDK dengan fallback aman
        try {
          const userDocRef = doc(clientDb, 'users', activeUid);
          await updateDoc(userDocRef, {
            themePreference: newTheme,
            updatedAt: new Date().toISOString(),
          });
        } catch (dbErr: any) {
          console.warn('[Firestore Client] Update theme preference error (using fallback):', dbErr?.message || dbErr);
          if (dbErr?.code === 'permission-denied' || dbErr?.message?.includes('permission')) {
            setTheme('dark');
          }
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

  // Fetch session & synchronize user's theme preference from Firestore
  const fetchSessionAndSyncTheme = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const userData = json.data as AppUser;
          setUser(userData);

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
      } catch (fErr: any) {
        console.warn('[AuthProvider] Firestore theme fetch error (fallback to dark theme):', fErr?.message || fErr);
        if (fErr?.code === 'permission-denied' || fErr?.message?.includes('permission') || fErr?.message?.includes('insufficient')) {
          setTheme('dark');
        }
      }

      setUser((prev) =>
        prev || {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'User',
          role: 'ADMIN',
          isActive: true,
          themePreference: 'dark',
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
        const userData = snapshotData(userSnap);
        if (userData) setUser(userData);
      }
    } catch (err: any) {
      console.warn('[AuthProvider] refreshUserData error:', err?.message || err);
      if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
        setTheme('dark');
      }
    }
  }, [user?.uid, setTheme]);

  // Helper function to safely parse user snapshot data
  const snapshotData = (snap: any): AppUser | null => {
    return snap.exists() ? (snap.data() as AppUser) : null;
  };

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
      (error: any) => {
        console.warn('[Firestore] Real-time listener suppressed:', error.message);
        if (error?.code === 'permission-denied' || error?.message?.includes('permission') || error?.message?.includes('insufficient')) {
          // Set fallback theme ke 'dark' tanpa merusak status autentikasi user
          setTheme('dark');
        }
      }
    );

    return () => unsubscribe();
  }, [user?.uid, setTheme]);

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
        } catch (e: any) {
          console.warn('[onAuthStateChanged] Error fetching theme from Firestore:', e?.message || e);
          if (e?.code === 'permission-denied' || e?.message?.includes('permission') || e?.message?.includes('insufficient')) {
            setTheme('dark');
          }
        }
      }
    });

    return () => unsubscribe();
  }, [setTheme]);

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
