'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';

interface AuthContextType {
  isVerifying: boolean;
  markTabActive: () => void;
  clearTabActive: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isVerifying: true,
  markTabActive: () => {},
  clearTabActive: () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState<boolean>(true);

  const isLoginPage = pathname === '/login';

  const markTabActive = () => {
    try {
      sessionStorage.setItem('pos_tab_active', 'true');
    } catch (e) {
      console.warn('Failed to access sessionStorage:', e);
    }
  };

  const clearTabActive = () => {
    try {
      sessionStorage.removeItem('pos_tab_active');
    } catch (e) {
      console.warn('Failed to access sessionStorage:', e);
    }
  };

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
          // 1. Invalidate cookie di backend
          await fetch('/api/auth/logout', { method: 'POST' });
          // 2. Signout Firebase client
          await signOut(clientAuth);
        } catch (err) {
          console.error('[Strict Single-Tab Guard] Error clearing session:', err);
        } finally {
          clearTabActive();
          router.replace('/login');
        }
      };

      handleUnauthorizedTab();
    } else {
      // Tab valid dan aktif
      setIsVerifying(false);
    }
  }, [pathname, isLoginPage, router]);

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
    <AuthContext.Provider value={{ isVerifying, markTabActive, clearTabActive }}>
      {children}
    </AuthContext.Provider>
  );
}
