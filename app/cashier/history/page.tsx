"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Transaction } from "@/types/transaction.types";
import { transactionService } from "@/services/transaction.service";

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

export default function CashierHistoryPage() {
  // State Utama Data Transaksi
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("ALL");

  // Modal Detail & Struk State
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Load transactions from service layer
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await transactionService.getTransactions({
        search: searchQuery,
      });
      setTransactions(data);
    } catch (err: any) {
      console.error("Gagal memuat riwayat transaksi:", err);
      setFetchError(
        err.message || "Gagal terhubung ke server. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Quick Metrics Computation
  const totalTransactionsCount = transactions.length;

  const totalRevenue = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (t.total || 0), 0);
  }, [transactions]);

  const averageBasketSize = useMemo(() => {
    if (totalTransactionsCount === 0) return 0;
    return Math.round(totalRevenue / totalTransactionsCount);
  }, [totalRevenue, totalTransactionsCount]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !searchQuery.trim() ||
        t.transactionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.cashierId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMethod =
        selectedPaymentMethod === "ALL" || t.paymentMethod === selectedPaymentMethod;

      return matchesSearch && matchesMethod;
    });
  }, [transactions, searchQuery, selectedPaymentMethod]);

  // Trigger Print Receipt
  const handlePrintReceipt = () => {
    window.print();
  };

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] uppercase tracking-wider">
                Kasir POS
              </span>
              <span className="text-xs text-slate-400">• Histori</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Riwayat Transaksi Penjualan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Daftar seluruh transaksi kasir, detail item belanja, status pembayaran, dan cetak ulang struk thermal.
            </p>
          </div>

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
            <span>Refresh Data</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. QUICK METRICS CARDS                                                    */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Transaksi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Transaksi
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                {totalTransactionsCount}{" "}
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
                {formatRupiah(totalRevenue)}
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
                {formatRupiah(averageBasketSize)}
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
        {/* 3. TOOLBAR SEARCH & FILTER                                                */}
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
              placeholder="Cari berdasarkan Nomor Invoice (TRX-...) atau ID Kasir..."
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

          {/* Payment Method Filter Dropdown */}
          <div className="flex items-center gap-2 min-w-[200px]">
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

        {/* ========================================================================= */}
        {/* 4. TABEL RIWAYAT TRANSAKSI                                                */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Memuat riwayat transaksi...</p>
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
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <p className="text-sm font-bold text-slate-800">
                Belum ada data transaksi.
              </p>
              <p className="text-xs text-slate-400">
                Transaksi penjualan yang dilakukan melalui mesin kasir akan tercatat di sini.
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
                  {filteredTransactions.map((trx) => {
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
                            {trx.cashierId || "Kasir Utama"}
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
      {/* 5. MODAL DETAIL & REPRINT STRUK THERMAL (3 Regi Wrapper: Header, Body, Footer) */}
      {/* ========================================================================= */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 print-backdrop">
          {/* Modal Card Wrapper: Max Height 85vh dengan Layout Flex Col */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-[380px] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print-modal-card">
            
            {/* REGION 1: MODAL HEADER (Sticky / Fixed Top - Disembunyikan saat print) */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 no-print">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Struk Pembayaran
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

            {/* REGION 2: MODAL BODY (Scrollable Middle - scroll mandiri jika item panjang) */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-200/70 flex justify-center print-body-container">
              {/* Physical Receipt Card dengan id printable-receipt */}
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
                    <span>{selectedTransaction.cashierId || "Kasir 1"}</span>
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

            {/* REGION 3: MODAL FOOTER (Sticky / Fixed Bottom - Disembunyikan saat print) */}
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
