"use client";

import React, { useState, useMemo, useEffect } from "react";
import { CashierShift, ShiftValidationResult } from "@/types/shift.types";
import { ShiftType } from "@/types/schedule.types";

const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

// ==========================================
// 1. MODAL OPEN SHIFT (CLOCK IN)
// ==========================================
interface OpenShiftModalProps {
  isOpen: boolean;
  cashierName: string;
  todaySchedule?: {
    date: string;
    shiftType: ShiftType;
    startTime: string;
    endTime: string;
    notes?: string;
  } | null;
  lastCompletedShift?: {
    actualCash: number;
    closedAt: string;
    userName: string;
    shiftType: ShiftType;
  } | null;
  onOpenShift: (startingCash: number, shiftType: ShiftType) => Promise<void>;
  onLogout: () => void;
}

export function OpenShiftModal({
  isOpen,
  cashierName,
  todaySchedule,
  lastCompletedShift,
  onOpenShift,
  onLogout,
}: OpenShiftModalProps) {
  const [startingCashInput, setStartingCashInput] = useState<string>("100000");
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftType>(
    todaySchedule?.shiftType || "SHIFT_PAGI"
  );
  const [useCarryOverCash, setUseCarryOverCash] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (todaySchedule?.shiftType) {
      setSelectedShiftType(todaySchedule.shiftType);
    }
  }, [todaySchedule]);

  const handleToggleCarryOver = (checked: boolean) => {
    setUseCarryOverCash(checked);
    if (checked && lastCompletedShift?.actualCash !== undefined) {
      setStartingCashInput(lastCompletedShift.actualCash.toString());
    }
  };

  const numericCash = useMemo(() => {
    const clean = startingCashInput.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  }, [startingCashInput]);

  const quickOptions = [50000, 100000, 200000, 300000, 500000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericCash < 0) return;
    setIsSubmitting(true);
    try {
      await onOpenShift(numericCash, selectedShiftType);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-md overflow-hidden flex flex-col transition-colors">
        {/* Header */}
        <div className="px-6 py-4 bg-[#6366F1] text-white border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-[#6366F1] border-2 border-slate-900 flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">Buka Shift Kasir</h3>
              <p className="text-[11px] font-bold text-indigo-100">Clock In & Pengaturan Modal Awal</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-white/20 text-white font-mono font-bold text-[10px] border border-white/30">
            {todaySchedule?.date || new Date().toLocaleDateString("id-ID")}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Jadwal Info Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-500 dark:text-slate-400">Kasir Bertugas:</span>
              <span className="font-black text-slate-900 dark:text-slate-100">{cashierName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-500 dark:text-slate-400">Jadwal Shift:</span>
              <span className="font-black font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                {selectedShiftType === "SHIFT_PAGI" ? "PAGI (07:00 - 15:00)" : "SORE (15:00 - 23:00)"}
              </span>
            </div>
            {todaySchedule?.notes && (
              <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded border border-amber-200 dark:border-amber-800">
                📌 Catatan Admin: {todaySchedule.notes}
              </div>
            )}
          </div>

          {/* Opsi Carry Over Cash (Serah Terima Modal Kas Kasir Sebelumnya) */}
          {lastCompletedShift && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border-2 border-slate-900 dark:border-slate-100 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-900 dark:text-slate-100 min-w-0">
                <input
                  type="checkbox"
                  checked={useCarryOverCash}
                  onChange={(e) => handleToggleCarryOver(e.target.checked)}
                  className="w-4 h-4 text-[#6366F1] rounded focus:ring-0 border-2 border-slate-900 shrink-0 cursor-pointer"
                />
                <div className="min-w-0">
                  <span className="font-black text-slate-900 dark:text-slate-100 block truncate">
                    Gunakan Sisa Kas Kasir Sebelumnya
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block truncate">
                    Dari {lastCompletedShift.userName} ({lastCompletedShift.shiftType === "SHIFT_PAGI" ? "Pagi" : "Sore"})
                  </span>
                </div>
              </label>
              <span className="font-mono font-black text-xs text-amber-900 dark:text-amber-300 shrink-0 ml-2">
                {formatRupiah(lastCompletedShift.actualCash)}
              </span>
            </div>
          )}

          {/* Input Modal Awal */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Modal Awal Kas di Laci:
              </label>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                Uang fisik kembalian awal
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-black text-sm text-slate-500 dark:text-slate-400">
                Rp
              </span>
              <input
                type="text"
                value={startingCashInput}
                onChange={(e) => setStartingCashInput(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none rounded-xl font-mono text-xl font-black text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] tabular-nums"
              />
            </div>
          </div>

          {/* Quick Cash Options */}
          <div>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-1.5">
              Pilihan Nominal Cepat:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {quickOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStartingCashInput(opt.toString())}
                  className={`py-1.5 px-1 rounded-lg border-2 border-slate-900 dark:border-slate-100 text-[10px] font-mono font-black shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] cursor-pointer transition-all ${
                    numericCash === opt
                      ? "bg-[#FFB800] text-slate-950"
                      : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {formatRupiah(opt).replace("Rp ", "")}
                </button>
              ))}
            </div>
          </div>

          {/* Info Notice */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-[11px] font-medium text-blue-800 dark:text-blue-200 leading-relaxed">
            💡 <strong>Penting:</strong> Waktu Clock In tercatat otomatis saat Anda menekan tombol di bawah. Uang modal awal akan menjadi patokan rekonsiliasi kas di akhir shift.
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-3 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer transition-all shrink-0"
            >
              Logout
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl font-black text-xs bg-[#6366F1] hover:bg-[#4F46E5] text-white border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              {isSubmitting ? "Membuka Shift..." : "BUKA SHIFT & CLOCK IN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 2. MODAL REKONSILIASI KAS & TUTUP SHIFT
// ==========================================
interface CloseShiftModalProps {
  isOpen: boolean;
  shift: CashierShift;
  onCloseShift: (actualCash: number, notes: string) => Promise<void>;
  onCancel: () => void;
}

export function CloseShiftModal({
  isOpen,
  shift,
  onCloseShift,
  onCancel,
}: CloseShiftModalProps) {
  const [actualCashInput, setActualCashInput] = useState<string>(
    shift.expectedCash ? shift.expectedCash.toString() : ""
  );
  const [reconciliationNotes, setReconciliationNotes] = useState<string>("");
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Denominasi Lembar & Koin
  const [denominations, setDenominations] = useState<Record<number, number>>({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
  });

  const numericActualCash = useMemo(() => {
    const clean = actualCashInput.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  }, [actualCashInput]);

  const variance = useMemo(() => {
    return numericActualCash - (shift.expectedCash || 0);
  }, [numericActualCash, shift.expectedCash]);

  // Update actual cash from denomination calculator
  const handleDenominationChange = (value: number, countStr: string) => {
    const count = parseInt(countStr.replace(/\D/g, ""), 10) || 0;
    const newDenom = { ...denominations, [value]: count };
    setDenominations(newDenom);

    const total = Object.entries(newDenom).reduce(
      (acc, [val, cnt]) => acc + Number(val) * Number(cnt),
      0
    );
    setActualCashInput(total.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCloseShift(numericActualCash, reconciliationNotes);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col transition-colors">
        {/* Header */}
        <div className="px-6 py-4 bg-rose-600 text-white border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-rose-600 border-2 border-slate-900 flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wide">Tutup Shift & Rekonsiliasi Kas</h3>
              <p className="text-[11px] font-bold text-rose-100">Clock Out Absensi Pulang</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-black text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Ringkasan Shift Berjalan */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-500 dark:text-slate-400">Kasir / Shift:</span>
              <span className="font-black text-slate-900 dark:text-slate-100">
                {shift.userName} ({shift.shiftType === "SHIFT_PAGI" ? "Pagi" : "Sore"})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-500 dark:text-slate-400">Jam Buka (Clock In):</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {new Date(shift.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-600 dark:text-slate-300">Modal Awal Kas:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatRupiah(shift.startingCash)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                Penjualan Tunai ({shift.totalTransactionsCount || 0} trx):
              </span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                +{formatRupiah(shift.totalCashTransactions || 0)}
              </span>
            </div>
            {Boolean(shift.totalNonCashTransactions) && (
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>Penjualan Non-Tunai (QRIS/Debit):</span>
                <span className="font-mono">{formatRupiah(shift.totalNonCashTransactions)}</span>
              </div>
            )}
          </div>

          {/* EXPECTED CASH HIGHLIGHT */}
          <div className="p-4 bg-[#FEF3C7] dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-amber-200 block">
                Target Uang Kas Sistem (Expected):
              </span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-amber-300/80">
                Modal Awal + Total Penjualan Tunai
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-xl text-slate-950 dark:text-amber-300 tabular-nums">
                {formatRupiah(shift.expectedCash || 0)}
              </span>
            </div>
          </div>

          {/* INPUT ACTUAL CASH */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Hitungan Fisik Uang Kas di Laci:
              </label>
              <button
                type="button"
                onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{isCalculatorOpen ? "Tutup Hitung Pecahan ✕" : "🧮 Hitung Pecahan Uang"}</span>
              </button>
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-black text-sm text-slate-500 dark:text-slate-400">
                Rp
              </span>
              <input
                type="text"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                autoFocus
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none rounded-xl font-mono text-xl font-black text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] tabular-nums"
              />
            </div>
          </div>

          {/* DENOMINATION CALCULATOR (COLLAPSIBLE) */}
          {isCalculatorOpen && (
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800/90 rounded-xl border-2 border-slate-900 dark:border-slate-100 space-y-2 text-xs animate-in fade-in duration-150">
              <span className="font-black text-[11px] uppercase tracking-wider block text-slate-800 dark:text-slate-200">
                Kalkulator Pecahan Lembar & Koin
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[100000, 50000, 20000, 10000, 5000, 2000, 1000, 500].map((denom) => (
                  <div key={denom} className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-300 dark:border-slate-700">
                    <span className="font-mono font-bold text-[10px] w-14 shrink-0 text-slate-700 dark:text-slate-300">
                      {formatRupiah(denom).replace("Rp ", "")} x
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={denominations[denom] || ""}
                      onChange={(e) => handleDenominationChange(denom, e.target.value)}
                      placeholder="0"
                      className="w-full text-right font-mono font-bold text-xs p-1 bg-slate-50 dark:bg-slate-800 border rounded focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VARIANCE STATUS CARD */}
          <div
            className={`p-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between ${
              variance === 0
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200"
                : variance > 0
                ? "bg-blue-100 dark:bg-blue-950/60 text-blue-950 dark:text-blue-200"
                : "bg-rose-100 dark:bg-rose-950/60 text-rose-950 dark:text-rose-200"
            }`}
          >
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider block">
                {variance === 0
                  ? "✓ Kas Sesuai / Pas (Seimbang)"
                  : variance > 0
                  ? "▲ Selisih Lebih (Surplus)"
                  : "▼ Selisih Kurang (Shortage)"}
              </span>
              <span className="text-[10px] font-bold opacity-80">
                {variance === 0
                  ? "Uang fisik tepat sama dengan target sistem"
                  : variance > 0
                  ? "Uang fisik di laci lebih banyak dari catatan sistem"
                  : "Uang fisik di laci kurang dari catatan sistem"}
              </span>
            </div>
            <div className="text-right font-mono font-black text-lg tabular-nums">
              {variance === 0
                ? "Rp 0"
                : variance > 0
                ? `+ ${formatRupiah(variance)}`
                : `- ${formatRupiah(Math.abs(variance))}`}
            </div>
          </div>

          {/* Reconciliation Notes */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
              Catatan Rekonsiliasi (Opsional):
            </label>
            <input
              type="text"
              value={reconciliationNotes}
              onChange={(e) => setReconciliationNotes(e.target.value)}
              placeholder="Contoh: Selisih Rp 200 karena pembulatan kembalian permen"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-3 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl font-black text-xs bg-rose-600 hover:bg-rose-700 text-white border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              {isSubmitting ? "Menutup Shift..." : "TUTUP SHIFT & ABSEN PULANG"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// 3. SCREEN JADWAL TIDAK AKTIF / DIBLOKIR
// ==========================================
interface BlockedShiftScreenProps {
  cashierName: string;
  validationResult: ShiftValidationResult;
  onRefresh: () => void;
  onLogout: () => void;
}

export function BlockedShiftScreen({
  cashierName,
  validationResult,
  onRefresh,
  onLogout,
}: BlockedShiftScreenProps) {
  const { hasScheduleToday, todaySchedule, toleranceMessage } = validationResult;

  return (
    <div className="h-screen w-full flex items-center justify-center p-4 bg-slate-100 dark:bg-[#0F172A] select-none font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] max-w-md w-full p-6 text-center space-y-4">
        {/* Warning Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFB800] border-2 border-slate-900 dark:border-slate-100 text-slate-950 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Tidak Memiliki Jadwal Shift Aktif
          </h2>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Halo <strong className="text-slate-900 dark:text-slate-100">{cashierName}</strong>, akses mesin kasir POS dikunci karena sistem tidak mendeteksi jadwal kerja aktif untuk akun Anda saat ini.
          </p>
        </div>

        {/* Schedule Detail or Error Details */}
        {hasScheduleToday && todaySchedule ? (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-xs text-left space-y-1.5">
            <div className="font-black text-amber-900 dark:text-amber-200">
              📅 Jadwal Anda Hari Ini:
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span>Shift:</span>
              <span className="font-bold font-mono">
                {todaySchedule.shiftType === "SHIFT_PAGI" ? "PAGI" : "SORE"} ({todaySchedule.startTime} - {todaySchedule.endTime})
              </span>
            </div>
            {toleranceMessage && (
              <p className="text-[11px] text-rose-700 dark:text-rose-300 pt-1 font-bold">
                ⚠️ {toleranceMessage}
              </p>
            )}
          </div>
        ) : (
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-slate-900 dark:border-slate-100 text-xs text-left space-y-1 text-slate-600 dark:text-slate-400">
            <p className="font-bold text-slate-900 dark:text-slate-100">
              ℹ️ Tidak ada jadwal yang terdaftar untuk tanggal hari ini ({new Date().toLocaleDateString("id-ID")}).
            </p>
            <p className="text-[11px]">
              Jika Anda bertugas hari ini atau melakukan tukar shift dengan rekan kasir, silakan hubungi <strong>Supervisor / Administrator</strong> untuk memperbarui penugasan pada Master Jadwal.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 py-2.5 px-3 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer transition-all"
          >
            Keluar (Logout)
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white border-2 border-slate-900 dark:border-slate-100 font-black text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer transition-all"
          >
            Cek Ulang Status ↻
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 4. STRUK RINGKASAN TUTUP SHIFT THERMAL
// ==========================================
interface ShiftReceiptModalProps {
  isOpen: boolean;
  shift: CashierShift;
  onDone: () => void;
}

export function ShiftReceiptModal({ isOpen, shift, onDone }: ShiftReceiptModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-shift-receipt,
          #thermal-shift-receipt * {
            visibility: visible !important;
          }
          #thermal-shift-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 10px !important;
            background: white !important;
            color: black !important;
            font-family: monospace !important;
            font-size: 11px !important;
            line-height: 1.2 !important;
          }
        }
      `}</style>

      {/* Hidden Print Content */}
      <div id="thermal-shift-receipt" className="hidden print:block font-mono text-black text-xs leading-tight w-[80mm] p-2 bg-white">
        <div className="text-center font-bold text-sm uppercase">DAILYMART POS</div>
        <div className="text-center text-[10px]">LAPORAN PENUTUPAN SHIFT KASIR</div>
        <div className="my-1 text-center overflow-hidden">----------------------------------------</div>
        <div className="text-[10px] space-y-0.5">
          <div>Tanggal     : {shift.date}</div>
          <div>Kasir       : {shift.userName}</div>
          <div>Shift       : {shift.shiftType}</div>
          <div>Clock In    : {new Date(shift.openedAt).toLocaleTimeString("id-ID")}</div>
          <div>Clock Out   : {shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString("id-ID") : "-"}</div>
        </div>
        <div className="my-1 text-center overflow-hidden">----------------------------------------</div>
        <div className="space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span>Modal Awal Kas</span>
            <span>{formatRupiah(shift.startingCash)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Tunai ({shift.totalTransactionsCount || 0} trx)</span>
            <span>{formatRupiah(shift.totalCashTransactions || 0)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Non-Tunai</span>
            <span>{formatRupiah(shift.totalNonCashTransactions || 0)}</span>
          </div>
          <div className="my-1 border-t border-dashed border-black" />
          <div className="flex justify-between font-bold">
            <span>TARGET KAS (EXPECTED)</span>
            <span>{formatRupiah(shift.expectedCash)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>FISIK KAS (ACTUAL)</span>
            <span>{formatRupiah(shift.actualCash)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>SELISIH (VARIANCE)</span>
            <span>{shift.cashVariance >= 0 ? `+ ${formatRupiah(shift.cashVariance)}` : `- ${formatRupiah(Math.abs(shift.cashVariance))}`}</span>
          </div>
          {shift.reconciliationNotes && (
            <div className="text-[9px] italic mt-1">Catatan: {shift.reconciliationNotes}</div>
          )}
        </div>
        <div className="my-2 text-center overflow-hidden">----------------------------------------</div>
        <div className="text-center text-[9px]">Shift telah ditutup secara sah. Terima kasih.</div>
      </div>

      {/* Screen Modal Dialog */}
      <div className="print:hidden bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-sm p-6 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-slate-900 text-emerald-600 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Shift Berhasil Ditutup</h3>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
            Rekonsiliasi kas telah tersimpan di sistem.
          </p>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono space-y-1 text-left">
          <div className="flex justify-between">
            <span className="text-slate-500">Target Kas:</span>
            <span className="font-bold">{formatRupiah(shift.expectedCash)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Fisik Kas:</span>
            <span className="font-bold">{formatRupiah(shift.actualCash)}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700 font-black">
            <span>Selisih Kas:</span>
            <span className={shift.cashVariance === 0 ? "text-emerald-600" : shift.cashVariance > 0 ? "text-blue-600" : "text-rose-600"}>
              {shift.cashVariance >= 0 ? `+ ${formatRupiah(shift.cashVariance)}` : `- ${formatRupiah(Math.abs(shift.cashVariance))}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-900 dark:text-slate-100 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
          >
            Cetak Struk 🖨️
          </button>
          <button
            type="button"
            onClick={onDone}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white border-2 border-slate-900 dark:border-slate-100 font-black text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
          >
            Selesai & Logout
          </button>
        </div>
      </div>
    </div>
  );
}
