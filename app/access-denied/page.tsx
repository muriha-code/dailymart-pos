"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";

function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reason = searchParams.get("reason");

  const isNetworkRestricted = reason === "network_restricted";

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem("pos_tab_active");
      await fetch("/api/auth/logout", { method: "POST" });
      await fetch("/api/auth/session", { method: "DELETE" });
      await signOut(clientAuth);
    } catch (e) {
      console.warn("Logout error on Access Denied page:", e);
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-[#0F172A] flex items-center justify-center p-4 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-100 rounded-2xl p-6 sm:p-8 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] space-y-6">
        
        {/* Header Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-rose-500 text-white rounded-2xl border-3 border-slate-900 dark:border-slate-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Title & Message */}
        <div className="text-center space-y-2">
          <span className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full border border-rose-400 font-mono">
            {isNetworkRestricted ? "SECURITY ALARM: UNAUTHORIZED IP" : "ACCESS DENIED"}
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">
            {isNetworkRestricted ? "Akses Jaringan Dibatasi" : "Akses Ditolak"}
          </h1>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
            {isNetworkRestricted
              ? "Perangkat atau koneksi Wi-Fi Anda saat ini tidak terdaftar pada daftar IP terotorisasi toko. Sesuai kebijakan jaringan DailyMart POS, akses pengguna dibatasi hanya dari lokasi jaringan terpercaya."
              : "Anda tidak memiliki izin yang cukup untuk mengakses halaman atau sumber daya ini."}
          </p>
        </div>

        {/* Notice Info Box */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-900 dark:border-slate-700 rounded-xl p-3.5 space-y-2 text-xs font-semibold">
          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
            <span className="font-bold">Status Perlindungan:</span>
            <span className="bg-emerald-500 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] uppercase font-mono">
              Aktif (Enforced)
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
            <span className="font-bold">Sebab Penolakan:</span>
            <span className="font-mono text-[11px] text-rose-600 dark:text-rose-400 font-bold">
              {reason || "unauthorized_role"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
            *Hubungi <strong className="text-slate-900 dark:text-slate-200">Super Admin</strong> jika Anda berada di lokasi resmi toko untuk mendaftarkan IP Wi-Fi ini ke dalam Whitelist.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="w-full bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs py-3 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Coba Muat Ulang Halaman</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs py-3 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Keluar / Kelola Akun</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen bg-slate-100 dark:bg-[#0F172A] flex items-center justify-center p-4">
        <div className="text-xs font-black text-slate-500">Memuat halaman penolakan akses...</div>
      </div>
    }>
      <AccessDeniedContent />
    </Suspense>
  );
}
