'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { clientAuth } from '@/lib/firebase/client';
import { UserRole } from '@/types/auth.types';

const ROLE_REDIRECT_MAP: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  CASHIER: '/cashier/transactions',
  WAREHOUSE: '/warehouse/stock-in',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Harap masukkan email dan kata sandi.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Client-side authentication via Firebase Auth
      const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
      const user = userCredential.user;

      // 2. Dapatkan ID Token
      const idToken = await user.getIdToken();

      // 3. Kirim POST ke API Session Handler
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      let result: any = {};
      try {
        result = await res.json();
      } catch (jsonErr) {
        throw new Error('Gagal membaca respon server sesi. Silakan coba lagi.');
      }

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Gagal membuat sesi login.');
      }

      // 4. Redirect otomatis ke dashboard sesuai role user
      const userRole: UserRole = result.user?.role || result.data?.role || 'CASHIER';
      const targetPath = ROLE_REDIRECT_MAP[userRole] || '/cashier/transactions';

      router.push(targetPath);
      router.refresh();
    } catch (err: any) {
      console.error('[Login Error]:', err);
      let errorMsg = 'Terjadi kesalahan saat masuk. Silakan coba lagi.';

      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMsg = 'Email atau kata sandi yang Anda masukkan salah.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Terlalu banyak percobaan masuk yang gagal. Silakan coba beberapa saat lagi.';
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#F59E0B] text-white shadow-lg shadow-amber-500/20 mb-3">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          DailyMart <span className="text-[#F59E0B]">POS</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sistem Point of Sale & Manajemen Ritel Terpadu
        </p>
      </div>

      {/* Login Card Container */}
      <div className="w-full sm:max-w-md bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-6 sm:p-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-6 text-center">
          Masuk ke Akun Anda
        </h2>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-amber-900">Autentikasi Gagal</p>
              <p className="mt-0.5 text-amber-800">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Alamat Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@dailymart.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:bg-white focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Kata Sandi
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:bg-white focus:border-transparent transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-white font-semibold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#F59E0B] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Memproses Sesi...</span>
              </>
            ) : (
              <span>Masuk Sekarang</span>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Assistant */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 text-center uppercase tracking-wider mb-3">
            Simulasi Akun Demo (Klik untuk autofill)
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@dailymart.com')}
              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 text-slate-700 font-medium transition-colors text-center"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('cashier@dailymart.com')}
              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 text-slate-700 font-medium transition-colors text-center"
            >
              🛒 Kasir
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('warehouse@dailymart.com')}
              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-800 text-slate-700 font-medium transition-colors text-center"
            >
              📦 Gudang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
