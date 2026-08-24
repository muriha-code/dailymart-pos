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

import { expenseService } from "@/services/expense.service";
import toast from "react-hot-toast";

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
    "Biaya Operasional (Rp)",
    "Laba Bersih (Rp)",
    "Profit Margin (%)",
  ];

  const rows = data.map((item, index) => [
    index + 1,
    `"${item.formattedDate}"`,
    item.transactionCount,
    item.grossRevenue,
    item.totalCogs,
    item.grossProfit,
    item.operatingExpenses || 0,
    item.netProfit || item.grossProfit,
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

const EXPENSE_CATEGORIES = [
  "Gaji Karyawan",
  "Listrik & Air",
  "WiFi & Internet",
  "Sewa Toko",
  "Keamanan",
  "Kebersihan",
  "Operasional Toko",
  "Lainnya",
];

export default function AdminCashFlowReportPage() {
  // Active User Session
  const [user, setUser] = useState<{ displayName?: string; name?: string } | null>(null);

  // Data States
  const [reportData, setReportData] = useState<CashFlowReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Operating Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState<boolean>(false);
  const [expenseForm, setExpenseForm] = useState({
    name: "",
    category: "Operasional Toko",
    amount: 0,
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

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

  // Submit Operating Expense
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.name.trim()) {
      toast.error("Nama pengeluaran wajib diisi");
      return;
    }
    if (expenseForm.amount <= 0) {
      toast.error("Nominal pengeluaran harus lebih dari Rp 0");
      return;
    }

    setIsSubmittingExpense(true);
    try {
      await expenseService.createExpense({
        name: expenseForm.name.trim(),
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        date: expenseForm.date,
        notes: expenseForm.notes.trim() || undefined,
        createdBy: user?.displayName || user?.name || "Admin",
      });

      toast.success("Biaya operasional berhasil dicatat!");
      setIsExpenseModalOpen(false);
      setExpenseForm({
        name: "",
        category: "Operasional Toko",
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      loadReportData();
    } catch (err: any) {
      console.error("Gagal mencatat biaya:", err);
      toast.error(err.message || "Gagal mencatat biaya operasional");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Filtered & Paginated Daily Breakdown Table Data
  const dailyList = useMemo(() => {
    return reportData?.dailyBreakdown || [];
  }, [reportData]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return dailyList.slice(start, start + ITEMS_PER_PAGE);
  }, [dailyList, currentPage]);

  // Executive Summary Print Values
  const totalTransactions = useMemo(() => {
    return dailyList.reduce((acc, row) => acc + (row.transactionCount || 0), 0);
  }, [dailyList]);

  const grossRevenue = reportData?.summary.grossRevenue || 0;
  const totalCogs = reportData?.summary.totalCogs || 0;
  const grossProfit = reportData?.summary.grossProfit || 0;
  const totalOperatingExpenses = reportData?.summary.totalOperatingExpenses || 0;
  const netProfit = reportData?.summary.netProfit ?? (grossProfit - totalOperatingExpenses);
  const marginPercentage = reportData?.summary.marginPercentage || 0;
  const surplusDefisit = grossRevenue - totalOperatingExpenses;

  const periodLabel = useMemo(() => {
    if (periodFilter === "today") {
      return new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    }
    if (periodFilter === "7days") {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      return `${start.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} - ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    if (periodFilter === "30days") {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      return `${start.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} - ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    if (periodFilter === "thisMonth") {
      return new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    }
    if (periodFilter === "custom" && startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} - ${new Date(endDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`;
    }
    return "Semua Waktu";
  }, [periodFilter, startDate, endDate]);

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
      <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:w-full print:m-0 print:space-y-0">
        
        {/* ========================================================================= */}
        {/* PRINT ONLY: RINGKASAN EKSEKUTIF ARUS KAS & LABA RUGI (1 HALAMAN A4)      */}
        {/* ========================================================================= */}
        <div className="hidden print:block w-full max-w-2xl mx-auto text-slate-900 font-sans text-xs space-y-3 print:px-8 print:py-6">
          {/* Header Kop Dokumen */}
          <div className="border-t-2 border-b border-slate-900 py-2.5 text-center space-y-0.5">
            <h1 className="text-base font-black tracking-wider uppercase text-slate-900">
              DAILYMART POS
            </h1>
            <p className="text-xs font-bold text-slate-800">
              Ringkasan Eksekutif Arus Kas & Laba Rugi
            </p>
            <p className="text-[10px] text-slate-600">
              Jl. Raya Utama No. 88, Jakarta Selatan • Telp: (021) 555-0199
            </p>
          </div>

          {/* Baris Informasi Metadata Dokumen */}
          <div className="border-b-2 border-slate-900 pb-2 flex justify-between items-start text-[11px]">
            <div className="space-y-0.5">
              <div className="font-extrabold uppercase tracking-wide text-slate-900">
                DOKUMEN FINANSIAL RESMI
              </div>
              <div className="text-slate-700">
                <span>Periode Laporan : </span>
                <span className="font-bold text-slate-900">{periodLabel}</span>
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
                  {user?.displayName || user?.name || "Store Manager"}
                </span>
              </div>
            </div>
          </div>

          {/* ==================== TABEL 1: RINGKASAN KINERJA FINANSIAL ==================== */}
          <div className="border border-slate-900 overflow-hidden shadow-none mt-4">
            <div className="bg-slate-100 border-b border-slate-900 text-center py-1.5 font-bold uppercase tracking-wider text-xs text-slate-900">
              RINGKASAN KINERJA FINANSIAL
            </div>
            <div className="divide-y divide-slate-300 text-xs">
              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Total Transaksi (Volume Sales)
                </div>
                <div className="col-span-6 font-bold text-slate-900 border-l border-slate-300 pl-3.5">
                  {totalTransactions} Transaksi
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Total Pendapatan Kotor (Omzet)
                </div>
                <div className="col-span-6 font-bold text-slate-900 border-l border-slate-300 pl-3.5 font-mono">
                  {formatRupiah(grossRevenue)}
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Total HPP (Harga Pokok Penjualan)
                </div>
                <div className="col-span-6 font-medium text-slate-700 border-l border-slate-300 pl-3.5 font-mono">
                  {formatRupiah(totalCogs)}
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2 bg-slate-50 border-t border-slate-900">
                <div className="col-span-6 font-bold text-slate-900 uppercase">
                  LABA KOTOR (Gross Profit)
                </div>
                <div className="col-span-6 font-bold text-slate-900 border-l border-slate-300 pl-3.5 font-mono">
                  {formatRupiah(grossProfit)}
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Total Biaya Operasional / Pengeluaran
                </div>
                <div className="col-span-6 font-medium text-slate-700 border-l border-slate-300 pl-3.5 font-mono">
                  {formatRupiah(totalOperatingExpenses)}
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2.5 bg-slate-100 border-t border-slate-900">
                <div className="col-span-6 font-extrabold text-slate-900 uppercase">
                  LABA BERSIH (NET PROFIT)
                </div>
                <div className="col-span-6 font-extrabold text-slate-900 border-l border-slate-300 pl-3.5">
                  <span className="font-mono">{formatRupiah(netProfit)}</span>{" "}
                  <span className="font-semibold text-[11px] text-slate-700">
                    (Margin: {marginPercentage.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== TABEL 2: RINGKASAN MUTASI ARUS KAS ==================== */}
          <div className="border border-slate-900 overflow-hidden shadow-none mt-3.5">
            <div className="bg-slate-100 border-b border-slate-900 text-center py-1.5 font-bold uppercase tracking-wider text-xs text-slate-900">
              RINGKASAN MUTASI ARUS KAS (CASH FLOW)
            </div>
            <div className="divide-y divide-slate-300 text-xs">
              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Kas Masuk (Total Penerimaan Penjualan)
                </div>
                <div className="col-span-6 font-bold text-slate-900 border-l border-slate-300 pl-3.5 font-mono">
                  + {formatRupiah(grossRevenue)}
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Kas Keluar (Pengeluaran Operasional & Restok)
                </div>
                <div className="col-span-6 font-medium text-slate-700 border-l border-slate-300 pl-3.5 font-mono">
                  - {formatRupiah(totalOperatingExpenses)}
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2.5 bg-slate-50 border-t border-slate-900">
                <div className="col-span-6 font-extrabold text-slate-900 uppercase">
                  SURPLUS / DEFISIT ARUS KAS BERSIH
                </div>
                <div className="col-span-6 font-extrabold text-slate-900 border-l border-slate-300 pl-3.5 font-mono">
                  {surplusDefisit >= 0 ? "+ " : "- "}
                  {formatRupiah(Math.abs(surplusDefisit))}
                </div>
              </div>
            </div>
          </div>

          {/* ==================== BLOK TANDA TANGAN ==================== */}
          <div className="pt-8 pb-3 border-b-2 border-slate-900">
            <div className="grid grid-cols-2 text-xs">
              <div className="flex flex-col items-start space-y-1">
                <p className="font-medium text-slate-700">Dibuat & Diverifikasi Oleh,</p>
                <div className="h-16" />
                <p className="font-bold text-slate-900">
                  ( {user?.displayName || user?.name || "Store Manager"} )
                </p>
                <p className="text-[10px] text-slate-500">Bagian Keuangan DailyMart POS</p>
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

        {/* ==================== SCREEN ONLY CONTAINER ==================== */}
        <div className="print:hidden space-y-3">
          {/* 1. Header Bar Padat */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 p-0">
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                Laporan Arus Kas & Laba Rugi
              </h1>
              <p className="hidden sm:block text-[11px] font-bold text-slate-500 mt-0.5">
                Monitoring omzet, HPP (COGS), laba kotor, beban operasional, dan laba bersih toko
              </p>
            </div>

            {/* Action Buttons: Catat Biaya, Cetak Dropdown & Refresh */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {/* Primary Button: Catat Biaya Toko */}
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(true)}
                className="bg-[#FFB800] hover:bg-[#FFA800] text-slate-950 font-black text-xs py-1.5 px-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>💸</span>
                <span>+ Catat Biaya Toko</span>
              </button>

              {/* Secondary Button: Integrated Print/Export Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs py-1.5 px-3 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Cetak / Ekspor PDF</span>
                  <svg className={`w-3 h-3 text-white transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu Card (Neo-Brutalism) */}
                {isExportOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white p-2.5 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
                    {/* Opsi 1: Cetak Dokumen (PDF) */}
                    <button
                      type="button"
                      onClick={handlePrintPDF}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 text-left transition-colors cursor-pointer border border-transparent hover:border-slate-900"
                    >
                      <span className="p-1.5 bg-[#EEF2FF] text-[#4338CA] border border-slate-900 rounded-md">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                      </span>
                      <div>
                        <div className="text-xs font-black text-slate-900">
                          Cetak Dokumen (PDF)
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold">
                          Format formal A4 Portrait
                        </div>
                      </div>
                    </button>

                    {/* Opsi 2: Ekspor CSV (Excel) */}
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 text-left transition-colors cursor-pointer border border-transparent hover:border-slate-900"
                    >
                      <span className="p-1.5 bg-[#E8F5E9] text-[#065F46] border border-slate-900 rounded-md">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      <div>
                        <div className="text-xs font-black text-slate-900">
                          Ekspor CSV (Excel)
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold">
                          Unduh data mentah (.csv)
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Icon Button: Refresh */}
              <button
                type="button"
                onClick={loadReportData}
                disabled={isLoading}
                title="Refresh Data"
                className="bg-white hover:bg-slate-100 border-2 border-slate-900 p-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-slate-900 transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                <svg className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {/* 2. Kompresi 5 Cards KPI Financial Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
            {/* Card 1 (Pendapatan Kotor) */}
            <div className="bg-white border-2 border-slate-900 rounded-xl p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-500 mb-0.5">
                Pendapatan Kotor
              </span>
              <div className="mt-1">
                <h3 className="text-base sm:text-lg font-black font-mono text-slate-900 tracking-tight">
                  {isLoading ? "..." : formatRupiah(reportData?.summary.grossRevenue || 0)}
                </h3>
              </div>
            </div>

            {/* Card 2 (Total HPP / COGS) */}
            <div className="bg-[#F1F5F9] border-2 border-slate-900 rounded-xl p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-500 mb-0.5">
                Total HPP / COGS
              </span>
              <div className="mt-1">
                <h3 className="text-base sm:text-lg font-black font-mono text-slate-700 tracking-tight">
                  {isLoading ? "..." : formatRupiah(reportData?.summary.totalCogs || 0)}
                </h3>
              </div>
            </div>

            {/* Card 3 (Laba Kotor) */}
            <div className="bg-[#EEF2FF] border-2 border-slate-900 rounded-xl p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-500 mb-0.5">
                Laba Kotor
              </span>
              <div className="mt-1">
                <h3 className="text-[#4338CA] font-mono font-black text-base sm:text-lg tracking-tight">
                  {isLoading ? "..." : formatRupiah(reportData?.summary.grossProfit || 0)}
                </h3>
              </div>
            </div>

            {/* Card 4 (Biaya Operasional) */}
            <div className="bg-[#FFE4E6] border-2 border-slate-900 rounded-xl p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-500 mb-0.5">
                Biaya Operasional
              </span>
              <div className="mt-1">
                <h3 className="text-[#E11D48] font-mono font-black text-base sm:text-lg tracking-tight">
                  {isLoading ? "..." : formatRupiah(reportData?.summary.totalOperatingExpenses || 0)}
                </h3>
              </div>
            </div>

            {/* Card 5 (Laba Bersih Toko) */}
            <div className="bg-[#E8F5E9] border-2 border-slate-900 rounded-xl p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all sm:col-span-2 lg:col-span-1">
              <span className="text-[9px] font-black uppercase text-slate-500 mb-0.5">
                Laba Bersih Toko
              </span>
              <div className="mt-1">
                <h3 className="text-[#065F46] font-mono font-black text-base sm:text-lg tracking-tight">
                  {isLoading
                    ? "..."
                    : formatRupiah(
                        reportData?.summary.netProfit ??
                          (reportData?.summary.grossProfit || 0) - (reportData?.summary.totalOperatingExpenses || 0)
                      )}
                </h3>
              </div>
            </div>
          </div>

          {/* 3. Inline Filter Bar */}
          <div className="bg-white border-2 border-slate-900 rounded-xl p-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex flex-wrap items-center gap-2.5 mb-3">
            {/* Rentang Periode Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">PERIODE:</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="bg-slate-50 border-2 border-slate-900 rounded-full px-3 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
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
              <div className="flex items-center gap-1.5 animate-in fade-in duration-200">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-slate-50 border-2 border-slate-900 rounded-full px-3 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
                />
                <span className="text-[10px] font-black text-slate-700">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-slate-50 border-2 border-slate-900 rounded-full px-3 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
                />
              </div>
            )}

            {/* Filter Kategori Produk */}
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">KATEGORI:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border-2 border-slate-900 rounded-full px-3 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:bg-white shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                {reportData?.categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                )) || <option value="ALL">Semua Kategori</option>}
              </select>
            </div>
          </div>

          {/* 4. Potong Ketinggian Chart Container (Agresif Height Reduction) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
            {/* Tren Finansial Harian (lg:col-span-2) */}
            <div className="lg:col-span-2 bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Tren Finansial Harian
                  </h3>
                </div>
                <div className="flex items-center gap-2.5 text-[10px] font-black">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6] border border-slate-900 inline-block" /> Pendapatan
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#94A3B8] border border-slate-900 inline-block" /> HPP
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981] border border-slate-900 inline-block" /> Laba Kotor
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-xs font-bold text-slate-400">
                  Memuat grafik...
                </div>
              ) : reportData?.chartData.length === 0 ? (
                <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-xs font-bold text-slate-400">
                  Tidak ada data grafik pada periode ini.
                </div>
              ) : (
                <div className="h-[180px] sm:h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={reportData?.chartData}
                      margin={{ top: 10, right: 10, left: 5, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={{ stroke: "#0F172A", strokeWidth: 1.5 }}
                        tick={{ fontSize: 10, fill: "#0F172A", fontWeight: 700 }}
                      />
                      <YAxis
                        width={50}
                        tickLine={false}
                        axisLine={{ stroke: "#0F172A", strokeWidth: 1.5 }}
                        tick={{ fontSize: 10, fill: "#0F172A", fontWeight: 700 }}
                        tickFormatter={(val) => `Rp${(val / 1000000).toFixed(1)}M`}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white text-slate-900 p-2.5 rounded-xl shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] text-xs space-y-1 border-2 border-slate-900">
                                <p className="font-black text-slate-900 mb-1 border-b-2 border-slate-900 pb-1">
                                  {label}
                                </p>
                                <p className="text-blue-600 font-bold">
                                  Revenue: {formatRupiah(Number(payload[0]?.value || 0))}
                                </p>
                                <p className="text-slate-600 font-bold">
                                  HPP: {formatRupiah(Number(payload[1]?.value || 0))}
                                </p>
                                <p className="text-emerald-600 font-black">
                                  Profit: {formatRupiah(Number(payload[2]?.value || 0))}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="revenue" fill="#3B82F6" radius={[3, 3, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="cogs" fill="#94A3B8" radius={[3, 3, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="profit" fill="#10B981" radius={[3, 3, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Kontribusi Laba per Kategori (lg:col-span-1) */}
            <div className="lg:col-span-1 bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-0.5">
                  Kontribusi Laba per Kategori
                </h3>
              </div>

              {isLoading ? (
                <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-xs font-bold text-slate-400">
                  Memuat kategori...
                </div>
              ) : reportData?.categoryProfit.length === 0 ? (
                <div className="h-[180px] sm:h-[200px] flex items-center justify-center text-xs font-bold text-slate-400">
                  Tidak ada data kategori.
                </div>
              ) : (
                <div className="h-[130px] sm:h-[145px] w-full relative my-0.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData?.categoryProfit}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={32}
                        outerRadius={50}
                        paddingAngle={3}
                      >
                        {reportData?.categoryProfit.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                            stroke="#0F172A"
                            strokeWidth={1.5}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            return (
                              <div className="bg-white text-slate-900 p-2 rounded-lg shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-xs border-2 border-slate-900 font-bold">
                                <p className="font-black text-slate-900">{data.name}</p>
                                <p className="text-emerald-700 font-mono mt-0.5">{formatRupiah(Number(data.value || 0))}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Dynamic Legend List */}
              <div className="grid grid-cols-1 gap-0.5 mt-1 text-[10px] max-h-16 overflow-y-auto pr-1">
                {reportData?.categoryProfit.map((item, idx) => {
                  const totalProf = reportData.summary.grossProfit || 1;
                  const pct = ((item.value / totalProf) * 100).toFixed(1);
                  return (
                    <div key={item.name} className="flex items-center justify-between text-[10px]">
                      <span className="flex items-center gap-1.5 truncate">
                        <span
                          className="w-2 h-2 rounded-full shrink-0 border border-slate-900"
                          style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                        />
                        <span className="text-slate-800 truncate font-bold text-[10px]">{item.name}</span>
                      </span>
                      <div className="text-right shrink-0">
                        <span className="font-bold font-mono text-slate-900 text-[10px]">{formatRupiah(item.value)}</span>
                        <span className="text-[9px] text-slate-600 ml-1 font-mono font-bold">({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. Table Rekapitulasi Arus Kas & Margin */}
          <div className="bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden print:border-slate-400 print:rounded-none print:shadow-none">
            <div className="p-4 border-b-2 border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 print:p-2 bg-white">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Rekapitulasi Arus Kas & Margin
                </h3>
                <p className="text-[11px] font-semibold text-slate-500 print:text-[10px] mt-0.5">
                  Rincian transaksi, omzet, modal HPP, biaya operasional, dan laba per tanggal
                </p>
              </div>
              <span className="text-xs text-slate-900 font-bold print:hidden bg-slate-100 border border-slate-900 px-2.5 py-1 rounded-lg">
                Total {dailyList.length} Periode Hari
              </span>
            </div>

            {error ? (
              <div className="p-8 text-center text-xs font-bold text-red-600 bg-red-50">
                {error}
              </div>
            ) : isLoading ? (
              <div className="p-8 text-center text-xs font-bold text-slate-500">
                Memuat tabel arus kas...
              </div>
            ) : dailyList.length === 0 ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">
                Tidak ada data arus kas untuk filter yang dipilih.
              </div>
            ) : (
              <>
                {/* Screen Version (100% Fit Width Table) */}
                <div className="w-full print:hidden">
                  <table className="w-full table-fixed text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-900 font-black text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-3 w-[15%]">Tanggal</th>
                        <th className="py-3 px-2 w-[8%] text-center">Tx</th>
                        <th className="py-3 px-2.5 w-[16%] text-right">Pendapatan</th>
                        <th className="py-3 px-2.5 w-[14%] text-right font-mono">Total HPP</th>
                        <th className="py-3 px-2.5 w-[14%] text-right font-bold text-blue-700">Laba Kotor</th>
                        <th className="py-3 px-2.5 w-[14%] text-right font-bold text-rose-600">Biaya Ops</th>
                        <th className="py-3 px-2.5 w-[14%] text-right font-black text-emerald-700">Laba Bersih</th>
                        <th className="py-3 px-2 w-[8%] text-center font-bold">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paginatedData.map((row) => {
                        const netProfit = row.netProfit ?? (row.grossProfit - (row.operatingExpenses || 0));
                        return (
                          <tr key={row.date} className="border-b border-slate-200 hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-bold text-slate-900 w-[15%]">
                              {row.formattedDate}
                            </td>
                            <td className="py-3 px-2 text-center w-[8%]">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-black text-[10px] border border-slate-300">
                                {row.transactionCount}
                              </span>
                            </td>
                            <td className="py-3 px-2.5 text-right font-bold text-slate-900 font-mono w-[16%]">
                              {formatRupiah(row.grossRevenue)}
                            </td>
                            <td className="py-3 px-2.5 text-right text-slate-600 font-mono font-medium w-[14%]">
                              {formatRupiah(row.totalCogs)}
                            </td>
                            <td className="py-3 px-2.5 text-right font-bold text-blue-700 font-mono w-[14%]">
                              {formatRupiah(row.grossProfit)}
                            </td>
                            <td className="py-3 px-2.5 text-right font-bold text-rose-600 font-mono w-[14%]">
                              {row.operatingExpenses ? `-${formatRupiah(row.operatingExpenses)}` : "Rp 0"}
                            </td>
                            <td className="py-3 px-2.5 text-right font-black text-emerald-700 font-mono w-[14%]">
                              {formatRupiah(netProfit)}
                            </td>
                            <td className="py-3 px-2 text-center w-[8%]">
                              <span className="bg-[#FEF3C7] text-[#B45309] border border-slate-900 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] inline-block">
                                {row.margin.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  <div className="p-2 border-t-2 border-slate-900">
                    <Pagination
                      currentPage={currentPage}
                      totalItems={dailyList.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={(page) => setCurrentPage(page)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ==================== MODAL CATAT BIAYA OPERASIONAL ==================== */}
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto print:hidden">
            <div className="bg-white border-3 border-slate-900 rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] max-w-md w-full animate-in fade-in zoom-in-95 duration-150 my-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-slate-900">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Catat Biaya Operasional Toko
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                    Beban usaha minimarket (Gaji, Listrik, WiFi, Sewa, dll)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-900 border-2 border-slate-900 w-8 h-8 rounded-lg flex items-center justify-center font-black shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitExpense} className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1 block">
                    Nama Pengeluaran / Beban <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseForm.name}
                    onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                    placeholder="Contoh: Tagihan Listrik Toko Bulan Ini"
                    className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1 block">
                      Kategori Biaya <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full cursor-pointer"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1 block">
                      Tanggal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1 block">
                    Nominal Rp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="100"
                    required
                    value={expenseForm.amount || ""}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    placeholder="0"
                    className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-black font-mono text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1 block">
                    Catatan / Keterangan (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    placeholder="Contoh: Pembayaran melalui transfer bank BCA"
                    className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full resize-none"
                  />
                </div>

                {/* Modal Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs py-3 px-4 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all w-full cursor-pointer order-2 sm:order-1"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingExpense}
                    className="bg-[#E11D48] hover:bg-[#BE123C] text-white font-black text-xs py-3 px-4 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all w-full cursor-pointer disabled:opacity-50 order-1 sm:order-2"
                  >
                    {isSubmittingExpense ? "Menyimpan..." : "Simpan Biaya"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Global CSS for Print Optimization */}
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
  );
}
