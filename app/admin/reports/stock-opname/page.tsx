"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  StockOpnameReportResponse,
  StockOpnameAuditItem,
} from "@/types/stockOpnameReport.types";
import { stockOpnameReportService } from "@/services/stockOpnameReport.service";
import { exportStockOpnameExcel } from "@/lib/utils/exportStockOpnameExcel";
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

  // Handle Export Excel (.xlsx)
  const handleExportExcel = () => {
    setIsExportOpen(false);
    if (reportData?.audits) {
      exportStockOpnameExcel(reportData.audits, periodText);
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

  // Executive Summary Computed Metrics
  const auditMetrics = useMemo(() => {
    if (!reportData) {
      return {
        totalAudited: 0,
        accuracyRate: 0,
        matchedCount: 0,
        discrepancyCount: 0,
        deficitCount: 0,
        surplusCount: 0,
        totalLossRp: 0,
        totalSurplusRp: 0,
        netImpactRp: 0,
      };
    }

    const audits = reportData.audits || [];
    const matchedCount = audits.filter((a) => a.diff === 0).length;
    const deficitCount = audits.filter((a) => a.diff < 0).length;
    const surplusCount = audits.filter((a) => a.diff > 0).length;
    const discrepancyCount = deficitCount + surplusCount;
    const totalLossRp = reportData.summary.totalLossRp || 0;
    const totalSurplusRp = reportData.summary.totalSurplusRp || 0;
    const netImpactRp = totalSurplusRp - totalLossRp;

    return {
      totalAudited: reportData.summary.totalAudited || audits.length,
      accuracyRate: reportData.summary.accuracyRate || 0,
      matchedCount,
      discrepancyCount,
      deficitCount,
      surplusCount,
      totalLossRp,
      totalSurplusRp,
      netImpactRp,
    };
  }, [reportData]);

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-[#0F172A] p-4 lg:p-6 print:p-0 print:bg-white print:m-0 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:w-full print:m-0 print:space-y-0">
        {/* ========================================================================= */}
        {/* PRINT ONLY: RINGKASAN EKSEKUTIF AUDIT STOCK OPNAME (1 HALAMAN A4)        */}
        {/* ========================================================================= */}
        <div className="hidden print:block w-full max-w-2xl mx-auto text-slate-900 font-sans text-xs space-y-3 print:px-8 print:py-6">
          {/* Header Kop Dokumen */}
          <div className="border-t-2 border-b border-slate-900 py-2.5 text-center space-y-0.5">
            <h1 className="text-base font-black tracking-wider uppercase text-slate-900">
              DAILYMART POS
            </h1>
            <p className="text-xs font-bold text-slate-800">
              Ringkasan Eksekutif Hasil Audit Stock Opname
            </p>
            <p className="text-[10px] text-slate-600">
              Jl. Retail Utama No. 88, Jakarta Selatan • Telp: (021) 555-0199
            </p>
          </div>

          {/* Baris Informasi Metadata Dokumen */}
          <div className="border-b-2 border-slate-900 pb-2 flex justify-between items-start text-[11px]">
            <div className="space-y-0.5">
              <div className="font-extrabold uppercase tracking-wide text-slate-900">
                DOKUMEN LOGISTIK RESMI
              </div>
              <div className="text-slate-700">
                <span>Periode Laporan : </span>
                <span className="font-bold text-slate-900">{periodText}</span>
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <div className="text-slate-700">
                <span>Dicetak : </span>
                <span className="font-semibold text-slate-900">
                  {new Date().toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}, {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="text-slate-700">
                <span>Oleh : </span>
                <span className="font-bold text-slate-900">
                  {staffName}
                </span>
              </div>
            </div>
          </div>

          {/* ==================== TABEL 1: METRIK & PERFORMA AKURASI INVENTARIS ==================== */}
          <div className="border border-slate-900 overflow-hidden shadow-none mt-4">
            <div className="bg-slate-100 border-b border-slate-900 text-center py-1.5 font-bold uppercase tracking-wider text-xs text-slate-900">
              METRIK & PERFORMA AKURASI INVENTARIS
            </div>
            <div className="divide-y divide-slate-300 text-xs">
              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Total Item Diaudit
                </div>
                <div className="col-span-6 font-bold text-slate-900 border-l border-slate-300 pl-3.5">
                  {auditMetrics.totalAudited} SKU Produk
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Tingkat Akurasi Stok (Accuracy Rate)
                </div>
                <div className="col-span-6 font-bold text-slate-900 border-l border-slate-300 pl-3.5 font-mono">
                  {auditMetrics.accuracyRate.toFixed(1)}%
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Jumlah Item Sesuai (Sistem = Fisik)
                </div>
                <div className="col-span-6 font-bold text-emerald-800 border-l border-slate-300 pl-3.5">
                  {auditMetrics.matchedCount} SKU
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2 bg-slate-50 border-t border-slate-900">
                <div className="col-span-6 font-bold text-slate-900">
                  Jumlah Item Selisih (Varian)
                </div>
                <div className="col-span-6 font-bold text-slate-900 border-l border-slate-300 pl-3.5">
                  {auditMetrics.discrepancyCount} SKU
                </div>
              </div>
            </div>
          </div>

          {/* ==================== TABEL 2: REKAPITULASI SELISIH & DAMPAK FINANSIAL ==================== */}
          <div className="border border-slate-900 overflow-hidden shadow-none mt-3.5">
            <div className="bg-slate-100 border-b border-slate-900 text-center py-1.5 font-bold uppercase tracking-wider text-xs text-slate-900">
              REKAPITULASI SELISIH & DAMPAK FINANSIAL
            </div>
            <div className="grid grid-cols-12 px-3.5 py-1.5 bg-slate-50 border-b border-slate-400 text-[11px] font-bold text-slate-800 uppercase">
              <div className="col-span-6">KATEGORI SELISIH (VARIAN)</div>
              <div className="col-span-3 border-l border-slate-300 pl-3">JUMLAH ITEM</div>
              <div className="col-span-3 border-l border-slate-300 pl-3 text-right">ESTIMASI NILAI DAMPAK (RP)</div>
            </div>
            <div className="divide-y divide-slate-300 text-xs">
              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Selisih Kurang / Loss (Fisik &lt; Sys)
                </div>
                <div className="col-span-3 font-semibold text-slate-700 border-l border-slate-300 pl-3">
                  {auditMetrics.deficitCount} SKU
                </div>
                <div className="col-span-3 font-mono font-bold text-rose-700 border-l border-slate-300 pl-3 text-right">
                  - {formatRupiah(auditMetrics.totalLossRp)}
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Selisih Lebih / Surplus (Fisik &gt; Sys)
                </div>
                <div className="col-span-3 font-semibold text-slate-700 border-l border-slate-300 pl-3">
                  {auditMetrics.surplusCount} SKU
                </div>
                <div className="col-span-3 font-mono font-bold text-blue-800 border-l border-slate-300 pl-3 text-right">
                  + {formatRupiah(auditMetrics.totalSurplusRp)}
                </div>
              </div>

              {/* Total Dampak Kerugian Bersih Footer */}
              <div className="grid grid-cols-12 px-3.5 py-2.5 bg-slate-100 border-t border-slate-900 font-extrabold">
                <div className="col-span-6 text-slate-900 uppercase">
                  TOTAL DAMPAK KERUGIAN BERSIH (NET)
                </div>
                <div className="col-span-3 text-slate-900 border-l border-slate-300 pl-3">
                  {auditMetrics.discrepancyCount} SKU
                </div>
                <div className="col-span-3 text-slate-900 border-l border-slate-300 pl-3 font-mono text-right">
                  {auditMetrics.netImpactRp >= 0 ? "+ " : "- "}
                  {formatRupiah(Math.abs(auditMetrics.netImpactRp))}
                </div>
              </div>
            </div>
          </div>

          {/* ==================== BLOK TANDA TANGAN ==================== */}
          <div className="pt-8 pb-3 border-b-2 border-slate-900">
            <div className="grid grid-cols-2 text-xs">
              <div className="flex flex-col items-start space-y-1">
                <p className="font-medium text-slate-700">Dibuat Oleh,</p>
                <div className="h-16" />
                <p className="font-bold text-slate-900">
                  ( {staffName.toUpperCase()} )
                </p>
                <p className="text-[10px] text-slate-500">Auditor Gudang & Logistik</p>
              </div>

              <div className="flex flex-col items-end text-right space-y-1">
                <p className="text-slate-700">
                  Jakarta, {new Date().toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <p className="font-medium text-slate-700">Disetujui Oleh,</p>
                <div className="h-16" />
                <p className="font-bold text-slate-900">
                  ( .................................................... )
                </p>
                <p className="text-[10px] text-slate-500">Store Manager / Owner</p>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== SCREEN CONTAINER ==================== */}
        <div className="print:hidden space-y-3">
          {/* 1. Header Bar Compact */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 p-0">
            <div>
              <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
                Laporan Audit Stock Opname
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-600 dark:text-slate-400 font-bold mt-0.5">
                Analisis verifikasi stok fisik vs sistem, persentase akurasi, nilai kerugian/surplus, dan temuan selisih.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Unified Export Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs py-1.5 px-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Cetak</span>
                  <svg className={`w-3 h-3 text-white/80 transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu Modal */}
                {isExportOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 p-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] border-2 border-slate-900 dark:border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100 transition-colors">
                    {/* Opsi 1: Cetak / Simpan PDF */}
                    <button
                      type="button"
                      onClick={handlePrintPDF}
                      className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer border border-transparent hover:border-slate-900 dark:hover:border-slate-100"
                    >
                      <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-slate-900 dark:border-slate-100 text-rose-700 dark:text-rose-300">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100">Cetak Dokumen (PDF)</div>
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Format resmi A4 Landscape</div>
                      </div>
                    </button>

                    <div className="my-1 border-t-2 border-slate-200 dark:border-slate-800" />

                    {/* Opsi 2: Ekspor Excel (.xlsx) */}
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer border border-transparent hover:border-slate-900 dark:hover:border-slate-100"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-slate-900 dark:border-slate-100 text-emerald-700 dark:text-emerald-300">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100">Ekspor Excel (.xlsx)</div>
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Unduh Executive Dashboard (.xlsx)</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary Refresh Button */}
              <button
                type="button"
                onClick={loadStockOpnameReport}
                title="Refresh Data"
                className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-100 p-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-slate-900 dark:text-slate-100 transition-all cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
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

          {/* 2. KPI Stat Cards (4 Grid Opname Metrics - Compact) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {/* Card 1 (Total Item Diverifikasi) */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 mb-0.5 block">
                Total Item Diverifikasi
              </span>
              <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-50 tracking-tight block">
                {reportData?.summary.totalAudited || 0}{" "}
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">item</span>
              </span>
            </div>

            {/* Card 2 (Tingkat Akurasi Stok) */}
            <div className="bg-[#E8F5E9] dark:bg-emerald-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 mb-0.5 block">
                Tingkat Akurasi Stok
              </span>
              <span className="text-[#065F46] dark:text-emerald-300 font-mono font-black text-lg tracking-tight block">
                {reportData?.summary.accuracyRate || 0}%
              </span>
            </div>

            {/* Card 3 (Total Nilai Kerugian / Loss) */}
            <div className="bg-[#FFE4E6] dark:bg-rose-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 mb-0.5 block">
                Total Kerugian (Loss)
              </span>
              <span className="text-[#E11D48] dark:text-rose-400 font-mono font-black text-lg tracking-tight block">
                {formatRupiah(reportData?.summary.totalLossRp || 0)}
              </span>
            </div>

            {/* Card 4 (Total Nilai Surplus) */}
            <div className="bg-[#EEF2FF] dark:bg-indigo-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 mb-0.5 block">
                Total Surplus
              </span>
              <span className="text-[#4338CA] dark:text-indigo-300 font-mono font-black text-lg tracking-tight block">
                {formatRupiah(reportData?.summary.totalSurplusRp || 0)}
              </span>
            </div>
          </div>

          {/* 3. Inline Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] flex flex-wrap items-center gap-2.5 mb-3 transition-colors">
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">PERIODE:</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-3 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
              >
                <option value="all">Semua Waktu</option>
                <option value="today">Hari Ini</option>
                <option value="7days">7 Hari Terakhir</option>
                <option value="thisMonth">Bulan Ini</option>
                <option value="custom">Kustom Tanggal</option>
              </select>
            </div>

            {periodFilter === "custom" && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-3 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
                />
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-3 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
                />
              </div>
            )}

            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">STATUS SELISIH:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-3 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
              >
                <option value="ALL">Semua Status</option>
                <option value="MATCHED">Sesuai (Match)</option>
                <option value="DEFICIT">Selisih Kurang (Loss)</option>
                <option value="SURPLUS">Selisih Lebih (Surplus)</option>
              </select>
            </div>

            <div className="relative flex-1 min-w-[180px]">
              <svg
                className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Produk, SKU, Auditor..."
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full pl-8 pr-3 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
              />
            </div>
          </div>

          {/* 4. Chart Section (Komposisi Hasil Audit & Top 5 Dampak Selisih) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
            {/* Komposisi Hasil Audit (lg:col-span-1) */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-colors">
              <div className="mb-1">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Komposisi Hasil Audit
                </h2>
              </div>

              <div className="w-full h-[150px] sm:h-[160px]">
                {reportData?.statusDistribution && reportData.statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={55}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {reportData.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#0F172A" strokeWidth={1.5} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(val: any) => [`${val} Item`, "Jumlah Item"]}
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          border: "2px solid #334155",
                          borderRadius: "10px",
                          color: "#FFF",
                          fontSize: "11px",
                          fontWeight: "bold",
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={32}
                        formatter={(value, entry: any) => (
                          <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {value} ({entry.payload.value})
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500">
                    Belum ada data audit untuk grafik.
                  </div>
                )}
              </div>
            </div>

            {/* Top 5 Produk Dampak Selisih (lg:col-span-2) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-colors">
              <div className="mb-1">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Top 5 Produk Dampak Selisih (Rp)
                </h2>
              </div>

              <div className="w-full h-[150px] sm:h-[160px]">
                {reportData?.topDiscrepancies && reportData.topDiscrepancies.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.topDiscrepancies} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: -5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94A3B8" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 10, fontWeight: 'bold', fill: 'currentColor' }} className="text-slate-700 dark:text-slate-300" tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="productName" type="category" width={130} tick={{ fontSize: 10, fontWeight: '700', fill: 'currentColor' }} className="text-slate-700 dark:text-slate-300" />
                      <RechartsTooltip
                        formatter={(val: any) => [formatRupiah(Number(val)), "Dampak Selisih"]}
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          border: "2px solid #334155",
                          borderRadius: "10px",
                          color: "#FFF",
                          fontSize: "11px",
                          fontWeight: "bold",
                        }}
                      />
                      <Bar dataKey="discrepancyValue" fill="#E11D48" stroke="#0F172A" strokeWidth={1.5} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500">
                    Tidak ada temuan selisih produk.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. Table Data Audit Stock Opname */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] overflow-hidden transition-colors">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                <div className="w-8 h-8 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Memuat data audit stock opname...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center text-rose-600 dark:text-rose-400 space-y-3">
                <p className="text-sm font-bold">{error}</p>
                <button
                  type="button"
                  onClick={loadStockOpnameReport}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
                >
                  Coba Lagi
                </button>
              </div>
            ) : !reportData?.audits || reportData.audits.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Belum ada data audit stock opname yang tercatat pada periode ini.
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Klik tombol seeder di bawah untuk mengisi data sampel audit stok.
                </p>
                <button
                  type="button"
                  onClick={handleTriggerSeeder}
                  disabled={seedingLoading}
                  className="px-4 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl text-xs font-bold border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {seedingLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-white dark:border-slate-900 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Generate Data Dummy Audit (Seeder)</span>
                </button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full table-auto text-left border-collapse text-xs text-slate-700 dark:text-slate-300">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-black text-[10px] uppercase tracking-wider">
                      <th className="px-3 py-3">Waktu & Kode Audit</th>
                      <th className="px-3 py-3">Produk & SKU</th>
                      <th className="px-3 py-3">Auditor</th>
                      <th className="px-2 py-3 text-center">Sistem</th>
                      <th className="px-2 py-3 text-center">Fisik</th>
                      <th className="px-2 py-3 text-center">Selisih</th>
                      <th className="px-3 py-3 text-right">Dampak Nilai (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {paginatedAudits.map((item) => {
                      const isLoss = item.diff < 0;
                      const isSurplus = item.diff > 0;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedAudit(item)}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors cursor-pointer border-b border-slate-200 dark:border-slate-800"
                          title="Klik untuk melihat catatan alasan audit"
                        >
                          {/* Waktu & Kode Audit */}
                          <td className="px-3 py-3 align-middle">
                            <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                              {item.auditCode}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                              {item.date}
                            </div>
                          </td>

                          {/* Produk & SKU */}
                          <td className="px-3 py-3 align-middle">
                            <div
                              className="font-bold text-slate-900 dark:text-slate-100 leading-snug truncate"
                              title={item.productName}
                            >
                              {item.productName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              <span className="font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                                {item.sku}
                              </span>
                            </div>
                          </td>

                          {/* Auditor */}
                          <td className="px-3 py-3 align-middle font-bold text-slate-900 dark:text-slate-100 truncate">
                            {item.auditorName}
                          </td>

                          {/* Sistem */}
                          <td className="px-2 py-3 align-middle text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {item.systemStock}
                          </td>

                          {/* Fisik */}
                          <td className="px-2 py-3 align-middle text-center font-mono font-black text-slate-900 dark:text-slate-100">
                            {item.physicalStock}
                          </td>

                          {/* Selisih */}
                          <td className="px-2 py-3 align-middle text-center font-mono font-black text-[10px]">
                            {isLoss ? (
                              <span className="bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-black text-[10px] px-1.5 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                                {item.diff}
                              </span>
                            ) : isSurplus ? (
                              <span className="bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-black text-[10px] px-1.5 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                                +{item.diff}
                              </span>
                            ) : (
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-400 dark:border-slate-600 font-mono font-bold text-[10px] px-1.5 py-0.5 rounded-md inline-block">
                                0
                              </span>
                            )}
                          </td>

                          {/* Dampak Nilai (Rp) */}
                          <td className="px-3 py-3 align-middle text-right font-mono font-black text-xs">
                            <span
                              className={
                                isLoss
                                  ? "text-[#E11D48] dark:text-rose-400"
                                  : isSurplus
                                  ? "text-[#4338CA] dark:text-indigo-400"
                                  : "text-slate-500 dark:text-slate-400 font-normal"
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
            )}

            {/* Integrated Reusable Pagination */}
            <div className="border-t-2 border-slate-900 dark:border-slate-100">
              <Pagination
                currentPage={currentPage}
                totalItems={reportData?.audits.length || 0}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. MODAL QUICK VIEW DETAIL TEMUAN AUDIT                                   */}
        {/* ========================================================================= */}
        {selectedAudit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 print:hidden">
            <div className="bg-white dark:bg-slate-900 border-3 border-slate-900 dark:border-slate-100 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] max-w-md w-full animate-in fade-in zoom-in-95 duration-150 transition-colors">
              <div className="pb-3 border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-black bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-0.5 rounded border border-slate-900 dark:border-slate-100">
                    {selectedAudit.auditCode}
                  </span>
                  <h3 className="font-black text-base text-slate-900 dark:text-slate-50 mt-1">
                    Detail Temuan Audit
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAudit(null)}
                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 flex items-center justify-center font-black text-xs transition-colors cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
                >
                  ✕
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Produk</span>
                  <span className="font-black text-slate-900 dark:text-slate-100 text-sm">{selectedAudit.productName}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] block">SKU: {selectedAudit.sku}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-2 border-slate-900 dark:border-slate-100 text-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <div>
                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 block uppercase">SISTEM</span>
                    <span className="font-mono font-black text-sm text-slate-800 dark:text-slate-200">{selectedAudit.systemStock}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 block uppercase">FISIK</span>
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">{selectedAudit.physicalStock}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 block uppercase">SELISIH</span>
                    <span className={`font-mono font-black text-sm ${selectedAudit.diff < 0 ? "text-[#E11D48] dark:text-rose-400" : selectedAudit.diff > 0 ? "text-[#4338CA] dark:text-indigo-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                      {selectedAudit.diff > 0 ? `+${selectedAudit.diff}` : selectedAudit.diff}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Dampak Nilai (Rp)</span>
                  <span className="font-mono font-black text-base text-slate-900 dark:text-slate-100">{formatRupiah(selectedAudit.impactValueRp)}</span>
                </div>

                <div>
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Kategori Alasan</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{selectedAudit.reason}</span>
                </div>

                <div>
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Catatan Auditor</span>
                  <p className="p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl font-bold text-slate-800 dark:text-slate-200 leading-relaxed mt-1 text-xs">
                    {selectedAudit.notes}
                  </p>
                </div>

                <div className="pt-1 text-[10px] text-slate-500 dark:text-slate-400 font-bold flex items-center justify-between">
                  <span>Auditor: <strong className="text-slate-900 dark:text-slate-100">{selectedAudit.auditorName}</strong></span>
                  <span>{selectedAudit.date}</span>
                </div>
              </div>

              <div className="pt-3 border-t-2 border-slate-900 dark:border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedAudit(null)}
                  className="px-4 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl text-xs font-black border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer"
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
            margin: 0 !important;
          }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          aside, nav, header, .sidebar, button, input, select {
            display: none !important;
          }
        }
      `}</style>
    </div>
  </div>
);
}
