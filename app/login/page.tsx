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
  const [showPassword, setShowPassword] = useState(false);
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

      // 3. Kirim POST ke API Auth Login Handler
      let res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        // Fallback ke /api/auth/session
        res = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
      }

      // Ambil teks mentah terlebih dahulu untuk menghindari crash parsing JSON
      const rawText = await res.text();
      let result: any = {};

      try {
        result = rawText ? JSON.parse(rawText) : {};
      } catch (jsonErr) {
        console.error('[Server Non-JSON Response]:', rawText);
        throw new Error(`Server mengembalikan respon tidak valid (${res.status}). Silakan periksa koneksi atau backend.`);
      }

      if (!res.ok || !result.success) {
        throw new Error(result.message || result.error || 'Gagal membuat sesi login.');
      }

      // 4. Tandai tab aktif untuk Strict Single-Tab Session Guard secara non-blocking
      setTimeout(() => {
        try {
          sessionStorage.setItem('pos_tab_active', 'true');
        } catch (sErr) {
          console.warn('Gagal menyimpan pos_tab_active ke sessionStorage:', sErr);
        }
      }, 0);

      // 5. Zero-Waterfall Navigation: Prefetch halaman tujuan secara instan
      const userRole: UserRole = result.user?.role || result.data?.role || 'CASHIER';
      const targetPath = result.redirectTo || ROLE_REDIRECT_MAP[userRole] || '/cashier/transactions';

      router.prefetch(targetPath);
      router.replace(targetPath);
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

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden selection:bg-slate-900 selection:text-white font-sans">
      
      {/* LEFT PANEL: VISUAL & BRANDING HERO */}
      <div className="hidden md:flex md:w-1/2 lg:w-7/12 relative overflow-hidden bg-slate-950 flex-col justify-between p-8 lg:p-12 text-white select-none">
        <img
          src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1600&auto=format&fit=crop"
          alt="DailyMart Retail POS System"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-900/40 to-slate-900/20 z-10" />

        <div className="relative z-20 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            D
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-tight">DailyMart</span>
              <span className="font-black text-lg text-amber-400">POS</span>
            </div>
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest block -mt-1">
              Industrial Retail System
            </span>
          </div>
        </div>

        <div className="relative z-20 space-y-3 max-w-lg">
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-extrabold uppercase tracking-widest text-amber-300">
            Smart Retail Management System
          </div>
          <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight">
            DailyMart Retail Management System
          </h2>
          <p className="text-xs lg:text-sm text-slate-300 leading-relaxed font-normal">
            Akurasi inventaris, kemudahan kasir, dan laporan keuangan terpadu dalam satu sistem.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: FORM AUTHENTICATION */}
      <div className="w-full md:w-1/2 lg:w-5/12 flex-1 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-12 bg-white relative">
        <div className="w-full max-w-sm space-y-6">
          
          <div className="md:hidden text-center mb-2">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 font-black text-xl shadow-xs flex items-center justify-center mb-3 mx-auto border border-slate-800">
              D
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900">
              DailyMart <span className="text-amber-600">POS</span>
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Sistem Point of Sale & Manajemen Ritel Terpadu
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Masuk ke Sistem
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Masukkan akun staf yang terdaftar untuk memulai sesi kerja.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5 animate-shake">
              <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="min-w-0">
                <p className="font-bold text-red-900">Autentikasi Gagal</p>
                <p className="mt-0.5 text-red-700 leading-snug">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@dailymart.com"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm bg-slate-50/50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.046 10.046 0 012.122-.063c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.692-4.692a3 3 0 00-4.243-4.243m4.243 4.243L3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <span>Masuk Sekarang</span>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}