"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  StockOpnameReportResponse,
  StockOpnameAuditItem,
} from "@/types/stockOpnameReport.types";
import { stockOpnameReportService } from "@/services/stockOpnameReport.service";
import Pagination from "@/components/common/Pagination";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

// Helper Rupiah
const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

// Helper Export CSV
const exportAuditsCSV = (data: StockOpnameAuditItem[]) => {
  if (!data || data.length === 0) {
    alert("Tidak ada data audit untuk diekspor!");
    return;
  }

  const headers = [
    "No",
    "Kode Audit",
    "Tanggal & Waktu",
    "Kode SKU",
    "Nama Produk",
    "Auditor",
    "Stok Sistem",
    "Stok Fisik",
    "Selisih Unit",
    "Dampak Nilai (Rp)",
    "Catatan Alasan",
  ];

  const rows = data.map((item, index) => [
    index + 1,
    `"${item.auditCode}"`,
    `"${item.date}"`,
    `"${item.sku}"`,
    `"${item.productName.replace(/"/g, '""')}"`,
    `"${item.auditorName}"`,
    item.systemStock,
    item.physicalStock,
    item.diff,
    item.impactValueRp,
    `"${item.notes.replace(/"/g, '""')}"`,
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
    `Laporan_Stock_Opname_DailyMart_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function AdminStockOpnameReportPage() {
  // User Session State
  const [user, setUser] = useState<{ displayName?: string; name?: string } | null>(null);

  // Data States
  const [reportData, setReportData] = useState<StockOpnameReportResponse | null>(null);
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
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Quick View Detail Modal State
  const [selectedAudit, setSelectedAudit] = useState<StockOpnameAuditItem | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  // Load Session User
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

  const staffName = user?.displayName || user?.name || "Auditor Gudang & Logistik";

  // Load Stock Opname Report Data
  const loadStockOpnameReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await stockOpnameReportService.getStockOpnameReport({
        period: periodFilter as any,
        startDate: periodFilter === "custom" ? startDate : undefined,
        endDate: periodFilter === "custom" ? endDate : undefined,
        statusFilter: statusFilter as any,
        search: searchQuery,
      });
      setReportData(data);
    } catch (err: any) {
      console.error("Gagal memuat laporan stock opname:", err);
      setError(
        err.message || "Gagal terhubung ke database server. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  }, [periodFilter, startDate, endDate, statusFilter, searchQuery]);

  useEffect(() => {
    loadStockOpnameReport();
  }, [loadStockOpnameReport]);

  // Click-Outside Listener for Dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [periodFilter, startDate, endDate, statusFilter, searchQuery]);

  // Paginated Audits List
  const paginatedAudits = useMemo(() => {
    if (!reportData?.audits) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return reportData.audits.slice(start, start + ITEMS_PER_PAGE);
  }, [reportData, currentPage]);

  // Handle Seeder
  const handleTriggerSeeder = async () => {
    setSeedingLoading(true);
    try {
      await stockOpnameReportService.seedStockAudits();
      await loadStockOpnameReport();
      alert("Data sampel audit stok berhasil ditambahkan ke database!");
    } catch (err: any) {
      alert("Gagal seeding data audit: " + (err.message || err));
    } finally {
      setSeedingLoading(false);
    }
  };

  // Handle Print PDF
  const handlePrintPDF = () => {
    setIsExportOpen(false);
    window.print();
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    setIsExportOpen(false);
    if (reportData?.audits) {
      exportAuditsCSV(reportData.audits);
    }
  };

  const periodText =
    periodFilter === "today"
      ? "Hari Ini"
      : periodFilter === "7days"
      ? "7 Hari Terakhir"
      : periodFilter === "thisMonth"
      ? "Bulan Ini"
      : periodFilter === "custom"
      ? `Kustom (${startDate || "-"} s/d ${endDate || "-"})`
      : "Semua Waktu";

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
                Sistem Manajemen Kasir & Logistik Gudang
              </p>
              <p className="text-[10px] text-slate-500">
                Jl. Retail Utama No. 88, Jakarta Selatan
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                LAPORAN AUDIT STOCK OPNAME
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
                • Total Item Diaudit:{" "}
                <strong className="text-slate-900">
                  {reportData.summary.totalAudited} Item
                </strong>
              </span>
              <span>
                • Akurasi Stok:{" "}
                <strong className="text-emerald-700">
                  {reportData.summary.accuracyRate}%
                </strong>
              </span>
              <span>
                • Total Loss (Kerugian):{" "}
                <strong className="text-rose-700">
                  {formatRupiah(reportData.summary.totalLossRp)}
                </strong>
              </span>
              <span>
                • Total Surplus:{" "}
                <strong className="text-blue-700">
                  {formatRupiah(reportData.summary.totalSurplusRp)}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. HEADER INTERAKTIF & UNIFIED DROPDOWN                                   */}
        {/* ========================================================================= */}
        <div className="print:hidden">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Laporan Audit Stock Opname
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Analisis hasil verifikasi stok fisik, persentase akurasi, nilai kerugian/surplus, dan temuan selisih.
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
                onClick={loadStockOpnameReport}
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

          {/* 4 CARD KPI RINGKASAN AUDIT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Item Diverifikasi
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                  {reportData?.summary.totalAudited || 0}{" "}
                  <span className="text-xs font-normal text-slate-400">item</span>
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Tingkat Akurasi Stok
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono">
                  {reportData?.summary.accuracyRate || 0}%
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Nilai Kerugian (Loss)
                </span>
                <span className="text-2xl font-black text-rose-600 mt-1 block font-mono">
                  {formatRupiah(reportData?.summary.totalLossRp || 0)}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Nilai Surplus
                </span>
                <span className="text-2xl font-black text-blue-600 mt-1 block font-mono">
                  {formatRupiah(reportData?.summary.totalSurplusRp || 0)}
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          {/* TOOLBAR FILTER PERIODE & STATUS SELISIH */}
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

              <div className="flex items-center gap-1.5 min-w-[160px]">
                <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Status Selisih:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="MATCHED">Sesuai (Match)</option>
                  <option value="DEFICIT">Selisih Kurang (Loss)</option>
                  <option value="SURPLUS">Selisih Lebih (Surplus)</option>
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
                placeholder="Cari Produk, SKU, Auditor..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. VISUALISASI GRAFIK RECHARTS (SEMBUNYI SAAT CETAK)                       */}
        {/* ========================================================================= */}
        <div className="print:hidden grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {/* Donut Chart Komposisi Status Audit (40% Width - 5 Cols) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="mb-2">
              <h2 className="text-base font-bold text-slate-900">
                Komposisi Hasil Audit
              </h2>
              <p className="text-xs text-slate-500">
                Proporsi kesesuaian fisik vs sistem
              </p>
            </div>

            <div className="w-full h-56">
              {reportData?.statusDistribution && reportData.statusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {reportData.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(val: any) => [`${val} Item`, "Jumlah Item"]}
                      contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", color: "#FFF", fontSize: "12px" }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry: any) => (
                        <span className="text-xs font-semibold text-slate-700">
                          {value} ({entry.payload.value})
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Belum ada data audit untuk grafik.
                </div>
              )}
            </div>
          </div>

          {/* Horizontal Bar Chart Top 5 Dampak Selisih Rupiah (60% Width - 7 Cols) */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="mb-2">
              <h2 className="text-base font-bold text-slate-900">
                Top 5 Produk Dampak Selisih (Rp)
              </h2>
              <p className="text-xs text-slate-500">
                Produk dengan nilai nominal selisih terbesar
              </p>
            </div>

            <div className="w-full h-56">
              {reportData?.topDiscrepancies && reportData.topDiscrepancies.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData.topDiscrepancies} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `Rp ${(v / 1000)}k`} />
                    <YAxis dataKey="productName" type="category" width={130} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#1E293B' }} />
                    <RechartsTooltip
                      formatter={(val: any) => [formatRupiah(Number(val)), "Dampak Selisih"]}
                      contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", color: "#FFF", fontSize: "12px" }}
                    />
                    <Bar dataKey="discrepancyValue" fill="#EF4444" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Tidak ada temuan selisih produk.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TABEL AUDIT FIT-WIDTH (100% FIT NO HORIZONTAL SCROLL)                  */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-400 print:rounded-none print:shadow-none">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Memuat data audit stock opname...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600 space-y-3">
              <p className="text-sm font-bold">{error}</p>
              <button
                type="button"
                onClick={loadStockOpnameReport}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : !reportData?.audits || reportData.audits.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p className="text-sm font-bold text-slate-800">
                Belum ada data audit stock opname yang tercatat pada periode ini.
              </p>
              <p className="text-xs text-slate-400">
                Klik tombol seeder di bawah untuk mengisi data sampel audit stok.
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
                <span>Generate Data Dummy Audit (Seeder)</span>
              </button>
            </div>
          ) : (
            <div className="w-full overflow-hidden">
              {/* Screen Table (Fit-Width 100%) */}
              <div className="print:hidden">
                <table className="w-full table-fixed text-left border-collapse text-xs text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="w-[16%] px-3 py-3">Waktu & Kode Audit</th>
                      <th className="w-[24%] px-3 py-3">Produk & SKU</th>
                      <th className="w-[14%] px-3 py-3">Auditor</th>
                      <th className="w-[9%] px-2 py-3 text-center">Sistem</th>
                      <th className="w-[9%] px-2 py-3 text-center">Fisik</th>
                      <th className="w-[10%] px-2 py-3 text-center">Selisih</th>
                      <th className="w-[18%] px-3 py-3 text-right">Dampak Nilai (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedAudits.map((item) => {
                      const isLoss = item.diff < 0;
                      const isSurplus = item.diff > 0;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedAudit(item)}
                          className="hover:bg-slate-50/75 transition-colors cursor-pointer"
                          title="Klik untuk melihat catatan alasan audit"
                        >
                          {/* Waktu & Kode Audit */}
                          <td className="px-3 py-3 align-top">
                            <div className="font-mono font-bold text-slate-900">
                              {item.auditCode}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {item.date}
                            </div>
                          </td>

                          {/* Produk & SKU */}
                          <td className="px-3 py-3 align-top">
                            <div
                              className="font-semibold text-slate-900 leading-snug truncate"
                              title={item.productName}
                            >
                              {item.productName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                {item.sku}
                              </span>
                            </div>
                          </td>

                          {/* Auditor */}
                          <td className="px-3 py-3 align-top font-semibold text-slate-800 truncate">
                            {item.auditorName}
                          </td>

                          {/* Sistem */}
                          <td className="px-2 py-3 align-top text-center font-mono font-semibold text-slate-700">
                            {item.systemStock}
                          </td>

                          {/* Fisik */}
                          <td className="px-2 py-3 align-top text-center font-mono font-bold text-slate-900">
                            {item.physicalStock}
                          </td>

                          {/* Selisih */}
                          <td className="px-2 py-3 align-top text-center font-mono font-black text-xs">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full ${
                                isLoss
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : isSurplus
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {isSurplus ? `+${item.diff}` : item.diff}
                            </span>
                          </td>

                          {/* Dampak Nilai (Rp) */}
                          <td className="px-3 py-3 align-top text-right font-mono font-black text-xs">
                            <span
                              className={
                                isLoss
                                  ? "text-rose-600"
                                  : isSurplus
                                  ? "text-blue-600"
                                  : "text-slate-500 font-normal"
                              }
                            >
                              {isLoss ? `- ${formatRupiah(item.impactValueRp)}` : isSurplus ? `+ ${formatRupiah(item.impactValueRp)}` : "Rp 0"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Print Table (Full Records without Pagination) */}
              <div className="hidden print:block">
                <table className="w-full table-fixed text-left border-collapse text-xs print:text-[9.5px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 font-bold uppercase text-slate-700">
                      <th className="w-[5%] px-2 py-2 text-center">No</th>
                      <th className="w-[18%] px-2.5 py-2">Kode Audit</th>
                      <th className="w-[27%] px-2.5 py-2">Produk & SKU</th>
                      <th className="w-[16%] px-2 py-2">Auditor</th>
                      <th className="w-[8%] px-2 py-2 text-center">Sistem</th>
                      <th className="w-[8%] px-2 py-2 text-center">Fisik</th>
                      <th className="w-[8%] px-2 py-2 text-center">Selisih</th>
                      <th className="w-[10%] px-2.5 py-2 text-right">Dampak (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {reportData.audits.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="px-2 py-2 text-center text-slate-500">{idx + 1}</td>
                        <td className="px-2.5 py-2 font-mono font-bold text-slate-900">{item.auditCode}</td>
                        <td className="px-2.5 py-2">
                          <div className="font-semibold text-slate-900 truncate">{item.productName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.sku}</div>
                        </td>
                        <td className="px-2 py-2 text-slate-800 font-medium">{item.auditorName}</td>
                        <td className="px-2 py-2 text-center font-mono">{item.systemStock}</td>
                        <td className="px-2 py-2 text-center font-mono font-bold">{item.physicalStock}</td>
                        <td className="px-2 py-2 text-center font-mono font-bold">
                          {item.diff > 0 ? `+${item.diff}` : item.diff}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(item.impactValueRp)}
                        </td>
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
              totalItems={reportData?.audits.length || 0}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. LEMBAR TANDA TANGAN FORMAL (HANYA MUNCUL SAAT CETAK)                   */}
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
            <p className="text-[10px] text-slate-500 mt-1.5 leading-none">Auditor Gudang & Logistik</p>
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

      {/* ========================================================================= */}
      {/* 6. MODAL QUICK VIEW DETAIL TEMUAN AUDIT                                   */}
      {/* ========================================================================= */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                  {selectedAudit.auditCode}
                </span>
                <h3 className="font-extrabold text-base text-slate-900 mt-1">
                  Detail Temuan Audit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Produk</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedAudit.productName}</span>
                <span className="text-slate-500 font-mono block">SKU: {selectedAudit.sku}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block">SISTEM</span>
                  <span className="font-mono font-bold text-sm text-slate-800">{selectedAudit.systemStock}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block">FISIK</span>
                  <span className="font-mono font-bold text-sm text-slate-900">{selectedAudit.physicalStock}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block">SELISIH</span>
                  <span className={`font-mono font-black text-sm ${selectedAudit.diff < 0 ? "text-rose-600" : selectedAudit.diff > 0 ? "text-blue-600" : "text-emerald-600"}`}>
                    {selectedAudit.diff > 0 ? `+${selectedAudit.diff}` : selectedAudit.diff}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dampak Nilai (Rp)</span>
                <span className="font-mono font-black text-base text-slate-900">{formatRupiah(selectedAudit.impactValueRp)}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kategori Alasan</span>
                <span className="font-semibold text-slate-800">{selectedAudit.reason}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Catatan Auditor</span>
                <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 leading-relaxed mt-1">
                  {selectedAudit.notes}
                </p>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Auditor: <strong>{selectedAudit.auditorName}</strong></span>
                <span>{selectedAudit.date}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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
