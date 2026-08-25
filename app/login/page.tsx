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
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-slate-100 dark:bg-[#0F172A] overflow-hidden selection:bg-slate-900 selection:text-white font-sans transition-colors duration-200">
      
      {/* LEFT PANEL: VISUAL & BRANDING HERO (NEO-BRUTALISM VECTOR ISOMETRIC RETAIL) */}
      <div className="hidden md:flex md:w-1/2 lg:w-7/12 bg-[#EEF2FF] dark:bg-slate-950 relative overflow-hidden flex-col justify-between p-8 lg:p-12 border-r-3 border-slate-900 dark:border-slate-100 select-none transition-colors">
        {/* Pattern Overlay: Dot Matrix */}
        <div className="absolute inset-0 bg-[radial-gradient(#6366F1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        {/* Top Header Brand Logo Badge */}
        <div className="bg-[#FFB800] text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] uppercase tracking-wider inline-block w-fit mb-6 relative z-10">
          DAILYMART POS
        </div>

        {/* Center Vector Illustration Area (Clean In-Card Badges & Proportionate) */}
        <div className="bg-white dark:bg-slate-900 border-3 border-slate-900 dark:border-slate-100 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] my-auto relative overflow-hidden flex flex-col justify-between items-center z-10 w-full min-h-[340px] transition-colors">
          {/* Background Grid Pattern inside Container */}
          <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:12px_12px] opacity-30 pointer-events-none" />
          
          {/* Top In-Card Header Bar */}
          <div className="flex items-center justify-between w-full relative z-20 mb-2">
            <span className="text-[#6366F1] dark:text-indigo-400 font-mono font-black text-[10px] select-none tracking-wider uppercase">
              POS.v2 // CORE RETAIL
            </span>
            {/* In-Card Status Header */}
            <div className="bg-[#E8F5E9] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-black text-[10px] px-2.5 py-1 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>SYSTEM ONLINE V2.4</span>
            </div>
          </div>

          {/* Neo-Brutalist Isometric Retail Vector Graphic Composition */}
          <div className="relative w-full h-56 flex items-center justify-center py-2 z-10">
            <svg viewBox="0 0 420 250" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full max-h-[240px]">
              {/* Decorative Geometric Accents */}
              <rect x="15" y="15" width="26" height="26" rx="6" fill="#FFB800" stroke="#0F172A" strokeWidth="2.5" />
              <path d="M23 23L33 33M33 23L23 33" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />
              
              <rect x="375" y="180" width="30" height="30" rx="8" fill="#EC4899" stroke="#0F172A" strokeWidth="2.5" />
              <circle cx="390" cy="195" r="5" fill="#FFF" stroke="#0F172A" strokeWidth="2" />

              {/* Floor Base */}
              <rect x="25" y="175" width="370" height="60" rx="14" fill="#EEF2FF" stroke="#0F172A" strokeWidth="3.5" />
              <path d="M35 200H385" stroke="#94A3B8" strokeWidth="2" strokeDasharray="6 6" />

              {/* POS Machine / Terminal */}
              <g id="pos-terminal">
                <rect x="235" y="130" width="80" height="50" rx="8" fill="#1E293B" stroke="#0F172A" strokeWidth="3.5" />
                <rect x="210" y="55" width="130" height="85" rx="10" fill="#6366F1" stroke="#0F172A" strokeWidth="3.5" />
                <rect x="220" y="65" width="110" height="65" rx="6" fill="#EEF2FF" />
                
                <rect x="228" y="73" width="56" height="10" rx="3" fill="#6366F1" />
                <rect x="228" y="87" width="40" height="7" rx="2" fill="#10B981" />
                <rect x="228" y="98" width="48" height="7" rx="2" fill="#FFB800" />
                <rect x="228" y="109" width="30" height="7" rx="2" fill="#EC4899" />

                <rect x="292" y="93" width="32" height="24" rx="5" fill="#FFB800" stroke="#0F172A" strokeWidth="2.5" />
                <circle cx="308" cy="105" r="5" fill="#0F172A" />

                <rect x="250" y="160" width="50" height="30" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2.5" />
                <line x1="258" y1="169" x2="292" y2="169" stroke="#64748B" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="258" y1="177" x2="284" y2="177" stroke="#64748B" strokeWidth="2" strokeDasharray="3 3" />
              </g>

              {/* Minimarket Shelf & Products */}
              <g id="retail-shelf">
                <rect x="50" y="40" width="130" height="140" rx="12" fill="#FFF" stroke="#0F172A" strokeWidth="3.5" />
                <line x1="50" y1="87" x2="180" y2="87" stroke="#0F172A" strokeWidth="3.5" />
                <line x1="50" y1="133" x2="180" y2="133" stroke="#0F172A" strokeWidth="3.5" />
                
                <rect x="64" y="51" width="26" height="28" rx="5" fill="#FFB800" stroke="#0F172A" strokeWidth="2.5" />
                <rect x="98" y="48" width="30" height="31" rx="5" fill="#EC4899" stroke="#0F172A" strokeWidth="2.5" />
                <rect x="136" y="53" width="26" height="26" rx="5" fill="#10B981" stroke="#0F172A" strokeWidth="2.5" />
                
                <rect x="66" y="96" width="32" height="30" rx="5" fill="#3B82F6" stroke="#0F172A" strokeWidth="2.5" />
                <rect x="106" y="99" width="24" height="27" rx="5" fill="#FFB800" stroke="#0F172A" strokeWidth="2.5" />
                <rect x="138" y="95" width="28" height="31" rx="5" fill="#8B5CF6" stroke="#0F172A" strokeWidth="2.5" />

                <rect x="64" y="142" width="28" height="28" rx="5" fill="#10B981" stroke="#0F172A" strokeWidth="2.5" />
                <rect x="100" y="142" width="36" height="28" rx="5" fill="#6366F1" stroke="#0F172A" strokeWidth="2.5" />
                <rect x="144" y="145" width="24" height="25" rx="5" fill="#F43F5E" stroke="#0F172A" strokeWidth="2.5" />
              </g>

              {/* Shopping Basket */}
              <g id="shopping-basket">
                <path d="M155 165H210L204 200H161L155 165Z" fill="#FFB800" stroke="#0F172A" strokeWidth="3.5" />
                <path d="M167 165V151C167 145 173 141 182.5 141C192 141 198 145 198 151V165" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="173" cy="160" r="7" fill="#EC4899" stroke="#0F172A" strokeWidth="2" />
                <circle cx="192" cy="160" r="6" fill="#10B981" stroke="#0F172A" strokeWidth="2" />
              </g>

              {/* Floating Barcode Scanner */}
              <g id="barcode-scanner" className="animate-bounce" style={{ animationDuration: '3.5s' }}>
                <rect x="330" y="25" width="54" height="50" rx="12" fill="#10B981" stroke="#0F172A" strokeWidth="3.5" />
                <path d="M344 39V61M351 39V61M358 39V61M365 39V61M370 39V61" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="335" y1="50" x2="379" y2="50" stroke="#F43F5E" strokeWidth="3" />
              </g>

              {/* Decorative Star */}
              <path d="M200 30L203 39L212 42L203 45L200 54L197 45L188 42L197 39L200 30Z" fill="#FFB800" stroke="#0F172A" strokeWidth="2" />
            </svg>
          </div>

          {/* In-Card Feature Metric Bar (Bawah Dalam Kartu) */}
          <div className="flex items-center justify-between gap-2 pt-3 mt-4 border-t-2 border-slate-900/10 dark:border-slate-100/10 w-full relative z-20">
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-900 dark:border-slate-100 font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase">
              [ SECURE SESSION ]
            </span>
            <span className="bg-[#FEF3C7] dark:bg-amber-950/60 text-[#B45309] dark:text-amber-300 border border-slate-900 dark:border-slate-100 font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase">
              [ AUTHENTICATED ACCESS ]
            </span>
          </div>
        </div>

        {/* Bottom Typography Block */}
        <div className="relative z-10 space-y-1 mt-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#6366F1] dark:text-indigo-400 mb-1 block">
            SMART RETAIL MANAGEMENT SYSTEM
          </span>
          <h2 className="text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-tight mb-2">
            DailyMart Retail System
          </h2>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
            Akurasi inventaris real-time, kecepatan transaksi kasir, dan laporan manajemen ritel terpadu.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: FORM AUTHENTICATION (NEO-BRUTALISM OVERHAUL) */}
      <div className="w-full md:w-1/2 lg:w-5/12 flex-1 flex flex-col justify-center items-center p-6 sm:p-8 lg:p-12 bg-slate-50 dark:bg-[#0F172A] relative transition-colors">
        <div className="bg-white dark:bg-slate-900 border-3 border-slate-900 dark:border-slate-100 rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] max-w-md w-full transition-colors">
          
          {/* Mobile Header Branding */}
          <div className="md:hidden text-center mb-6 pb-4 border-b-2 border-slate-900 dark:border-slate-100">
            <div className="bg-[#FFB800] text-slate-950 font-black text-xs px-3.5 py-1.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] uppercase tracking-wider inline-block mb-2">
              DAILYMART POS
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-50">
              DailyMart <span className="text-[#6366F1] dark:text-indigo-400">POS</span>
            </h1>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
              Sistem Point of Sale & Manajemen Ritel Terpadu
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Masuk ke Sistem
            </h2>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 mt-1">
              Masukkan akun staf yang terdaftar untuk memulai sesi kerja.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/60 border-2 border-slate-900 dark:border-slate-100 text-red-900 dark:text-red-300 text-xs font-bold flex items-start gap-2.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] animate-shake">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="min-w-0">
                <p className="font-black text-red-900 dark:text-red-200">Autentikasi Gagal</p>
                <p className="mt-0.5 text-red-700 dark:text-red-300 leading-snug font-medium">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 block">
                Alamat Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@dailymart.com"
                className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] w-full transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 block">
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
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-4 py-3 pr-11 text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] w-full transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a10.046 10.046 0 012.122-.063c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m-4.692-4.692a3 3 0 00-4.243-4.243m4.243 4.243L3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
              className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-sm py-3.5 px-6 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all w-full mt-2 uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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