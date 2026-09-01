"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Transaction } from "@/types/transaction.types";
import { CashierSummary } from "@/types/cashierHistory.types";
import { cashierHistoryService } from "@/services/cashierHistory.service";
import { ReceiptPreviewCard, ReceiptTransactionData } from "@/components/pos/ReceiptPrint";
import { executeThermalPrint } from "@/components/receipt/PrintReceipt";
import { ReceiptData, ReceiptPaperSize } from "@/types/receipt";
import { settingsService } from "@/services/settings.service";

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

export default function AdminTransactionsHistoryPage() {
  // State Utama Data Transaksi & Summary dari Backend API
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<CashierSummary>({
    totalTransactions: 0,
    totalRevenue: 0,
    averageBasketSize: 0,
    cashTotal: 0,
    nonCashTotal: 0,
  });
  const [adminInfo, setAdminInfo] = useState<{
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

  // Modal State untuk melihat detail struk
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [receiptPaperSize, setReceiptPaperSize] = useState<ReceiptPaperSize>("58mm");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dailymart_pos_paper_size") as ReceiptPaperSize;
      if (saved === "58mm" || saved === "80mm") {
        setReceiptPaperSize(saved);
      }
    } catch {}
  }, []);

  const handlePaperSizeChange = (size: ReceiptPaperSize) => {
    setReceiptPaperSize(size);
    try {
      localStorage.setItem("dailymart_pos_paper_size", size);
    } catch {}
  };

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
        setAdminInfo(responseData.cashierInfo);
      }
      if (responseData.cashierList) {
        setCashierList(responseData.cashierList);
      }
    } catch (err: any) {
      console.error("Gagal memuat semua riwayat transaksi admin:", err);
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

  // Map selectedTransaction into ReceiptTransactionData for ReceiptPrint
  const selectedTransactionSummary = useMemo<ReceiptTransactionData | null>(() => {
    if (!selectedTransaction) return null;
    return {
      invoiceNumber: selectedTransaction.transactionNumber,
      date: selectedTransaction.createdAt ? String(selectedTransaction.createdAt) : new Date().toISOString(),
      items: (selectedTransaction.items || []).map((it) => ({
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.price,
        subtotal: it.subtotal,
        discount: it.discount || 0,
      })),
      subtotal: selectedTransaction.subtotal,
      discountTotal: selectedTransaction.discount || 0,
      grandTotal: selectedTransaction.total,
      paymentMethod: selectedTransaction.paymentMethod as any,
      amountPaid: selectedTransaction.paidAmount || selectedTransaction.total,
      changeAmount: selectedTransaction.change || 0,
    };
  }, [selectedTransaction]);

  // Trigger Print Receipt
  const handlePrintReceipt = async () => {
    if (!selectedTransaction) return;
    try {
      const storeSettings = await settingsService.getSettings().catch(() => null);
      const trxDateObj = selectedTransaction.createdAt ? new Date(selectedTransaction.createdAt) : new Date();
      const dateStr = trxDateObj.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
      const timeStr = trxDateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

      const receiptData: ReceiptData = {
        storeName: storeSettings?.storeName || "DAILYMART POS",
        storeBranch: storeSettings?.storeBranch ? `Cabang ${storeSettings.storeBranch}` : "Cabang Utama",
        storeAddress: storeSettings?.storeAddress || "Jl. Retail Utama No. 88, Bogor",
        storePhone: storeSettings?.storePhone || "0251-8339988",
        transactionNumber: selectedTransaction.transactionNumber,
        date: dateStr,
        time: timeStr,
        cashierName: selectedTransaction.cashierName || "Kasir",
        items: (selectedTransaction.items || []).map((it) => ({
          name: it.productName,
          quantity: it.quantity,
          price: it.price,
          subtotal: it.subtotal,
          discount: it.discount || 0,
        })),
        subtotal: selectedTransaction.subtotal,
        discount: selectedTransaction.discount || 0,
        tax: 0,
        total: selectedTransaction.total,
        paymentMethod: selectedTransaction.paymentMethod,
        paidAmount: selectedTransaction.paidAmount || selectedTransaction.total,
        change: selectedTransaction.change || 0,
        footerMessage: storeSettings?.receiptFooterNote || "Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.",
        version: "v1.0",
      };

      executeThermalPrint(receiptData, receiptPaperSize);
    } catch (err) {
      console.error("Gagal mencetak struk:", err);
    }
  };

  return (
    <div className="min-h-screen w-full min-w-0 bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
      {/* Konten Halaman Utama */}
      <div className="max-w-7xl w-full min-w-0 mx-auto">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER                                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-[1.5px] border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2.5 py-1 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  Admin Overview {adminInfo?.displayName ? `(${adminInfo.displayName})` : ""}
                </span>
              </span>
            </div>

            <h1 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight mt-1.5">
              Semua Riwayat Transaksi
            </h1>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              Daftar seluruh transaksi penjualan toko, analisis omset harian kasir, dan cetak ulang struk thermal.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Date Picker Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300">Tanggal:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] focus:outline-none cursor-pointer"
              />
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadTransactions}
              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-100 p-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-slate-900 dark:text-slate-100 transition-all cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
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
        {/* 2. REKAP OMSET & METRIK AKUMULASI KPI CARDS                              */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Card 1: Total Transaksi */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
              Total Transaksi {selectedCashierFilter !== "ALL" ? "(Kasir Terpilih)" : "(Semua Kasir)"}
            </span>
            <span className="text-xl font-black font-mono text-slate-900 dark:text-slate-50 block">
              {summary.totalTransactions}{" "}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">struk</span>
            </span>
          </div>

          {/* Card 2: Total Omset Penjualan */}
          <div className="bg-[#E8F5E9] dark:bg-emerald-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-xs font-black uppercase tracking-wider text-[#065F46] dark:text-emerald-300 block mb-1">
              Total Omset Akumulasi {selectedCashierFilter !== "ALL" ? "(Kasir Terpilih)" : "(Semua Kasir)"}
            </span>
            <span className="text-[#065F46] dark:text-emerald-300 font-mono font-black text-xl block">
              {formatRupiah(summary.totalRevenue)}
            </span>
          </div>

          {/* Card 3: Rata-rata Basket Size */}
          <div className="bg-[#FEF3C7] dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-xs font-black uppercase tracking-wider text-[#B45309] dark:text-amber-300 block mb-1">
              Rata-Rata / Basket Size
            </span>
            <span className="text-[#B45309] dark:text-amber-300 font-mono font-black text-xl block">
              {formatRupiah(summary.averageBasketSize)}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. REKONSILIASI SETORAN KAS SHIFT CARD                                    */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mb-6 transition-colors">
          <div className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span>💵 Rekonsiliasi Setoran Kas Toko</span>
            </div>
            {/* Badges */}
            <div className="flex items-center gap-3">
              <span className="bg-[#D1FAE5] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border-[1.5px] border-slate-900 dark:border-slate-100 font-mono font-bold text-xs px-2.5 py-1 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                Fisik Tunai: {formatRupiah(summary.cashTotal)}
              </span>
              <span className="bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-[1.5px] border-slate-900 dark:border-slate-100 font-mono font-bold text-xs px-2.5 py-1 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                Non-Tunai: {formatRupiah(summary.nonCashTotal)}
              </span>
            </div>
          </div>

          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
            Pembagian akumulasi fisik uang tunai dalam laci kas vs penerimaan non-tunai (QRIS / Debit / Transfer).
          </p>

          {/* Progress Bar Track */}
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full overflow-hidden flex my-2">
            <div
              style={{ width: `${cashPercentage}%` }}
              className="bg-[#065F46] dark:bg-emerald-600 h-full transition-all duration-300 flex items-center justify-center text-[9px] font-black text-white"
              title={`Tunai: ${cashPercentage}%`}
            >
              {cashPercentage > 10 ? `${cashPercentage}%` : ""}
            </div>
            <div
              style={{ width: `${nonCashPercentage}%` }}
              className="bg-[#4338CA] dark:bg-indigo-600 h-full transition-all duration-300 flex items-center justify-center text-[9px] font-black text-white"
              title={`Non-Tunai: ${nonCashPercentage}%`}
            >
              {nonCashPercentage > 10 ? `${nonCashPercentage}%` : ""}
            </div>
          </div>

          {/* Percentage Labels */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400 gap-1 pt-0.5">
            <span>
              Uang Fisik Laci (Tunai): <strong className="text-slate-900 dark:text-slate-100 font-mono">{cashPercentage}%</strong>
            </span>
            <span>
              Uang Digital (QRIS/Debit): <strong className="text-slate-900 dark:text-slate-100 font-mono">{nonCashPercentage}%</strong>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TOOLBAR SEARCH & FILTER AREA                                           */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-wrap items-center gap-3 mb-6 transition-colors">
          {/* Search Input Field */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Nomor Invoice (TRX-...), Nama Kasir, atau Item Produk..."
              className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 flex-1 w-full"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-400"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter Dropdown Kasir */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Kasir:
              </label>
              <select
                value={selectedCashierFilter}
                onChange={(e) => setSelectedCashierFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
              >
                <option value="ALL">Semua Kasir</option>
                {cashierList.map((kasir) => (
                  <option key={kasir.uid} value={kasir.uid}>
                    {kasir.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Dropdown Select */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">
                Metode:
              </label>
              <select
                value={selectedPaymentMethod}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-colors">
            <div className="w-8 h-8 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-black text-slate-700 dark:text-slate-300">Memuat semua riwayat transaksi toko...</p>
          </div>
        ) : fetchError ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-colors">
            <p className="text-sm font-black text-rose-600 dark:text-rose-400 mb-2">{fetchError}</p>
            <button
              type="button"
              onClick={loadTransactions}
              className="px-4 py-2 bg-[#6366F1] text-white border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-[#4F46E5] cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-colors">
            <p className="text-sm font-black text-slate-900 dark:text-slate-100 mb-1">
              Belum ada transaksi pada tanggal {selectedDate}.
            </p>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Transaksi yang diproses oleh kasir pada tanggal ini akan tercatat di sini.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden transition-colors w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[850px] text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    <th className="py-3.5 px-4 whitespace-nowrap">No. Invoice</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Waktu Transaksi</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Kasir</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Ringkasan Item</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Metode</th>
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Total Belanja</th>
                    <th className="py-3.5 px-4 text-center whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs text-slate-900 dark:text-slate-100 font-bold">
                  {transactions.map((trx) => {
                    const totalQty = trx.items.reduce((sum, i) => sum + i.quantity, 0);
                    const itemNames = trx.items.map((i) => i.productName).join(", ");

                    return (
                      <tr
                        key={trx.id || trx.transactionNumber}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors"
                      >
                        {/* No Invoice */}
                        <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {trx.transactionNumber}
                        </td>

                        {/* Waktu & Tanggal */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(trx.createdAt)}
                        </td>

                        {/* Kasir */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border-1.5 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-bold text-[11px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                            {trx.cashierName || trx.cashierId || "Kasir POS"}
                          </span>
                        </td>

                        {/* Ringkasan Item */}
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                            {totalQty} item ({trx.items.length} jenis)
                          </div>
                          <div
                            className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xs"
                            title={itemNames}
                          >
                            {itemNames}
                          </div>
                        </td>

                        {/* Metode Pembayaran Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {trx.paymentMethod === "CASH" && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#D1FAE5] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border-[1.5px] border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                              💵 TUNAI
                            </span>
                          )}
                          {trx.paymentMethod === "QRIS" && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-[1.5px] border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                              📱 QRIS
                            </span>
                          )}
                          {(trx.paymentMethod === "DEBIT" ||
                            trx.paymentMethod === "CREDIT") && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-[1.5px] border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                              💳 {trx.paymentMethod}
                            </span>
                          )}
                          {trx.paymentMethod === "TRANSFER" && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#F3E8FF] dark:bg-purple-950/60 text-[#6B21A8] dark:text-purple-300 border-[1.5px] border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                              🏦 TRANSFER
                            </span>
                          )}
                        </td>

                        {/* Total Belanja */}
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900 dark:text-slate-100 text-sm whitespace-nowrap">
                          {formatRupiah(trx.total)}
                        </td>

                        {/* Tombol Aksi Detail & Struk */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedTransaction(trx)}
                            className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs px-3 py-1.5 rounded-lg border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer inline-flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 print:hidden animate-in fade-in duration-150">
          {/* Modal Card Wrapper */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-4 border-[#0A0A0A] dark:border-slate-100 shadow-[8px_8px_0px_0px_rgba(10,10,10,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] w-full max-w-sm max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
            
            {/* REGION 1: MODAL HEADER (Sticky Top) */}
            <div className="shrink-0 px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b-4 border-[#0A0A0A] dark:border-slate-100 flex items-center justify-between transition-colors">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-50">
                  Struk Pembayaran Toko
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-bold">
                  {selectedTransaction.transactionNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-center font-black text-xs transition-colors cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
                title="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* REGION 2: MODAL BODY (Full Pure White Thermal Paper) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 bg-white dark:bg-slate-900 transition-colors">
              {/* Paper Size Switcher */}
              <div className="mb-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 text-slate-600 dark:text-slate-400">
                  Ukuran:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePaperSizeChange("58mm")}
                    className={`px-2.5 py-0.5 text-[11px] font-black rounded-lg border transition-all cursor-pointer ${
                      receiptPaperSize === "58mm"
                        ? "bg-[#FFB800] text-black border-slate-900 shadow-[1px_1px_0px_0px_#000]"
                        : "bg-transparent text-slate-600 dark:text-slate-400 border-transparent"
                    }`}
                  >
                    58mm (Standar)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaperSizeChange("80mm")}
                    className={`px-2.5 py-0.5 text-[11px] font-black rounded-lg border transition-all cursor-pointer ${
                      receiptPaperSize === "80mm"
                        ? "bg-[#FFB800] text-black border-slate-900 shadow-[1px_1px_0px_0px_#000]"
                        : "bg-transparent text-slate-600 dark:text-slate-400 border-transparent"
                    }`}
                  >
                    80mm (Lebar)
                  </button>
                </div>
              </div>

              <ReceiptPreviewCard
                transaction={selectedTransactionSummary}
                cashierName={selectedTransaction?.cashierName || "Kasir"}
              />
            </div>

            {/* REGION 3: MODAL FOOTER (Sticky Bottom) */}
            <div className="shrink-0 px-4 py-3 bg-white dark:bg-slate-900 border-t-4 border-[#0A0A0A] dark:border-slate-100 flex items-center justify-end gap-2.5 z-20 transition-colors">
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs px-3.5 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-colors cursor-pointer"
              >
                Tutup
              </button>

              <button
                type="button"
                onClick={handlePrintReceipt}
                className="bg-[#FF8C00] hover:bg-[#E67E00] text-black font-black text-xs px-4 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>🖨️ Cetak Struk ({receiptPaperSize})</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
