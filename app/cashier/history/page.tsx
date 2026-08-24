"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Transaction } from "@/types/transaction.types";
import { CashierSummary } from "@/types/cashierHistory.types";
import { cashierHistoryService } from "@/services/cashierHistory.service";

// Helper Format Rupiah
const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

// Helper Format Date Time
const formatDate = (dateInput: Date | string): string => {
  if (!dateInput) return "-";
  const dateObj = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(dateObj.getTime())) return String(dateInput);

  return dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Helper untuk format tanggal YYYY-MM-DD lokal
const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function CashierHistoryPage() {
  // State Utama Data Transaksi & Summary dari Backend API
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<CashierSummary>({
    totalTransactions: 0,
    totalRevenue: 0,
    averageBasketSize: 0,
    cashTotal: 0,
    nonCashTotal: 0,
  });
  const [cashierInfo, setCashierInfo] = useState<{
    uid: string;
    displayName: string;
    email: string;
    role?: string;
  } | null>(null);
  const [cashierList, setCashierList] = useState<{ uid: string; displayName: string; email?: string }[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("ALL");
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>("ALL");

  // Modal Detail & Struk State
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Load transaction history via service layer
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const responseData = await cashierHistoryService.getCashierHistory({
        date: selectedDate,
        method: selectedPaymentMethod !== "ALL" ? selectedPaymentMethod as any : undefined,
        search: searchQuery,
        cashierId: selectedCashierFilter !== "ALL" ? selectedCashierFilter : undefined,
      });

      setTransactions(responseData.transactions || []);
      setSummary(
        responseData.summary || {
          totalTransactions: 0,
          totalRevenue: 0,
          averageBasketSize: 0,
          cashTotal: 0,
          nonCashTotal: 0,
        }
      );
      if (responseData.cashierInfo) {
        setCashierInfo(responseData.cashierInfo);
      }
      if (responseData.cashierList) {
        setCashierList(responseData.cashierList);
      }
    } catch (err: any) {
      console.error("Gagal memuat riwayat transaksi kasir:", err);
      setFetchError(
        err.message || "Gagal terhubung ke server. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedPaymentMethod, searchQuery, selectedCashierFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Persentase Rekonsiliasi Tunai vs Non-Tunai dengan Safe Fallback
  const cashPercentage = useMemo(() => {
    const total = (summary.cashTotal || 0) + (summary.nonCashTotal || 0);
    if (!total || total === 0) return 0;
    return Math.round((summary.cashTotal / total) * 100);
  }, [summary.cashTotal, summary.nonCashTotal]);

  const nonCashPercentage = useMemo(() => {
    const total = (summary.cashTotal || 0) + (summary.nonCashTotal || 0);
    if (!total || total === 0) return 0;
    return 100 - cashPercentage;
  }, [summary.cashTotal, summary.nonCashTotal, cashPercentage]);

  // Trigger Print Receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  const isAdmin = cashierInfo?.role === "ADMIN";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 font-sans">
      {/* CSS @media print khusus cetak Thermal Receipt 80mm presisi */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          /* Sembunyikan elemen dengan class no-print */
          .no-print {
            display: none !important;
          }
          /* Visibility isolation untuk cetak presisi */
          body * {
            visibility: hidden;
          }
          #printable-receipt,
          #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            padding: 4mm !important;
            margin: 0 auto !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: monospace !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .print-backdrop {
            position: static !important;
            background: transparent !important;
            backdrop-filter: none !important;
            padding: 0 !important;
            display: block !important;
          }
          .print-modal-card {
            box-shadow: none !important;
            border: none !important;
            background: transparent !important;
            max-width: 100% !important;
            max-height: none !important;
            width: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-body-container {
            padding: 0 !important;
            background: transparent !important;
            display: block !important;
            overflow: visible !important;
          }
        }
      `}</style>

      {/* Konten Halaman Utama (Disembunyikan saat print via class no-print) */}
      <div className="max-w-7xl mx-auto no-print">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER                                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#EEF2FF] text-[#4338CA] border-[1.5px] border-slate-900 font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {isAdmin ? "Admin Overview" : cashierInfo?.displayName || "Kasir POS"}
                  {cashierInfo?.email ? ` (${cashierInfo.email})` : ""}
                </span>
              </span>
            </div>

            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1.5">
              {isAdmin ? "Riwayat & Ringkasan Penjualan Kasir" : "Riwayat Transaksi Saya"}
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              Daftar transaksi penjualan terisolasi kasir, analisis omset harian, dan cetak ulang struk thermal.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Date Picker Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700">Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border-2 border-slate-900 rounded-xl px-3 py-2 text-xs font-black text-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] focus:outline-none cursor-pointer"
              />
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadTransactions}
              className="bg-white hover:bg-slate-100 border-2 border-slate-900 p-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-slate-900 transition-all cursor-pointer"
              title="Refresh Data"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. PERSONALIZED KPI CARDS                                                 */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Total Transaksi */}
          <div className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1">
              Total Transaksi
            </span>
            <span className="text-xl font-black font-mono text-slate-900 block">
              {summary.totalTransactions}{" "}
              <span className="text-xs font-bold text-slate-500">struk</span>
            </span>
          </div>

          {/* Card 2: Total Omset Penjualan */}
          <div className="bg-[#E8F5E9] border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
            <span className="text-xs font-black uppercase tracking-wider text-[#065F46] block mb-1">
              Total Omset Penjualan
            </span>
            <span className="text-[#065F46] font-mono font-black text-xl block">
              {formatRupiah(summary.totalRevenue)}
            </span>
          </div>

          {/* Card 3: Rata-rata Basket Size */}
          <div className="bg-[#FEF3C7] border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
            <span className="text-xs font-black uppercase tracking-wider text-[#B45309] block mb-1">
              Rata-Rata / Basket Size
            </span>
            <span className="text-[#B45309] font-mono font-black text-xl block">
              {formatRupiah(summary.averageBasketSize)}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. REKONSILIASI SETORAN KAS SHIFT CARD                                    */}
        {/* ========================================================================= */}
        <div className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-6">
          <div className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span>💵 Rekonsiliasi Setoran Kas Shift</span>
            </div>
            {/* Badges */}
            <div className="flex items-center gap-3">
              <span className="bg-[#D1FAE5] text-[#065F46] border-[1.5px] border-slate-900 font-mono font-bold text-xs px-2.5 py-1 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                Fisik Tunai: {formatRupiah(summary.cashTotal)}
              </span>
              <span className="bg-[#EEF2FF] text-[#4338CA] border-[1.5px] border-slate-900 font-mono font-bold text-xs px-2.5 py-1 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                Non-Tunai: {formatRupiah(summary.nonCashTotal)}
              </span>
            </div>
          </div>

          <p className="text-[11px] font-bold text-slate-500 mb-2">
            Pembagian fisik uang tunai dalam laci kas vs penerimaan non-tunai (QRIS / Debit / Transfer).
          </p>

          {/* Progress Bar Track */}
          <div className="w-full h-3 bg-slate-100 border-2 border-slate-900 rounded-full overflow-hidden flex my-2">
            <div
              style={{ width: `${cashPercentage}%` }}
              className="bg-[#065F46] h-full transition-all duration-300 flex items-center justify-center text-[9px] font-black text-white"
              title={`Tunai: ${cashPercentage}%`}
            >
              {cashPercentage > 10 ? `${cashPercentage}%` : ""}
            </div>
            <div
              style={{ width: `${nonCashPercentage}%` }}
              className="bg-[#4338CA] h-full transition-all duration-300 flex items-center justify-center text-[9px] font-black text-white"
              title={`Non-Tunai: ${nonCashPercentage}%`}
            >
              {nonCashPercentage > 10 ? `${nonCashPercentage}%` : ""}
            </div>
          </div>

          {/* Percentage Labels */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-bold text-slate-600 gap-1 pt-0.5">
            <span>
              Uang Fisik Laci (Tunai): <strong className="text-slate-900 font-mono">{cashPercentage}%</strong>
            </span>
            <span>
              Uang Digital (QRIS/Debit): <strong className="text-slate-900 font-mono">{nonCashPercentage}%</strong>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TOOLBAR SEARCH & FILTER AREA                                           */}
        {/* ========================================================================= */}
        <div className="bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-wrap items-center gap-3 mb-6">
          {/* Search Input Field */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nomor Invoice (TRX-...), Nama Kasir, atau Item Produk..."
              className="bg-slate-50 border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white flex-1 w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-900 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Admin Cashier Filter Dropdown (Role ADMIN only) */}
            {isAdmin && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-black text-slate-700 whitespace-nowrap">
                  Kasir:
                </label>
                <select
                  value={selectedCashierFilter}
                  onChange={(e) => setSelectedCashierFilter(e.target.value)}
                  className="bg-white border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
                >
                  <option value="ALL">Semua Kasir</option>
                  {cashierList.map((kasir) => (
                    <option key={kasir.uid} value={kasir.uid}>
                      {kasir.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Method Dropdown Select */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-slate-700 whitespace-nowrap">
                Metode:
              </label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="bg-white border-2 border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                <option value="ALL">Semua Metode</option>
                <option value="CASH">Tunai (CASH)</option>
                <option value="QRIS">QRIS</option>
                <option value="DEBIT">Kartu Debit</option>
                <option value="CREDIT">Kartu Kredit</option>
                <option value="TRANSFER">Transfer Bank</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. TABEL RIWAYAT TRANSAKSI & EMPTY STATE                                  */}
        {/* ========================================================================= */}
        {isLoading ? (
          <div className="bg-white border-2 border-slate-900 rounded-xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <div className="w-8 h-8 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-black text-slate-700">Memuat riwayat transaksi kasir...</p>
          </div>
        ) : fetchError ? (
          <div className="bg-white border-2 border-slate-900 rounded-xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <p className="text-sm font-black text-rose-600 mb-2">{fetchError}</p>
            <button
              type="button"
              onClick={loadTransactions}
              className="px-4 py-2 bg-[#6366F1] text-white border-2 border-slate-900 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:bg-[#4F46E5] cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white border-2 border-slate-900 rounded-xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <p className="text-sm font-black text-slate-900 mb-1">
              Belum ada transaksi pada tanggal {selectedDate}.
            </p>
            <p className="text-xs font-mono text-slate-500">
              Transaksi kasir yang diproses pada tanggal ini akan tercatat di sini.
            </p>
          </div>
        ) : (
          <div className="bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-900 text-[11px] font-black text-slate-900 uppercase tracking-wider">
                    <th className="py-3.5 px-4">No. Invoice</th>
                    <th className="py-3.5 px-4">Waktu Transaksi</th>
                    <th className="py-3.5 px-4">Kasir</th>
                    <th className="py-3.5 px-4">Ringkasan Item</th>
                    <th className="py-3.5 px-4 text-center">Metode</th>
                    <th className="py-3.5 px-4 text-right">Total Belanja</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-900 font-bold">
                  {transactions.map((trx) => {
                    const totalQty = trx.items.reduce((sum, i) => sum + i.quantity, 0);
                    const itemNames = trx.items.map((i) => i.productName).join(", ");

                    return (
                      <tr
                        key={trx.id || trx.transactionNumber}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        {/* No Invoice */}
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900 whitespace-nowrap">
                          {trx.transactionNumber}
                        </td>

                        {/* Waktu & Tanggal */}
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          {formatDate(trx.createdAt)}
                        </td>

                        {/* Kasir */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border-1.5 border-slate-900 text-slate-900 font-bold text-[11px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                            {trx.cashierName || trx.cashierId || "Kasir POS"}
                          </span>
                        </td>

                        {/* Ringkasan Item */}
                        <td className="py-3.5 px-4">
                          <div className="font-black text-slate-900">
                            {totalQty} item ({trx.items.length} jenis)
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 truncate max-w-xs">
                            {itemNames}
                          </div>
                        </td>

                        {/* Metode Pembayaran Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {trx.paymentMethod === "CASH" && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#D1FAE5] text-[#065F46] border-[1.5px] border-slate-900 font-mono font-bold text-[10px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                              💵 TUNAI
                            </span>
                          )}
                          {trx.paymentMethod === "QRIS" && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#EEF2FF] text-[#4338CA] border-[1.5px] border-slate-900 font-mono font-bold text-[10px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                              📱 QRIS
                            </span>
                          )}
                          {(trx.paymentMethod === "DEBIT" ||
                            trx.paymentMethod === "CREDIT") && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#EEF2FF] text-[#4338CA] border-[1.5px] border-slate-900 font-mono font-bold text-[10px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                              💳 {trx.paymentMethod}
                            </span>
                          )}
                          {trx.paymentMethod === "TRANSFER" && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#F3E8FF] text-[#6B21A8] border-[1.5px] border-slate-900 font-mono font-bold text-[10px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                              🏦 TRANSFER
                            </span>
                          )}
                        </td>

                        {/* Total Belanja */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 text-sm whitespace-nowrap">
                          {formatRupiah(trx.total)}
                        </td>

                        {/* Tombol Aksi Detail & Struk */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedTransaction(trx)}
                            className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs px-3 py-1.5 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.5"
                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                              />
                            </svg>
                            <span>Detail & Struk</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL DETAIL & REPRINT STRUK THERMAL                                   */}
      {/* ========================================================================= */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 print-backdrop">
          {/* Modal Card Wrapper */}
          <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] w-full max-w-[380px] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print-modal-card">
            
            {/* REGION 1: MODAL HEADER */}
            <div className="px-4 py-3 bg-slate-100 border-b-2 border-slate-900 flex items-center justify-between shrink-0 no-print">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Struk Pembayaran Kasir
                </h3>
                <p className="text-[11px] text-slate-600 font-mono font-bold">
                  {selectedTransaction.transactionNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="w-7 h-7 rounded-lg bg-white border-2 border-slate-900 hover:bg-slate-200 text-slate-900 flex items-center justify-center font-black text-xs transition-colors cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                title="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* REGION 2: MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center print-body-container">
              <div
                id="printable-receipt"
                className="bg-white p-4 rounded-md border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] w-[300px] font-mono text-[11px] text-slate-900 leading-tight my-auto"
              >
                {/* Receipt Header */}
                <div className="text-center pb-2.5 border-b border-dashed border-slate-400">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    DAILYMART POS
                  </h2>
                  <p className="text-[10px] text-slate-600 font-bold">
                    Minimarket & Retail System
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Jl. Raya Pajajaran No. 128, Bogor
                  </p>
                  <p className="text-[10px] text-slate-500">Telp: (0251) 833-9988</p>
                </div>

                {/* Receipt Metadata */}
                <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">No. TRX:</span>
                    <span className="font-bold text-slate-900">
                      {selectedTransaction.transactionNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tanggal:</span>
                    <span>{formatDate(selectedTransaction.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kasir:</span>
                    <span>{selectedTransaction.cashierName || selectedTransaction.cashierId || "Kasir POS"}</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1.5 text-[10px]">
                  {selectedTransaction.items.map((item, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="font-bold text-slate-900 truncate">
                        {item.productName}
                      </div>
                      <div className="flex justify-between text-slate-600 text-[10px]">
                        <span>
                          {item.quantity} x {formatRupiah(item.price)}
                          {item.discount > 0 ? ` (-${formatRupiah(item.discount)})` : ""}
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatRupiah(item.subtotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals Summary */}
                <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>{formatRupiah(selectedTransaction.subtotal)}</span>
                  </div>

                  {selectedTransaction.discount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Total Diskon:</span>
                      <span>-{formatRupiah(selectedTransaction.discount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs font-black text-slate-900 pt-1 border-t border-slate-200">
                    <span>TOTAL:</span>
                    <span>{formatRupiah(selectedTransaction.total)}</span>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5 text-[10px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Metode Bayar:</span>
                    <span className="font-bold uppercase">
                      {selectedTransaction.paymentMethod}
                    </span>
                  </div>

                  {selectedTransaction.paymentMethod === "CASH" && (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>Uang Diterima:</span>
                        <span>{formatRupiah(selectedTransaction.paidAmount)}</span>
                      </div>
                      <div className="flex justify-between text-[#065F46] font-bold">
                        <span>Kembalian:</span>
                        <span>{formatRupiah(selectedTransaction.change)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Receipt Footer */}
                <div className="pt-2 text-center text-[9px] text-slate-500 space-y-0.5">
                  <p className="font-bold text-slate-700">
                    *** TERIMA KASIH ***
                  </p>
                  <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
                  <p className="text-[8px] text-slate-400 pt-0.5">
                    DailyMart POS v1.0
                  </p>
                </div>
              </div>
            </div>

            {/* REGION 3: MODAL FOOTER */}
            <div className="px-4 py-3 bg-slate-100 border-t-2 border-slate-900 flex items-center justify-end gap-2.5 shrink-0 no-print">
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs px-3.5 py-2 rounded-xl border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-colors cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={handlePrintReceipt}
                className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs px-4 py-2 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>🖨️ Cetak Struk</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
