"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  CashFlowReportResponse,
  DailyCashFlowBreakdown,
} from "@/types/cashFlowReport.types";
import { cashFlowReportService } from "@/services/cashFlowReport.service";
import Pagination from "@/components/common/Pagination";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Helper Rupiah Formatter
const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

// Helper Export CSV
const exportCashFlowCSV = (data: DailyCashFlowBreakdown[], periodLabel: string) => {
  if (!data || data.length === 0) {
    alert("Tidak ada data arus kas untuk diekspor!");
    return;
  }

  const headers = [
    "No",
    "Tanggal / Periode",
    "Total Transaksi",
    "Pendapatan Kotor (Rp)",
    "HPP / Modal Pokok (Rp)",
    "Laba Kotor (Rp)",
    "Profit Margin (%)",
  ];

  const rows = data.map((item, index) => [
    index + 1,
    `"${item.formattedDate}"`,
    item.transactionCount,
    item.grossRevenue,
    item.totalCogs,
    item.grossProfit,
    item.margin,
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
    `Laporan_Arus_Kas_DailyMart_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Category Donut Chart Colors Palette
const DONUT_COLORS = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#64748b", // Slate
];

export default function AdminCashFlowReportPage() {
  // Active User Session
  const [user, setUser] = useState<{ displayName?: string; name?: string } | null>(null);

  // Data States
  const [reportData, setReportData] = useState<CashFlowReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown Export Action State
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter States
  const [periodFilter, setPeriodFilter] = useState<string>("30days");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  // Load User Session
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

  // Fetch Report Data
  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await cashFlowReportService.getCashFlowReport({
        period: periodFilter,
        startDate: periodFilter === "custom" ? startDate : undefined,
        endDate: periodFilter === "custom" ? endDate : undefined,
        categoryId: categoryFilter,
      });
      setReportData(data);
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Error loading cash flow report:", err);
      setError(err.message || "Gagal memuat data laporan arus kas.");
    } finally {
      setIsLoading(false);
    }
  }, [periodFilter, startDate, endDate, categoryFilter]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Handle Outside Click for Dropdown Export
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtered & Paginated Daily Breakdown Table Data
  const dailyList = useMemo(() => {
    return reportData?.dailyBreakdown || [];
  }, [reportData]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return dailyList.slice(start, start + ITEMS_PER_PAGE);
  }, [dailyList, currentPage]);

  // Print PDF Trigger
  const handlePrintPDF = () => {
    setIsExportOpen(false);
    window.print();
  };

  // CSV Trigger
  const handleExportCSV = () => {
    setIsExportOpen(false);
    exportCashFlowCSV(dailyList, periodFilter);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 lg:p-6 print:p-0 print:bg-white print:m-0 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:w-full print:m-0 print:space-y-4">
        
        {/* ==================== PRINT ONLY HEADER (KOP SURAT A4 PORTRAIT) ==================== */}
        <div className="hidden print:block mb-4 border-b-2 border-slate-900 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">DAILYMART POS</h1>
              <p className="text-xs text-slate-600">Laporan Resmi Arus Kas & Laba Rugi Operasional</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Jl. Raya Utama No. 88, Jakarta Selatan • Telp: (021) 555-0199
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-800 rounded border border-slate-300">
                DOKUMEN FINANSIAL
              </span>
              <p className="text-[10px] text-slate-500 mt-1">
                Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-[10px] text-slate-500">
                Oleh: {user?.displayName || user?.name || "Admin Finance"}
              </p>
            </div>
          </div>

          {/* Baris Ringkasan Teks Horizontal Finansial */}
          <div className="mt-3 pt-2 border-t border-slate-300 flex items-center justify-between text-[11px] font-medium text-slate-800 bg-slate-50 px-3 py-1.5 rounded">
            <span>• <strong className="font-semibold text-slate-900">Pendapatan Kotor:</strong> {formatRupiah(reportData?.summary.grossRevenue || 0)}</span>
            <span className="text-slate-400">|</span>
            <span>• <strong className="font-semibold text-slate-900">Total HPP:</strong> {formatRupiah(reportData?.summary.totalCogs || 0)}</span>
            <span className="text-slate-400">|</span>
            <span>• <strong className="font-semibold text-slate-900">Laba Kotor:</strong> {formatRupiah(reportData?.summary.grossProfit || 0)}</span>
            <span className="text-slate-400">|</span>
            <span>• <strong className="font-semibold text-slate-900">Rata-rata Margin:</strong> {(reportData?.summary.marginPercentage || 0).toFixed(2)}%</span>
          </div>
        </div>

        {/* ==================== SCREEN HEADER & NAVIGATION ==================== */}
        <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Laporan Arus Kas & Pendapatan Admin
                </h1>
                <p className="text-xs text-slate-500">
                  Ringkasan finansial omzet penjualan, HPP (COGS), laba kotor, dan margin profit toko
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons: Integrated Cetak Dropdown & Circular Refresh */}
          <div className="flex items-center gap-2.5 self-end md:self-auto">
            {/* Integrated Print/Export Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-full bg-[#0F172A] hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Cetak</span>
                <svg className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu Card */}
              {isExportOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-3xl bg-white p-3 shadow-2xl border border-slate-100/80 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
                  {/* Opsi 1: Cetak Dokumen (PDF) */}
                  <button
                    type="button"
                    onClick={handlePrintPDF}
                    className="w-full flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-rose-50/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug group-hover:text-rose-900">
                        Cetak Dokumen (PDF)
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-400 font-normal leading-snug">
                        Format formal A4 Portrait
                      </div>
                    </div>
                  </button>

                  <div className="border-b border-slate-100 my-1 mx-2" />

                  {/* Opsi 2: Ekspor CSV (Excel) */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full flex items-center gap-3.5 p-2.5 rounded-2xl hover:bg-emerald-50/60 text-left transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug group-hover:text-emerald-900">
                        Ekspor CSV (Excel)
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-400 font-normal leading-snug">
                        Unduh lembar kerja mentah (.csv)
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Circular Refresh Button */}
            <button
              type="button"
              onClick={loadReportData}
              disabled={isLoading}
              title="Refresh Data"
              className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* ==================== FILTER & CONTROL BAR ==================== */}
        <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Rentang Periode Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Periode:</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              >
                <option value="today">Hari Ini</option>
                <option value="7days">7 Hari Terakhir</option>
                <option value="30days">30 Hari Terakhir</option>
                <option value="thisMonth">Bulan Ini</option>
                <option value="all">Semua Waktu</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>

            {/* Custom Date Picker */}
            {periodFilter === "custom" && (
              <div className="flex items-center gap-2 animate-in fade-in duration-200">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-xs text-slate-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            )}

            {/* Filter Kategori Produk */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Kategori:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              >
                {reportData?.categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                )) || <option value="ALL">Semua Kategori</option>}
              </select>
            </div>
          </div>
        </div>

        {/* ==================== 4 KPI FINANSIAL CARDS ==================== */}
        <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Pendapatan Kotor */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between print:p-3 print:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pendapatan Kotor
              </span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-600 print:hidden">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                {isLoading ? "..." : formatRupiah(reportData?.summary.grossRevenue || 0)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Akumulasi penjualan sukses</p>
            </div>
          </div>

          {/* Card 2: Total HPP / COGS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between print:p-3 print:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total HPP / COGS
              </span>
              <span className="p-2 rounded-xl bg-slate-100 text-slate-600 print:hidden">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-xl lg:text-2xl font-bold text-slate-600 font-mono tracking-tight">
                {isLoading ? "..." : formatRupiah(reportData?.summary.totalCogs || 0)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">Modal pokok barang terjual</p>
            </div>
          </div>

          {/* Card 3: Laba Kotor */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs flex flex-col justify-between print:p-3 print:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Laba Kotor
              </span>
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700 print:hidden">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-3">
              <h3 className="text-xl lg:text-2xl font-extrabold text-emerald-600 tracking-tight">
                {isLoading ? "..." : formatRupiah(reportData?.summary.grossProfit || 0)}
              </h3>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">Gross Revenue - Total HPP</p>
            </div>
          </div>

          {/* Card 4: Profit Margin Rata-rata */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between print:p-3 print:border-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Rata-rata Margin
              </span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600 print:hidden">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                  {isLoading ? "..." : `${(reportData?.summary.marginPercentage || 0).toFixed(2)}%`}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                  {(reportData?.summary.marginPercentage || 0) >= 20 ? "Sehat" : "Moderasi"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">(Laba Kotor / Revenue) × 100%</p>
            </div>
          </div>
        </div>

        {/* ==================== CHARTS SECTION (SCREEN ONLY) ==================== */}
        <div className="print:hidden grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Grafik Kiri: Composed Bar Chart Tren Harian (65% width -> lg:col-span-8) */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tren Finansial Harian</h3>
                <p className="text-xs text-slate-500">
                  Perbandingan Pendapatan vs HPP (Modal) vs Laba Kotor
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-blue-500 inline-block" /> Pendapatan
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-slate-400 inline-block" /> HPP
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" /> Laba Kotor
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                Memuat grafik...
              </div>
            ) : reportData?.chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                Tidak ada data grafik pada periode ini.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reportData?.chartData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      tickFormatter={(val) => `Rp${(val / 1000000).toFixed(1)}M`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-800">
                              <p className="font-bold text-slate-300 mb-1 border-b border-slate-800 pb-1">
                                {label}
                              </p>
                              <p className="text-blue-400 font-semibold">
                                Revenue: {formatRupiah(Number(payload[0]?.value || 0))}
                              </p>
                              <p className="text-slate-400 font-semibold">
                                HPP: {formatRupiah(Number(payload[1]?.value || 0))}
                              </p>
                              <p className="text-emerald-400 font-bold">
                                Profit: {formatRupiah(Number(payload[2]?.value || 0))}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="cogs" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="profit" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Grafik Kanan: Pie/Donut Chart Distribusi Kontribusi Laba per Kategori (35% width -> lg:col-span-4) */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Kontribusi Laba per Kategori</h3>
              <p className="text-xs text-slate-500">Distribusi proporsi laba kotor kategori produk</p>
            </div>

            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                Memuat kategori...
              </div>
            ) : reportData?.categoryProfit.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                Tidak ada data kategori.
              </div>
            ) : (
              <div className="h-60 w-full relative my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData?.categoryProfit}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={3}
                    >
                      {reportData?.categoryProfit.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatRupiah(Number(val)), "Laba Kotor"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Dynamic Legend List */}
            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {reportData?.categoryProfit.map((item, idx) => {
                const totalProf = reportData.summary.grossProfit || 1;
                const pct = ((item.value / totalProf) * 100).toFixed(1);
                return (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                      />
                      <span className="text-slate-700 truncate font-medium">{item.name}</span>
                    </span>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-slate-900">{formatRupiah(item.value)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ==================== TABEL RINGKASAN ARUS KAS HARIAN (100% FIT-WIDTH NO SCROLL) ==================== */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-400 print:rounded-none print:shadow-none">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:p-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Rekapitulasi Arus Kas & Margin Harian</h3>
              <p className="text-xs text-slate-500 print:text-[10px]">
                Rincian transaksi, omzet, modal HPP, dan laba kotor per tanggal
              </p>
            </div>
            <span className="text-xs text-slate-500 print:hidden font-medium">
              Total {dailyList.length} Periode Hari
            </span>
          </div>

          {error ? (
            <div className="p-8 text-center text-xs text-red-600 bg-red-50">
              {error}
            </div>
          ) : isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Memuat tabel arus kas...
            </div>
          ) : dailyList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Tidak ada data arus kas untuk filter yang dipilih.
            </div>
          ) : (
            <>
              {/* Screen Version (100% Fit Width Table) */}
              <div className="w-full print:hidden">
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-3 px-4 w-[18%]">Tanggal / Periode</th>
                      <th className="py-3 px-4 w-[12%] text-center">Total Transaksi</th>
                      <th className="py-3 px-4 w-[20%] text-right font-semibold">Pendapatan Kotor</th>
                      <th className="py-3 px-4 w-[18%] text-right text-slate-600 font-mono">HPP / Modal Pokok</th>
                      <th className="py-3 px-4 w-[18%] text-right font-bold text-emerald-700">Laba Kotor</th>
                      <th className="py-3 px-4 w-[14%] text-center font-semibold">Margin (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900 w-[18%]">
                          {row.formattedDate}
                        </td>
                        <td className="py-3 px-4 text-center w-[12%]">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {row.transactionCount} tx
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900 w-[20%]">
                          {formatRupiah(row.grossRevenue)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono w-[18%]">
                          {formatRupiah(row.totalCogs)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 w-[18%]">
                          {formatRupiah(row.grossProfit)}
                        </td>
                        <td className="py-3 px-4 text-center w-[14%]">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                              row.margin >= 25
                                ? "bg-emerald-100 text-emerald-800"
                                : row.margin >= 15
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {row.margin.toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalItems={dailyList.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              </div>

              {/* Print Only Version (Complete Full List Table for PDF) */}
              <div className="hidden print:block">
                <table className="w-full table-fixed text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-200 border-b border-slate-400 text-slate-900 font-bold">
                      <th className="py-1.5 px-2 w-[5%] text-center">No</th>
                      <th className="py-1.5 px-2 w-[22%]">Tanggal / Periode</th>
                      <th className="py-1.5 px-2 w-[13%] text-center">Jumlah Transaksi</th>
                      <th className="py-1.5 px-2 w-[20%] text-right">Pendapatan Kotor</th>
                      <th className="py-1.5 px-2 w-[18%] text-right">HPP / Modal Pokok</th>
                      <th className="py-1.5 px-2 w-[14%] text-right">Laba Kotor</th>
                      <th className="py-1.5 px-2 w-[8%] text-center">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {dailyList.map((row, idx) => (
                      <tr key={row.date}>
                        <td className="py-1.5 px-2 text-center text-slate-600">{idx + 1}</td>
                        <td className="py-1.5 px-2 font-medium text-slate-900">{row.formattedDate}</td>
                        <td className="py-1.5 px-2 text-center text-slate-700">{row.transactionCount}</td>
                        <td className="py-1.5 px-2 text-right font-medium">{formatRupiah(row.grossRevenue)}</td>
                        <td className="py-1.5 px-2 text-right text-slate-600">{formatRupiah(row.totalCogs)}</td>
                        <td className="py-1.5 px-2 text-right font-bold text-slate-900">{formatRupiah(row.grossProfit)}</td>
                        <td className="py-1.5 px-2 text-center font-bold text-slate-800">{row.margin.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-800 font-bold text-slate-900">
                      <td colSpan={3} className="py-2 px-2 text-right">TOTAL KESELURUHAN:</td>
                      <td className="py-2 px-2 text-right">{formatRupiah(reportData?.summary.grossRevenue || 0)}</td>
                      <td className="py-2 px-2 text-right">{formatRupiah(reportData?.summary.totalCogs || 0)}</td>
                      <td className="py-2 px-2 text-right text-emerald-700">{formatRupiah(reportData?.summary.grossProfit || 0)}</td>
                      <td className="py-2 px-2 text-center">{(reportData?.summary.marginPercentage || 0).toFixed(1)}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ==================== PRINT ONLY SIGNATURE SECTION (A4 PORTRAIT 2 COLUMNS) ==================== */}
        <div className="hidden print:grid grid-cols-2 mt-8 pt-4 text-xs text-slate-800 border-t border-slate-300">
          <div className="flex flex-col items-center text-center">
            <p className="invisible text-[11px] leading-tight">
              Jakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="font-medium text-slate-700 mt-1 leading-tight">Dibuat & Diverifikasi Oleh,</p>
            <div className="h-16 w-full" />
            <p className="font-bold text-slate-900 underline tracking-wide leading-none">
              ( {user?.displayName || user?.name || "Admin / Finance"} )
            </p>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-none">Bagian Keuangan DailyMart POS</p>
          </div>

          <div className="flex flex-col items-center text-center">
            <p className="text-slate-700 text-[11px] leading-tight">
              Jakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="font-medium text-slate-700 mt-1 leading-tight">Disetujui Oleh,</p>
            <div className="h-16 w-full" />
            <p className="font-bold text-slate-900 underline tracking-wide leading-none">
              ( .................................................... )
            </p>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-none">Store Manager / Owner</p>
          </div>
        </div>

      </div>

      {/* Global CSS for Print Optimization */}
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
