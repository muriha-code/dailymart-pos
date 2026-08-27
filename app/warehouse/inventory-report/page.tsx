"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  InventoryReportItem,
  InventoryReportSummary,
} from "@/types/inventoryReport.types";
import { inventoryReportService } from "@/services/inventoryReport.service";
import { exportInventoryExcel } from "@/lib/utils/exportInventoryExcel";
import Pagination from "@/components/common/Pagination";

// Helper Export to CSV (Metode Blob + Directive sep=, untuk Excel)
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

  // Directif sep=, agar Excel otomatis menggunakan koma sebagai pemisah kolom
  const csvString = [
    "sep=,",
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\r\n");

  // Tambahkan UTF-8 BOM (\uFEFF) untuk mendukung karakter khusus & Blob URL
  const blob = new Blob(["\uFEFF" + csvString], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `Laporan_Inventaris_DailyMart_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

  // Handle Export Excel (.xlsx)
  const handleDownloadExcel = () => {
    setIsExportOpen(false);
    exportInventoryExcel(records, periodText);
  };

  const periodText =
    periodFilter === "today"
      ? "Hari Ini"
      : periodFilter === "7days"
        ? "7 Hari Terakhir"
        : periodFilter === "thisMonth"
          ? "Bulan Ini"
          : "Semua Waktu";

  const periodDateRangeText = useMemo(() => {
    const now = new Date();
    const formatDate = (d: Date) =>
      d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    if (periodFilter === "today") {
      return `${formatDate(now)} - ${formatDate(now)}`;
    } else if (periodFilter === "7days") {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      return `${formatDate(start)} - ${formatDate(now)}`;
    } else if (periodFilter === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return `${formatDate(start)} - ${formatDate(end)}`;
    } else {
      const start = new Date(now.getFullYear(), 0, 1);
      return `${formatDate(start)} - ${formatDate(now)}`;
    }
  }, [periodFilter]);

  const printedDateTimeText = useMemo(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeStr = now.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).replace(".", ":");
    return `${dateStr}, ${timeStr}`;
  }, []);

  const formattedTodayDate = useMemo(() => {
    return new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  const totalFinalStock = useMemo(() => {
    return records.reduce((acc, item) => acc + (Number(item.finalStock) || 0), 0);
  }, [records]);

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-[#0F172A] p-4 lg:p-6 print:p-0 print:bg-white print:m-0 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:w-full print:m-0 print:space-y-4">
        {/* ========================================================================= */}
        {/* PRINT ONLY: TEMPLATE CETAK PDF RESMI INVENTARIS GUDANG                    */}
        {/* ========================================================================= */}
        <div className="hidden print:block w-full text-slate-900 font-sans text-xs print:p-0">
          {/* 1. Header Kop Dokumen */}
          <div className="border-y-4 border-double border-slate-900 py-3 mb-4 text-center space-y-0.5">
            <h1 className="text-center font-black text-xl tracking-wider uppercase text-slate-900">
              DAILYMART POS
            </h1>
            <h2 className="text-center font-bold text-sm text-slate-800">
              Ringkasan Eksekutif Inventaris & Rekap Mutasi Stok
            </h2>
            <p className="text-center text-xs text-slate-600 mb-2">
              Jl. Raya Utama No. 88, Jakarta Selatan • Telp: (021) 555-0199
            </p>
          </div>

          {/* 2. Metadata Informasi Laporan Bar */}
          <div className="border-y-2 border-slate-900 py-1.5 mb-6 flex justify-between items-center text-xs">
            <div className="space-y-0.5">
              <div className="font-black uppercase text-xs text-slate-900">
                DOKUMEN INVENTARIS RESMI
              </div>
              <div className="text-xs font-semibold text-slate-800">
                Periode Laporan : {periodDateRangeText}
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <div className="text-xs text-slate-800">
                Dicetak : {printedDateTimeText}
              </div>
              <div className="font-bold text-xs text-slate-900">
                Oleh : {staffName || "Pegawai Gudang"}
              </div>
            </div>
          </div>

          {/* 3. Tabel Ringkasan Mutasi Stok Barang Gudang (Continuous Vertical Line 2-Column Table) */}
          <table className="w-full border-2 border-slate-900 border-collapse mb-12">
            <thead>
              <tr className="border-b-2 border-slate-900 bg-slate-100">
                <th className="w-2/3 text-left font-black text-xs uppercase px-4 py-2.5 border-r-2 border-slate-900 text-slate-900 tracking-wider">
                  KETERANGAN
                </th>
                <th className="w-1/3 text-center font-black text-xs uppercase px-4 py-2.5 text-slate-900 tracking-wider">
                  JUMLAH / TOTAL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y border-slate-900 text-xs font-medium">
              <tr className="border-b border-slate-900">
                <td className="px-4 py-2.5 border-r-2 border-slate-900 font-medium text-slate-800">
                  Total Unit Masuk (Restok / Supplier)
                </td>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-900">
                  +{summary.totalStockIn} Unit
                </td>
              </tr>
              <tr className="border-b border-slate-900">
                <td className="px-4 py-2.5 border-r-2 border-slate-900 font-medium text-slate-800">
                  Total Unit Keluar (Penjualan Kasir)
                </td>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-900">
                  -{summary.totalStockOut} Unit
                </td>
              </tr>
              <tr className="border-b border-slate-900">
                <td className="px-4 py-2.5 border-r-2 border-slate-900 font-medium text-slate-800">
                  Net Selisih Audit Opname
                </td>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-900">
                  {summary.netOpnameDiff >= 0 ? `+${summary.netOpnameDiff}` : summary.netOpnameDiff} Unit
                </td>
              </tr>
              <tr className="border-b border-slate-900">
                <td className="px-4 py-2.5 border-r-2 border-slate-900 font-medium text-slate-800">
                  Barang Rusak / Retur Vendor
                </td>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-900">
                  -{summary.totalStockReturn} Unit
                </td>
              </tr>
              <tr className="bg-slate-50 border-t-2 border-slate-900 font-black">
                <td className="px-4 py-2.5 border-r-2 border-slate-900 uppercase text-slate-900">
                  TOTAL AKHIR STOK INVENTARIS
                </td>
                <td className="px-4 py-2.5 text-center font-mono font-black text-sm text-slate-900">
                  {totalFinalStock} Unit
                </td>
              </tr>
            </tbody>
          </table>

          {/* 4. Blok Tanda Tangan & Otorisasi Resmi Footer (Sesuai Referensi Laporan Arus Kas) */}
          <div className="flex justify-between items-end mt-16 pt-4 border-t-2 border-slate-900">
            {/* Kolom Kiri (Penyusun) */}
            <div className="flex flex-col items-start text-left">
              <span className="text-xs text-slate-700 block">Dibuat & Diverifikasi Oleh,</span>
              <div className="h-[60px]" />
              <span className="font-black text-xs text-slate-900 block">
                ( {staffName || "Pegawai Gudang"} )
              </span>
              <span className="text-[10px] text-slate-500 block">
                Bagian Logistik & Inventaris DailyMart POS
              </span>
            </div>

            {/* Kolom Kanan (Persetujuan) */}
            <div className="flex flex-col items-end text-right">
              <span className="text-xs text-slate-700 text-right block mb-0.5">
                Jakarta, {formattedTodayDate}
              </span>
              <span className="text-xs text-slate-700 text-right block">
                Disetujui Oleh,
              </span>
              <div className="h-[60px]" />
              <span className="font-black text-xs text-slate-900 text-right block">
                ( ........................................................... )
              </span>
              <span className="text-[10px] text-slate-500 text-right block">
                Store Manager / Owner
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. HEADER INTERAKTIF & 4 CARD KPI (SEMBUNYI SAAT CETAK)                   */}
        {/* ========================================================================= */}
        <div className="print:hidden">
          {/* Header Bar Compact & Clean (Hapus Badge) */}
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
                Laporan Inventaris & Rekap Mutasi
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                Rekapitulasi pergerakan stok barang masuk, keluar, selisih opname, dan retur/rusak per periode.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Unified Export Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs px-3.5 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Cetak</span>
                  <svg className={`w-3.5 h-3.5 text-white transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu Modal */}
                {isExportOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 p-2 border-2 border-slate-900 dark:border-slate-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] z-50 animate-in fade-in zoom-in-95 duration-100 transition-colors">
                    {/* Opsi 1: Cetak / Simpan PDF */}
                    <button
                      type="button"
                      onClick={handlePrintPDF}
                      className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-2 rounded-md bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border border-slate-900 dark:border-slate-100 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100">Cetak Dokumen (PDF)</div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Format formal A4 Landscape</div>
                      </div>
                    </button>

                    <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

                    {/* Opsi 2: Ekspor Excel (.xlsx) */}
                    <button
                      type="button"
                      onClick={handleDownloadExcel}
                      className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-2 rounded-md bg-[#E8F5E9] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border border-slate-900 dark:border-slate-100 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100">Ekspor Excel (.xlsx)</div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Unduh Executive Dashboard (.xlsx)</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={loadInventoryReport}
                title="Refresh Data"
                className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-100 p-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-slate-900 dark:text-slate-100 transition-all cursor-pointer flex items-center justify-center"
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

          {/* 4 Card KPI Layar Web (Compact 4 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {/* Card 1: Total Unit Masuk */}
            <div className="bg-[#E8F5E9] dark:bg-emerald-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center min-h-[72px] transition-all">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#065F46] dark:text-emerald-300 block mb-1">
                Total Unit Masuk
              </span>
              <span className="text-[#065F46] dark:text-emerald-300 font-mono font-black text-lg block">
                +{summary.totalStockIn}{" "}
                <span className="text-xs font-bold text-[#065F46]/80 dark:text-emerald-300/80">unit</span>
              </span>
            </div>

            {/* Card 2: Total Unit Keluar */}
            <div className="bg-[#EEF2FF] dark:bg-indigo-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center min-h-[72px] transition-all">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#4338CA] dark:text-indigo-300 block mb-1">
                Total Unit Keluar
              </span>
              <span className="text-[#4338CA] dark:text-indigo-300 font-mono font-black text-lg block">
                -{summary.totalStockOut}{" "}
                <span className="text-xs font-bold text-[#4338CA]/80 dark:text-indigo-300/80">unit</span>
              </span>
            </div>

            {/* Card 3: Net Selisih Opname */}
            <div className="bg-[#FEF3C7] dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center min-h-[72px] transition-all">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#B45309] dark:text-amber-300 block mb-1">
                Net Selisih Opname
              </span>
              <span className="text-[#B45309] dark:text-amber-300 font-mono font-black text-lg block">
                {summary.netOpnameDiff > 0 ? `+${summary.netOpnameDiff}` : summary.netOpnameDiff}{" "}
                <span className="text-xs font-bold text-[#B45309]/80 dark:text-amber-300/80">unit</span>
              </span>
            </div>

            {/* Card 4: Barang Rusak / Retur */}
            <div className="bg-[#FFE4E6] dark:bg-rose-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center min-h-[72px] transition-all">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#E11D48] dark:text-rose-400 block mb-1">
                Barang Rusak / Retur
              </span>
              <span className="text-[#E11D48] dark:text-rose-400 font-mono font-black text-lg block">
                -{summary.totalStockReturn}{" "}
                <span className="text-xs font-bold text-[#E11D48]/80 dark:text-rose-400/80">unit</span>
              </span>
            </div>
          </div>

          {/* TOOLBAR SEARCH & FILTERS DENGAN OVAL/PILL INPUTS */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] flex flex-wrap items-center gap-2 mb-4 transition-colors">
            {/* Search Bar (Oval/Pill) */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Nama Produk, SKU, atau Kategori..."
                className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-4 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex-1 w-full placeholder:text-slate-400 dark:placeholder:text-slate-500"
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

            {/* Select Options (Oval/Pill) */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">Periode:</label>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-4 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
                >
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="7days">7 Hari Terakhir</option>
                  <option value="thisMonth">Bulan Ini</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">Kategori:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-4 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
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
        {/* 3. TABEL DATA MUTASI STOK INVENTARIS (SCREEN ONLY)                         */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[3.5px_3.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3.5px_3.5px_0px_0px_rgba(255,255,255,1)] overflow-hidden print:hidden transition-colors">
          {isLoading ? (
            <div className="p-12 text-center text-slate-700 dark:text-slate-300 space-y-2">
              <div className="w-8 h-8 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-black">Memuat laporan inventaris & mutasi stok...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-rose-600 dark:text-rose-400 space-y-2">
              <p className="text-sm font-black">{error}</p>
              <button
                type="button"
                onClick={loadInventoryReport}
                className="px-4 py-2 bg-[#6366F1] text-white border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-[#4F46E5] cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-900 dark:text-slate-100 space-y-2">
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                Belum ada data rekapitulasi mutasi stok inventaris.
              </p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Klik tombol seeder di bawah untuk mengisi data sampel rekap mutasi.
              </p>
              <button
                type="button"
                onClick={handleTriggerSeeder}
                disabled={seedingLoading}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
              >
                {seedingLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-white dark:border-slate-950 border-t-transparent rounded-full animate-spin" />
                )}
                <span>Generate Data Dummy (Seeder)</span>
              </button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-900 dark:text-slate-100 font-bold">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-black text-[10px] uppercase tracking-wider">
                    <th className="px-3 py-3">Produk & SKU</th>
                    <th className="px-2 py-3 text-center">Stok Awal</th>
                    <th className="px-2 py-3 text-center">Masuk (+)</th>
                    <th className="px-2 py-3 text-center">Keluar (-)</th>
                    <th className="px-2 py-3 text-center">Opname (+/-)</th>
                    <th className="px-2 py-3 text-center">Retur/Rusak (-)</th>
                    <th className="px-3 py-3 text-center">Stok Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {paginatedRecords.map((item) => {
                    return (
                      <tr
                        key={item.id || item.productId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-200 dark:border-slate-800"
                      >
                        <td className="px-3 py-3 align-top">
                          <div
                            className="font-black text-slate-900 dark:text-slate-100 leading-snug"
                            title={item.productName}
                          >
                            {item.productName}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                            <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 shrink-0">
                              SKU: {item.sku}
                            </span>
                            {item.categoryName && (
                              <span className="text-slate-500 dark:text-slate-400 font-medium">• {item.categoryName}</span>
                            )}
                          </div>
                        </td>

                        <td className="px-2 py-3 align-top text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.initialStock} {item.unit}
                        </td>

                        <td className="px-2 py-3 align-top text-center font-mono font-black text-xs text-[#065F46] dark:text-emerald-400 whitespace-nowrap">
                          +{item.stockIn} {item.unit}
                        </td>

                        <td className="px-2 py-3 align-top text-center font-mono font-black text-xs text-[#4338CA] dark:text-indigo-400 whitespace-nowrap">
                          -{item.stockOut} {item.unit}
                        </td>

                        <td className="px-2 py-3 align-top text-center font-mono font-black text-xs text-[#B45309] dark:text-amber-400 whitespace-nowrap">
                          {item.opnameDiff > 0 ? (
                            <span>+{item.opnameDiff} {item.unit}</span>
                          ) : item.opnameDiff < 0 ? (
                            <span>{item.opnameDiff} {item.unit}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">0 {item.unit}</span>
                          )}
                        </td>

                        <td className="px-2 py-3 align-top text-center font-mono font-black text-xs text-[#E11D48] dark:text-rose-400 whitespace-nowrap">
                          -{item.stockReturn} {item.unit}
                        </td>

                        <td className="px-3 py-3 align-top text-center whitespace-nowrap">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-slate-50 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-black text-xs px-2.5 py-1 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                            {item.finalStock} {item.unit}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Integrated Reusable Pagination */}
          <div>
            <Pagination
              currentPage={currentPage}
              totalItems={records.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
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
