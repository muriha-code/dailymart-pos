"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  InventoryReportItem,
  InventoryReportSummary,
} from "@/types/inventoryReport.types";
import { inventoryReportService } from "@/services/inventoryReport.service";
import Pagination from "@/components/common/Pagination";

// Helper Export to CSV
const exportToCSV = (data: InventoryReportItem[]) => {
  if (!data || data.length === 0) {
    alert("Tidak ada data untuk diekspor!");
    return;
  }

  const headers = [
    "No",
    "Kode SKU",
    "Nama Produk",
    "Kategori",
    "Stok Awal",
    "Masuk (+)",
    "Keluar (-)",
    "Opname (+/-)",
    "Retur/Rusak (-)",
    "Stok Akhir",
    "Satuan",
  ];

  const rows = data.map((item, index) => [
    index + 1,
    `"${item.sku}"`,
    `"${item.productName.replace(/"/g, '""')}"`,
    `"${item.categoryName || "Umum"}"`,
    item.initialStock,
    item.stockIn,
    item.stockOut,
    item.opnameDiff,
    item.stockReturn,
    item.finalStock,
    `"${item.unit || "Pcs"}"`,
  ]);

  const csvContent =
    "data:text/csv;charset=utf-8,\uFEFF" +
    [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute(
    "download",
    `Laporan_Inventaris_DailyMart_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function InventoryReportPage() {
  // User Session State
  const [user, setUser] = useState<{ displayName?: string; name?: string; email?: string } | null>(null);

  // Data States
  const [records, setRecords] = useState<InventoryReportItem[]>([]);
  const [summary, setSummary] = useState<InventoryReportSummary>({
    totalStockIn: 0,
    totalStockOut: 0,
    netOpnameDiff: 0,
    totalStockReturn: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [seedingLoading, setSeedingLoading] = useState<boolean>(false);

  // Dropdown & Action State
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [periodFilter, setPeriodFilter] = useState<string>("all");

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

  const staffName = user?.displayName || user?.name || "Pegawai Gudang";

  // Load Inventory Report
  const loadInventoryReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await inventoryReportService.getInventoryReport({
        search: searchQuery,
        category: categoryFilter,
        period: periodFilter as any,
      });
      setRecords(data.data);
      setSummary(data.summary);
    } catch (err: any) {
      console.error("Gagal memuat laporan inventaris:", err);
      setError(
        err.message || "Gagal terhubung ke database. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, categoryFilter, periodFilter]);

  useEffect(() => {
    loadInventoryReport();
  }, [loadInventoryReport]);

  // Auto-reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, periodFilter]);

  // Extract Unique Categories for Filter Dropdown
  const categoriesList = useMemo(() => {
    const setCat = new Set<string>();
    records.forEach((r) => {
      if (r.categoryName) setCat.add(r.categoryName);
    });
    return Array.from(setCat);
  }, [records]);

  // Paginated Records
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return records.slice(start, start + ITEMS_PER_PAGE);
  }, [records, currentPage]);

  // Handle Seeder Trigger
  const handleTriggerSeeder = async () => {
    setSeedingLoading(true);
    try {
      await inventoryReportService.seedInventoryReport();
      await loadInventoryReport();
    } catch (err: any) {
      alert("Gagal seeding data inventaris: " + (err.message || err));
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

  // Handle Print / PDF
  const handlePrintPDF = () => {
    setIsExportOpen(false);
    window.print();
  };

  // Handle Export CSV
  const handleDownloadCSV = () => {
    setIsExportOpen(false);
    exportToCSV(records);
  };

  const periodText =
    periodFilter === "today"
      ? "Hari Ini"
      : periodFilter === "7days"
        ? "7 Hari Terakhir"
        : periodFilter === "thisMonth"
          ? "Bulan Ini"
          : "Semua Waktu";

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 lg:p-6 print:p-0 print:bg-white print:m-0 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:w-full print:m-0 print:space-y-4">
        {/* ========================================================================= */}
        {/* 1. KOP SURAT FORMAL & RINGKASAN TEKS (HANYA MUNCUL SAAT CETAK)             */}
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
                LAPORAN MUTASI STOK INVENTARIS
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

          {/* Ringkasan Periode Format Teks (Tanpa Card) */}
          <div className="mt-3 py-1.5 px-3 border border-slate-300 rounded bg-slate-50/50 text-[10px] flex items-center justify-between text-slate-700">
            <span>
              • Total Barang Masuk:{" "}
              <strong className="text-slate-900">+{summary.totalStockIn} Unit</strong>
            </span>
            <span>
              • Total Barang Keluar:{" "}
              <strong className="text-slate-900">-{summary.totalStockOut} Unit</strong>
            </span>
            <span>
              • Net Selisih Opname:{" "}
              <strong className="text-slate-900">
                {summary.netOpnameDiff >= 0
                  ? `+${summary.netOpnameDiff}`
                  : summary.netOpnameDiff}{" "}
                Unit
              </strong>
            </span>
            <span>
              • Barang Rusak / Retur:{" "}
              <strong className="text-slate-900">-{summary.totalStockReturn} Unit</strong>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. HEADER INTERAKTIF & 4 CARD KPI (SEMBUNYI SAAT CETAK)                   */}
        {/* ========================================================================= */}
        <div className="print:hidden">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 uppercase tracking-wider">
                GUDANG & LOGISTIK • Laporan Mutasi Stok
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
                Laporan Inventaris & Rekap Mutasi
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Rekapitulasi pergerakan stok barang masuk, keluar, selisih opname, dan retur/rusak per periode.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Unified Export Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Cetak</span>
                  <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu Modal */}
                {isExportOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {/* Opsi 1: Cetak / Simpan PDF (Nuansa Merah) */}
                    <button
                      type="button"
                      onClick={handlePrintPDF}
                      className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-rose-50 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-2 rounded-md bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-rose-900">Cetak Dokumen (PDF)</div>
                        <div className="text-[10px] text-slate-500">Format formal A4 Landscape</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {/* Opsi 2: Ekspor CSV Excel */}
                    <button
                      type="button"
                      onClick={handleDownloadCSV}
                      className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-emerald-50 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-2 rounded-md bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-900">Ekspor CSV (Excel)</div>
                        <div className="text-[10px] text-slate-500">Unduh lembar kerja mentah (.csv)</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={loadInventoryReport}
                title="Refresh Data"
                className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
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

          {/* 4 Card KPI Layar Web */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Unit Masuk
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono">
                  +{summary.totalStockIn}{" "}
                  <span className="text-xs font-normal text-slate-400">unit</span>
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Total Unit Keluar
                </span>
                <span className="text-2xl font-black text-blue-600 mt-1 block font-mono">
                  -{summary.totalStockOut}{" "}
                  <span className="text-xs font-normal text-slate-400">unit</span>
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Net Selisih Opname
                </span>
                <span className={`text-2xl font-black mt-1 block font-mono ${summary.netOpnameDiff < 0
                  ? "text-rose-600"
                  : summary.netOpnameDiff > 0
                    ? "text-emerald-600"
                    : "text-slate-800"
                  }`}>
                  {summary.netOpnameDiff > 0 ? `+${summary.netOpnameDiff}` : summary.netOpnameDiff}{" "}
                  <span className="text-xs font-normal text-slate-400">unit</span>
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Barang Rusak / Retur
                </span>
                <span className="text-2xl font-black text-rose-600 mt-1 block font-mono">
                  -{summary.totalStockReturn}{" "}
                  <span className="text-xs font-normal text-slate-400">unit</span>
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
            </div>
          </div>

          {/* TOOLBAR SEARCH & FILTERS LAYAR WEB */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
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
                placeholder="Cari Nama Produk, SKU, atau Kategori..."
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
                </select>
              </div>

              <div className="flex items-center gap-1.5 min-w-[150px]">
                <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Kategori:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="ALL">Semua Kategori</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TABEL DATA MUTASI STOK INVENTARIS                                      */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print:border-slate-400 print:rounded-none print:shadow-none">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Memuat laporan inventaris & mutasi stok...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600 space-y-3">
              <p className="text-sm font-bold">{error}</p>
              <button
                type="button"
                onClick={loadInventoryReport}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p className="text-sm font-bold text-slate-800">
                Belum ada data rekapitulasi mutasi stok inventaris.
              </p>
              <p className="text-xs text-slate-400">
                Klik tombol seeder di bawah untuk mengisi data sampel rekap mutasi.
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
                <span>Generate Data Dummy (Seeder)</span>
              </button>
            </div>
          ) : (
            <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs print:border-slate-400 print:rounded-none print:shadow-none">
              {/* Screen Table (Paginated) */}
              <div className="print:hidden">
                <table className="w-full table-fixed text-left border-collapse text-xs text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="w-[26%] px-3 py-3">Produk & SKU</th>
                      <th className="w-[10%] px-2 py-3 text-center">Stok Awal</th>
                      <th className="w-[11%] px-2 py-3 text-center text-emerald-700">Masuk (+)</th>
                      <th className="w-[11%] px-2 py-3 text-center text-blue-700">Keluar (-)</th>
                      <th className="w-[12%] px-2 py-3 text-center">Opname (+/-)</th>
                      <th className="w-[12%] px-2 py-3 text-center text-rose-700">Retur/Rusak (-)</th>
                      <th className="w-[18%] px-3 py-3 text-right">Stok Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {paginatedRecords.map((item) => {
                      const isOut = item.finalStock === 0;

                      return (
                        <tr
                          key={item.id || item.productId}
                          className="hover:bg-slate-50/75 transition-colors"
                        >
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
                              {item.categoryName && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{item.categoryName}</span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="px-2 py-3 align-top text-center font-mono font-semibold text-slate-700">
                            {item.initialStock} {item.unit}
                          </td>

                          <td className="px-2 py-3 align-top text-center font-mono font-bold text-emerald-600">
                            +{item.stockIn} {item.unit}
                          </td>

                          <td className="px-2 py-3 align-top text-center font-mono font-bold text-blue-600">
                            -{item.stockOut} {item.unit}
                          </td>

                          <td className="px-2 py-3 align-top text-center font-mono font-bold">
                            {item.opnameDiff > 0 ? (
                              <span className="text-emerald-600">+{item.opnameDiff}</span>
                            ) : item.opnameDiff < 0 ? (
                              <span className="text-rose-600">{item.opnameDiff}</span>
                            ) : (
                              <span className="text-slate-400">0</span>
                            )}
                          </td>

                          <td className="px-2 py-3 align-top text-center font-mono font-bold text-rose-600">
                            -{item.stockReturn} {item.unit}
                          </td>

                          <td className="px-3 py-3 align-top text-right font-mono">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${isOut
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-900 border border-slate-200"
                                }`}
                            >
                              {item.finalStock} {item.unit}
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
                    <tr className="border-b border-slate-200 bg-slate-50 print:bg-slate-100 font-bold uppercase text-slate-700">
                      <th className="w-[5%] px-2 py-2 text-center">No</th>
                      <th className="w-[27%] px-2.5 py-2">Produk & SKU</th>
                      <th className="w-[10%] px-2 py-2 text-center">Stok Awal</th>
                      <th className="w-[11%] px-2 py-2 text-center">Masuk (+)</th>
                      <th className="w-[11%] px-2 py-2 text-center">Keluar (-)</th>
                      <th className="w-[11%] px-2 py-2 text-center">Opname</th>
                      <th className="w-[11%] px-2 py-2 text-center">Retur (-)</th>
                      <th className="w-[14%] px-2.5 py-2 text-right">Stok Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                    {records.map((item, idx) => (
                      <tr key={item.id || item.productId}>
                        <td className="px-2 py-2 text-center text-slate-500">{idx + 1}</td>
                        <td className="px-2.5 py-2">
                          <div className="font-semibold text-slate-900 truncate">{item.productName}</div>
                          <div className="text-[10px] print:text-[8.5px] text-slate-500 font-mono">{item.sku}</div>
                        </td>
                        <td className="px-2 py-2 text-center font-mono">{item.initialStock}</td>
                        <td className="px-2 py-2 text-center font-mono font-semibold text-emerald-600">+{item.stockIn}</td>
                        <td className="px-2 py-2 text-center font-mono font-semibold text-blue-600">-{item.stockOut}</td>
                        <td className="px-2 py-2 text-center font-mono font-medium">
                          {item.opnameDiff > 0 ? `+${item.opnameDiff}` : item.opnameDiff}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-semibold text-rose-600">
                          {item.stockReturn > 0 ? `-${item.stockReturn}` : 0}
                        </td>
                        <td className="px-2.5 py-2 text-right font-mono font-bold text-slate-900">
                          {item.finalStock} {item.unit || "Pcs"}
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
              totalItems={records.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. LEMBAR TANDA TANGAN FORMAL (SEJAJAR PRESISI)                           */}
        {/* ========================================================================= */}
        <div className="hidden print:grid grid-cols-2 mt-10 pt-2 text-xs text-slate-800">
          {/* Kolom Kiri: Staff Gudang */}
          <div className="flex flex-col items-center text-center">
            {/* Placeholder agar sejajar dengan tanggal di kanan */}
            <p className="invisible select-none text-[11px] leading-tight">
              Surakarta, 00 Bulan 0000
            </p>
            <p className="font-medium text-slate-700 mt-1 leading-tight">Dibuat Oleh,</p>

            {/* Ruang Tanda Tangan */}
            <div className="h-20 w-full" />

            {/* Nama & Garis Bawah */}
            <p className="font-bold text-slate-900 underline uppercase tracking-wide leading-none">
              ( {staffName} )
            </p>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-none">Staff Gudang & Logistik</p>
          </div>

          {/* Kolom Kanan: Store Manager */}
          <div className="flex flex-col items-center text-center">
            <p className="text-slate-700 text-[11px] leading-tight">
              Surakarta, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="font-medium text-slate-700 mt-1 leading-tight">Disetujui Oleh,</p>

            {/* Ruang Tanda Tangan */}
            <div className="h-20 w-full" />

            {/* Nama & Garis Bawah */}
            <p className="font-bold text-slate-900 underline tracking-wide leading-none">
              ( .................................................... )
            </p>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-none">Store Manager / Admin Retail</p>
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
