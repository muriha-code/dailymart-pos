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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-4 sm:p-6 lg:p-8 font-sans">
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
      <div className="max-w-7xl mx-auto space-y-6 no-print">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER                                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[11px] uppercase tracking-wider">
                {isAdmin ? "Admin Overview" : "Kasir POS"}
              </span>
              <span className="text-xs text-slate-400">• Histori Sesi Kasir</span>
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {isAdmin ? "Riwayat & Ringkasan Penjualan Kasir" : "Riwayat Transaksi Saya"}
              </h1>
              
              {/* Badge Kasir Aktif */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {cashierInfo?.displayName || "Memuat Kasir..."}
                  {cashierInfo?.email ? ` (${cashierInfo.email})` : ""}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Daftar transaksi penjualan terisolasi kasir, analisis omset harian, dan cetak ulang struk thermal.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Date Picker Filter */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 pl-2">Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadTransactions}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shrink-0"
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
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. PERSONALIZED KPI CARDS                                                 */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Transaksi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Transaksi
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                {summary.totalTransactions}{" "}
                <span className="text-xs font-normal text-slate-400">struk</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Total Omset Penjualan */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Omset Penjualan
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                {formatRupiah(summary.totalRevenue)}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: Rata-rata Basket Size */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Rata-rata / Basket Size
              </span>
              <span className="text-xl font-black text-slate-900 mt-1 block font-mono">
                {formatRupiah(summary.averageBasketSize)}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. REKONSILIASI SETORAN KAS SHIFT (MINI CASH RECONCILIATION BAR)           */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          {/* Header & Metric Summary Container - Anti Overflow Layout */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">💵</span>
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Rekonsiliasi Setoran Kas Shift
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pembagian fisik uang tunai dalam laci kas vs penerimaan non-tunai (QRIS / Debit / Transfer).
              </p>
            </div>

            {/* Indicator Badges */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs shrink-0">
              <div className="flex items-center gap-2 bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-100">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-600 font-medium">Fisik Tunai:</span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(summary.cashTotal)}</span>
              </div>
              <div className="flex items-center gap-2 bg-sky-50/80 px-3 py-1.5 rounded-xl border border-sky-100">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
                <span className="text-slate-600 font-medium">Digital / Non-Tunai:</span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(summary.nonCashTotal)}</span>
              </div>
            </div>
          </div>

          {/* Pill Progress Bar Visualisation */}
          <div className="space-y-1.5">
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 p-0.5">
              <div
                style={{ width: `${cashPercentage}%` }}
                className="bg-emerald-500 h-full rounded-l-full transition-all duration-300 flex items-center justify-center text-[9px] font-black text-white"
                title={`Tunai: ${cashPercentage}%`}
              >
                {cashPercentage > 10 ? `${cashPercentage}%` : ""}
              </div>
              <div
                style={{ width: `${nonCashPercentage}%` }}
                className="bg-sky-500 h-full rounded-r-full transition-all duration-300 flex items-center justify-center text-[9px] font-black text-white"
                title={`Non-Tunai: ${nonCashPercentage}%`}
              >
                {nonCashPercentage > 10 ? `${nonCashPercentage}%` : ""}
              </div>
            </div>

            {/* Percentage Labels */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-semibold text-slate-500 gap-1 pt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Uang Fisik Laci (Tunai): <strong className="text-slate-800 font-mono">{cashPercentage}%</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 inline-block" />
                Uang Digital Bank/E-Wallet: <strong className="text-slate-800 font-mono">{nonCashPercentage}%</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TOOLBAR SEARCH & FILTER                                                */}
        {/* ========================================================================= */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input Bar */}
          <div className="relative flex-1">
            <svg
              className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nomor Invoice (TRX-...), Nama Kasir, atau Item Produk..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Admin Cashier Filter Dropdown (Role ADMIN only) */}
            {isAdmin && (
              <div className="flex items-center gap-2 min-w-[180px]">
                <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  Kasir:
                </label>
                <select
                  value={selectedCashierFilter}
                  onChange={(e) => setSelectedCashierFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
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

            {/* Payment Method Filter Dropdown */}
            <div className="flex items-center gap-2 min-w-[180px]">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Metode:
              </label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
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
        {/* 5. TABEL RIWAYAT TRANSAKSI                                                */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Memuat riwayat transaksi kasir...</p>
            </div>
          ) : fetchError ? (
            <div className="p-12 text-center text-red-600 space-y-3">
              <p className="text-sm font-bold">{fetchError}</p>
              <button
                type="button"
                onClick={loadTransactions}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Coba Lagi
              </button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <p className="text-sm font-bold text-slate-800">
                Belum ada transaksi pada tanggal {selectedDate}.
              </p>
              <p className="text-xs text-slate-400">
                Transaksi kasir yang diproses pada tanggal ini akan tercatat di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">No. Invoice</th>
                    <th className="py-3.5 px-4">Waktu Transaksi</th>
                    <th className="py-3.5 px-4">Kasir</th>
                    <th className="py-3.5 px-4">Ringkasan Item</th>
                    <th className="py-3.5 px-4 text-center">Metode</th>
                    <th className="py-3.5 px-4 text-right">Total Belanja</th>
                    <th className="py-3.5 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {transactions.map((trx) => {
                    const totalQty = trx.items.reduce((sum, i) => sum + i.quantity, 0);
                    const itemNames = trx.items.map((i) => i.productName).join(", ");

                    return (
                      <tr
                        key={trx.id || trx.transactionNumber}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* No Invoice */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {trx.transactionNumber}
                        </td>

                        {/* Waktu & Tanggal */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {formatDate(trx.createdAt)}
                        </td>

                        {/* Kasir */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {trx.cashierName || trx.cashierId || "Kasir POS"}
                          </span>
                        </td>

                        {/* Ringkasan Item */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">
                            {totalQty} item ({trx.items.length} jenis)
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {itemNames}
                          </div>
                        </td>

                        {/* Metode Pembayaran Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {trx.paymentMethod === "CASH" && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                              💵 TUNAI
                            </span>
                          )}
                          {trx.paymentMethod === "QRIS" && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                              📱 QRIS
                            </span>
                          )}
                          {(trx.paymentMethod === "DEBIT" ||
                            trx.paymentMethod === "CREDIT") && (
                            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[10px]">
                              💳 {trx.paymentMethod}
                            </span>
                          )}
                          {trx.paymentMethod === "TRANSFER" && (
                            <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[10px]">
                              🏦 TRANSFER
                            </span>
                          )}
                        </td>

                        {/* Total Belanja */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                          {formatRupiah(trx.total)}
                        </td>

                        {/* Tombol Aksi Detail & Struk */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedTransaction(trx)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
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
                                strokeWidth="2"
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
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL DETAIL & REPRINT STRUK THERMAL                                   */}
      {/* ========================================================================= */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 print-backdrop">
          {/* Modal Card Wrapper */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-[380px] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print-modal-card">
            
            {/* REGION 1: MODAL HEADER */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 no-print">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Struk Pembayaran Kasir
                </h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {selectedTransaction.transactionNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="text-slate-400 hover:text-slate-600 text-base font-bold p-1 cursor-pointer"
                title="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* REGION 2: MODAL BODY */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-200/70 flex justify-center print-body-container">
              <div
                id="printable-receipt"
                className="bg-white p-4 rounded-md border border-slate-300 shadow-md w-[300px] font-mono text-[11px] text-slate-900 leading-tight my-auto"
              >
                {/* Receipt Header */}
                <div className="text-center pb-2.5 border-b border-dashed border-slate-400">
                  <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    DAILYMART POS
                  </h2>
                  <p className="text-[10px] text-slate-600">
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
                    <div className="flex justify-between text-red-600">
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
                      <div className="flex justify-between text-emerald-700 font-bold">
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
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0 no-print">
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
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
