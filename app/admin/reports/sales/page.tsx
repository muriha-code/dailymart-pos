"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  SalesReportResponse,
  TransactionReportItem,
} from "@/types/salesReport.types";
import { salesReportService } from "@/services/salesReport.service";
import Pagination from "@/components/common/Pagination";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

// Helper Rupiah
const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

// Helper Export CSV
const exportTransactionsCSV = (data: TransactionReportItem[]) => {
  if (!data || data.length === 0) {
    alert("Tidak ada data transaksi untuk diekspor!");
    return;
  }

  const headers = [
    "No",
    "No. Invoice",
    "Tanggal & Waktu",
    "Kasir",
    "Metode Pembayaran",
    "Jumlah Item",
    "Subtotal",
    "Diskon",
    "Grand Total",
  ];

  const rows = data.map((item, index) => [
    index + 1,
    `"${item.invoiceNumber}"`,
    `"${item.date}"`,
    `"${item.cashierName}"`,
    `"${item.paymentMethod}"`,
    item.itemsCount,
    item.subtotal,
    item.discountTotal,
    item.grandTotal,
  ]);

  const csvString = [
    "sep=,",
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvString], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `Laporan_Penjualan_DailyMart_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function AdminSalesReportPage() {
  // Session User
  const [user, setUser] = useState<{ displayName?: string; name?: string } | null>(null);

  // Data States
  const [reportData, setReportData] = useState<SalesReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [seedingLoading, setSeedingLoading] = useState<boolean>(false);

  // Dropdown Action State
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter States
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  // Load Active Session User
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setUser(json.data);
          }
        }
      } catch (e) {
        console.warn("Failed fetching session user:", e);
      }
    }
    fetchSession();
  }, []);

  const staffName = user?.displayName || user?.name || "Administrator Retail";

  // Load Sales Report Data
  const loadSalesReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await salesReportService.getSalesReport({
        period: periodFilter as any,
        startDate: periodFilter === "custom" ? startDate : undefined,
        endDate: periodFilter === "custom" ? endDate : undefined,
        paymentMethod: paymentFilter !== "ALL" ? paymentFilter : undefined,
      });
      setReportData(data);
    } catch (err: any) {
      console.error("Gagal memuat laporan penjualan:", err);
      setError(
        err.message || "Gagal terhubung ke database server. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  }, [periodFilter, startDate, endDate, paymentFilter]);

  useEffect(() => {
    loadSalesReport();
  }, [loadSalesReport]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [periodFilter, startDate, endDate, paymentFilter, searchQuery]);

  // Filtered Transaction List (Search)
  const filteredTransactions = useMemo(() => {
    if (!reportData?.transactions) return [];
    if (!searchQuery.trim()) return reportData.transactions;

    const query = searchQuery.toLowerCase().trim();
    return reportData.transactions.filter(
      (tx) =>
        tx.invoiceNumber.toLowerCase().includes(query) ||
        tx.cashierName.toLowerCase().includes(query) ||
        tx.paymentMethod.toLowerCase().includes(query)
    );
  }, [reportData, searchQuery]);

  // Paginated Transactions
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // Handle Seeder
  const handleTriggerSeeder = async () => {
    setSeedingLoading(true);
    try {
      await salesReportService.seedTransactions();
      await loadSalesReport();
      alert("Data sampel transaksi berhasil ditambahkan ke database!");
    } catch (err: any) {
      alert("Gagal seeding data transaksi: " + (err.message || err));
    } finally {
      setSeedingLoading(false);
    }
  };

  // Tutup dropdown jika klik di luar area
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Print PDF
  const handlePrintPDF = () => {
    setIsExportOpen(false);
    window.print();
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    setIsExportOpen(false);
    if (reportData?.transactions) {
      exportTransactionsCSV(reportData.transactions);
    }
  };

  const periodText =
    periodFilter === "today"
      ? "Hari Ini"
      : periodFilter === "7days"
      ? "7 Hari Terakhir"
      : periodFilter === "thisMonth"
      ? "Bulan Ini"
      : periodFilter === "thisYear"
      ? "Tahun Ini"
      : periodFilter === "custom"
      ? `Kustom (${startDate || "-"} s/d ${endDate || "-"})`
      : "Semua Waktu";

  // Colors for charts
  const METHOD_COLORS: Record<string, string> = {
    CASH: "#10B981", // Emerald
    QRIS: "#3B82F6", // Blue
    DEBIT: "#F59E0B", // Amber
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 lg:p-6 print:p-0 print:bg-white print:m-0 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:w-full print:m-0 print:space-y-4">
        {/* ========================================================================= */}
        {/* 1. KOP SURAT FORMAL & TEKS RINGKASAN (CETAK PDF)                           */}
        {/* ========================================================================= */}
        <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black tracking-wider text-slate-900 uppercase">
                DAILYMART POS
              </h1>
              <p className="text-[11px] text-slate-700 font-medium">
                Sistem Manajemen Kasir & Logistik Retail
              </p>
              <p className="text-[10px] text-slate-500">
                Jl. Retail Utama No. 88, Jakarta Selatan
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                LAPORAN PENJUALAN RETAIL
              </h2>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Tanggal Cetak:{" "}
                {new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                pukul{" "}
                {new Date().toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-[10px] text-slate-600">
                Periode: <strong>{periodText}</strong>
              </p>
              <p className="text-[10px] font-semibold text-slate-800 mt-0.5">
                Dicetak Oleh: <span className="underline">{staffName}</span>
              </p>
            </div>
          </div>

          {/* Ringkasan Teks Laporan Cetak */}
          {reportData && (
            <div className="mt-3 py-1.5 px-3 border border-slate-300 rounded bg-slate-50/50 text-[10px] flex items-center justify-between text-slate-700">
              <span>
                • Total Omset:{" "}
                <strong className="text-slate-900">
                  {formatRupiah(reportData.summary.totalRevenue)}
                </strong>
              </span>
              <span>
                • Total Transaksi:{" "}
                <strong className="text-slate-900">
                  {reportData.summary.totalTransactions} Transaksi
                </strong>
              </span>
              <span>
                • Total Unit Terjual:{" "}
                <strong className="text-slate-900">
                  {reportData.summary.totalItemsSold} Unit
                </strong>
              </span>
              <span>
                • Rata-rata Transaksi (AOV):{" "}
                <strong className="text-slate-900">
                  {formatRupiah(reportData.summary.averageTransactionValue)}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. HEADER INTERAKTIF & TOMBOL AKSI                                         */}
        {/* ========================================================================= */}
        <div className="print:hidden">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Laporan Penjualan & Performa Retail
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Monitoring omset penjualan, tren grafik harian, analisis metode pembayaran, dan produk terlaris.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Unified Export Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0F172A] hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Cetak</span>
                  <svg className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu Modal */}
                {isExportOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-1.5 shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {/* Opsi 1: Cetak / Simpan PDF (Nuansa Merah) */}
                    <button
                      type="button"
                      onClick={handlePrintPDF}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-rose-50 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-rose-900">Cetak Dokumen (PDF)</div>
                        <div className="text-[10px] text-slate-500">Format formal A4 Landscape</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {/* Opsi 2: Ekspor CSV Excel (Nuansa Hijau) */}
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-emerald-50 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">Ekspor CSV (Excel)</div>
                        <div className="text-[10px] text-slate-500">Unduh lembar kerja mentah (.csv)</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={loadSalesReport}
                title="Refresh Data"
                className="p-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
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
              </button>
            </div>
          </div>

          {/* 4 Card KPI Ringkasan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Omset Penjualan
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono">
                  {formatRupiah(reportData?.summary.totalRevenue || 0)}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Transaksi
                </span>
                <span className="text-2xl font-black text-blue-600 mt-1 block font-mono">
                  {reportData?.summary.totalTransactions || 0}{" "}
                  <span className="text-xs font-normal text-slate-400">transaksi</span>
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Unit Terjual
                </span>
                <span className="text-2xl font-black text-amber-600 mt-1 block font-mono">
                  {reportData?.summary.totalItemsSold || 0}{" "}
                  <span className="text-xs font-normal text-slate-400">unit</span>
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Rata-rata Transaksi (AOV)
                </span>
                <span className="text-2xl font-black text-purple-600 mt-1 block font-mono">
                  {formatRupiah(reportData?.summary.averageTransactionValue || 0)}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          {/* TOOLBAR FILTER PERIODE & METODE BAYAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1.5 min-w-[150px]">
                <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Periode:</label>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="thisMonth">Bulan Ini</option>
                  <option value="thisYear">Tahun Ini</option>
                  <option value="custom">Kustom Tanggal</option>
                </select>
              </div>

              {periodFilter === "custom" && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                  <span className="text-xs text-slate-400">s/d</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                  />
                </div>
              )}

              <div className="flex items-center gap-1.5 min-w-[150px]">
                <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Pembayaran:</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="ALL">Semua Pembayaran</option>
                  <option value="CASH">CASH (Tunai)</option>
                  <option value="QRIS">QRIS</option>
                  <option value="DEBIT">KARTU DEBIT</option>
                </select>
              </div>
            </div>

            <div className="relative min-w-[220px]">
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
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
                placeholder="Cari No. Invoice / Kasir..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. VISUALISASI GRAFIK RECHARTS (SEMBUNYI SAAT CETAK)                       */}
        {/* ========================================================================= */}
        <div className="print:hidden grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Grafik Tren Omset Penjualan (2 Kolom) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Grafik Tren Omset Penjualan
              </h2>
              <p className="text-xs text-slate-500">
                Grafik fluktuasi omset harian per tanggal transaksi
              </p>
            </div>

            <div className="w-full h-64">
              {reportData?.dailyChart && reportData.dailyChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportData.dailyChart}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(v) => `Rp ${(v / 1000)}k`} />
                    <Tooltip
                      formatter={(val: any) => [formatRupiah(Number(val)), "Omset Penjualan"]}
                      labelFormatter={(lbl) => `Tanggal: ${lbl}`}
                      contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", color: "#FFF", fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10B981"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Belum ada data grafik untuk periode ini.
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Metode Pembayaran (1 Kolom) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Metode Pembayaran
              </h2>
              <p className="text-xs text-slate-500">
                Distribusi total omset berdasarkan jenis pembayaran
              </p>
            </div>

            <div className="w-full h-44 mb-3">
              {reportData?.paymentBreakdown && reportData.paymentBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.paymentBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `Rp ${(v / 1000)}k`} />
                    <YAxis dataKey="method" type="category" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#1E293B' }} />
                    <Tooltip
                      formatter={(val: any) => [formatRupiah(Number(val)), "Total Pembayaran"]}
                      contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", color: "#FFF", fontSize: "12px" }}
                    />
                    <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                      {reportData.paymentBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={METHOD_COLORS[entry.method] || "#3B82F6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Tidak ada data metode bayar.
                </div>
              )}
            </div>

            {/* List Persentase Pembayaran */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {reportData?.paymentBreakdown.map((pb) => (
                <div key={pb.method} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: METHOD_COLORS[pb.method] || "#3B82F6" }}
                    />
                    <span className="font-bold text-slate-800">{pb.method}</span>
                    <span className="text-[10px] text-slate-400">({pb.count} tx)</span>
                  </div>
                  <div className="font-mono text-slate-900 font-semibold">
                    {formatRupiah(pb.amount)}{" "}
                    <span className="text-slate-400 font-normal">({pb.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. PRODUK TERLARIS (TOP 5 PRODUCTS)                                       */}
        {/* ========================================================================= */}
        {reportData?.topProducts && reportData.topProducts.length > 0 && (
          <div className="print:hidden bg-white p-5 rounded-2xl border border-slate-200 shadow-xs mb-6">
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">
                🔥 5 Produk Terlaris (Top Selling Products)
              </h2>
              <p className="text-xs text-slate-500">
                Daftar produk dengan kontribusi omset penjualan tertinggi
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Kode SKU</th>
                    <th className="py-2.5 px-3">Nama Produk</th>
                    <th className="py-2.5 px-3 text-center">Qty Terjual</th>
                    <th className="py-2.5 px-3 text-right">Total Contributed Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.topProducts.map((p, idx) => (
                    <tr key={p.productId || idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-600">
                        {p.sku}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {p.productName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-extrabold text-blue-600">
                        {p.quantitySold} unit
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-600">
                        {formatRupiah(p.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. TABEL DAFTAR TRANSAKSI DETAIL                                          */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-400 print:rounded-none print:shadow-none">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Memuat data transaksi penjualan...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600 space-y-3">
              <p className="text-sm font-bold">{error}</p>
              <button
                type="button"
                onClick={loadSalesReport}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p className="text-sm font-bold text-slate-800">
                Belum ada transaksi penjualan yang tercatat pada periode ini.
              </p>
              <p className="text-xs text-slate-400">
                Klik tombol seeder di bawah untuk mengisi sampel data transaksi penjualan.
              </p>
              <button
                type="button"
                onClick={handleTriggerSeeder}
                disabled={seedingLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
              >
                {seedingLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Generate Data Dummy Transaksi (Seeder)</span>
              </button>
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              {/* Screen Table (Paginated) */}
              <div className="print:hidden">
                <table className="w-full table-fixed text-left border-collapse text-xs text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="w-[20%] px-3 py-3">No. Invoice</th>
                      <th className="w-[20%] px-3 py-3">Tanggal & Waktu</th>
                      <th className="w-[18%] px-3 py-3">Kasir</th>
                      <th className="w-[14%] px-3 py-3 text-center">Metode Bayar</th>
                      <th className="w-[10%] px-2 py-3 text-center">Item</th>
                      <th className="w-[18%] px-3 py-3 text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-3 py-3 align-top font-mono font-bold text-slate-900">
                          {tx.invoiceNumber}
                        </td>
                        <td className="px-3 py-3 align-top text-slate-600">
                          {tx.date}
                        </td>
                        <td className="px-3 py-3 align-top font-semibold text-slate-800">
                          {tx.cashierName}
                        </td>
                        <td className="px-3 py-3 align-top text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                              tx.paymentMethod === "CASH"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : tx.paymentMethod === "QRIS"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="px-2 py-3 align-top text-center font-mono font-semibold text-slate-700">
                          {tx.itemsCount} pcs
                        </td>
                        <td className="px-3 py-3 align-top text-right font-mono font-black text-slate-900">
                          {formatRupiah(tx.grandTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Print Table (Full Records without Pagination) */}
              <div className="hidden print:block">
                <table className="w-full table-fixed text-left border-collapse text-xs print:text-[9.5px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 font-bold uppercase text-slate-700">
                      <th className="w-[5%] px-2 py-2 text-center">No</th>
                      <th className="w-[22%] px-2.5 py-2">No. Invoice</th>
                      <th className="w-[22%] px-2 py-2">Waktu</th>
                      <th className="w-[20%] px-2 py-2">Kasir</th>
                      <th className="w-[13%] px-2 py-2 text-center">Metode</th>
                      <th className="w-[18%] px-2.5 py-2 text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {filteredTransactions.map((tx, idx) => (
                      <tr key={tx.id}>
                        <td className="px-2 py-2 text-center text-slate-500">{idx + 1}</td>
                        <td className="px-2.5 py-2 font-mono font-semibold text-slate-900">{tx.invoiceNumber}</td>
                        <td className="px-2 py-2 text-slate-600">{tx.date}</td>
                        <td className="px-2 py-2 font-medium text-slate-800">{tx.cashierName}</td>
                        <td className="px-2 py-2 text-center font-bold text-slate-700">{tx.paymentMethod}</td>
                        <td className="px-2.5 py-2 text-right font-mono font-bold text-slate-900">{formatRupiah(tx.grandTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Integrated Reusable Pagination */}
          <div className="print:hidden">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredTransactions.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. LEMBAR TANDA TANGAN FORMAL (HANYA MUNCUL SAAT CETAK)                   */}
        {/* ========================================================================= */}
        <div className="hidden print:grid grid-cols-2 mt-10 pt-2 text-xs text-slate-800">
          <div className="flex flex-col items-center text-center">
            <p className="invisible select-none text-[11px] leading-tight">
              Jakarta, 00 Bulan 0000
            </p>
            <p className="font-medium text-slate-700 mt-1 leading-tight">Dibuat Oleh,</p>
            <div className="h-20 w-full" />
            <p className="font-bold text-slate-900 underline uppercase tracking-wide leading-none">
              ( {staffName} )
            </p>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-none">Administrator Retail</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <p className="text-slate-700 text-[11px] leading-tight">
              Jakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="font-medium text-slate-700 mt-1 leading-tight">Disetujui Oleh,</p>
            <div className="h-20 w-full" />
            <p className="font-bold text-slate-900 underline tracking-wide leading-none">
              ( .................................................... )
            </p>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-none">Store Manager / Owner</p>
          </div>
        </div>
      </div>

      {/* Global Print Styling */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          aside, nav, header, .sidebar, button, input, select {
            display: none !important;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
