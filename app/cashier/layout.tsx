"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { shiftService } from "@/services/shift.service";
import { ShiftValidationResult } from "@/types/shift.types";
import { BlockedShiftScreen } from "@/components/cashier/CashierShiftModal";

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();

  const [shiftValidation, setShiftValidation] = useState<ShiftValidationResult | null>(null);
  const [isCheckingShift, setIsCheckingShift] = useState<boolean>(true);

  const checkShiftStatus = useCallback(async () => {
    setIsCheckingShift(true);
    try {
      const result = await shiftService.checkShiftStatus();
      setShiftValidation(result);
    } catch (err: any) {
      console.warn("[Cashier Layout Guard] Gagal mengecek status shift kasir:", err);
    } finally {
      setIsCheckingShift(false);
    }
  }, []);

  useEffect(() => {
    checkShiftStatus();
  }, [checkShiftStatus]);

  const userRole = (user?.role || "CASHIER").toUpperCase();
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  // 1. Role ADMIN / SUPER_ADMIN -> Bypass layout lock secara penuh
  if (isAdmin) {
    return <>{children}</>;
  }

  // 2. Loading State saat verifikasi jadwal & shift kasir berlangsung
  if (isCheckingShift) {
    return (
      <div className="h-screen w-full flex items-center justify-center p-6 bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 font-sans">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] p-8 text-center space-y-3 max-w-sm w-full">
          <div className="w-10 h-10 mx-auto rounded-xl bg-[#6366F1] border-2 border-slate-900 text-white flex items-center justify-center font-black animate-spin">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="font-black text-sm uppercase tracking-wide text-slate-900 dark:text-slate-100">
            Verifikasi Sesi Shift Kasir
          </h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Memeriksa jadwal kerja & status shift aktif...
          </p>
        </div>
      </div>
    );
  }

  // 3. Validasi Shift: Kasir harus memiliki shift OPEN atau Memiliki Jadwal hari ini dalam rentang toleransi
  const isShiftValid =
    shiftValidation &&
    (shiftValidation.hasActiveShift ||
      (shiftValidation.hasScheduleToday && shiftValidation.isWithinShiftTolerance));

  // 4. Jika TIDAK memiliki Shift / Jadwal Valid -> Timpa area konten utama dengan BlockedShiftScreen
  if (!isShiftValid && shiftValidation) {
    return (
      <BlockedShiftScreen
        cashierName={user?.displayName || "Kasir"}
        validationResult={shiftValidation}
        onRefresh={checkShiftStatus}
        onLogout={() => logout && logout()}
      />
    );
  }

  // 5. Akses Diberikan -> Render konten halaman kasir ({children})
  return <>{children}</>;
}
