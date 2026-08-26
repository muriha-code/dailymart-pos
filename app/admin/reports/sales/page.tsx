"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  SalesReportResponse,
  TransactionReportItem,
  PaymentMethodBreakdown,
  TopSellingProduct,
  DailySalesChartData,
} from "@/types/salesReport.types";
import { PaymentMethod } from "@/types/transaction.types";
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

import { safeParseDate } from "@/lib/utils/date";

// Helper Rupiah
const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

// Helper Date Range Checker with Safe Date Parsing
const checkDateInPeriod = (
  dateInput: any,
  period: string,
  startStr?: string,
  endStr?: string
): boolean => {
  const date = safeParseDate(dateInput);
  const now = new Date();

  if (period === "today") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return date >= startOfToday && date <= endOfToday;
  }
  if (period === "7days") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    return date >= start;
  }
  if (period === "30days") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
    return date >= start;
  }
  if (period === "thisMonth") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return date >= start;
  }
  if (period === "thisYear") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return date >= start;
  }
  if (period === "custom") {
    if (!startStr || String(startStr).trim() === "") return true;
    const start = safeParseDate(startStr);
    start.setHours(0, 0, 0, 0);
    let end = new Date();
    if (endStr && String(endStr).trim() !== "") {
      end = safeParseDate(endStr);
      end.setHours(23, 59, 59, 999);
    }
    return date >= start && date <= end;
  }
  return true; // 'all'
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

  // Load Sales Report Data with Safe Guard
  const loadSalesReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Guard Check: pastikan period dan filter valid
      const targetPeriod = periodFilter && periodFilter !== "undefined" ? periodFilter : "all";
      const targetPayment = paymentFilter && paymentFilter !== "undefined" ? paymentFilter : "ALL";

      const data = await salesReportService.getSalesReport({
        period: targetPeriod as any,
        startDate: targetPeriod === "custom" && startDate ? startDate : undefined,
        endDate: targetPeriod === "custom" && endDate ? endDate : undefined,
        paymentMethod: targetPayment !== "ALL" ? targetPayment : undefined,
      });
      setReportData(data);
    } catch (err: any) {
      console.error("Error loading sales report:", err);
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

  // 1. Centralized Reactive Data Filtering (filteredSales)
  const filteredSales = useMemo(() => {
    if (!reportData?.transactions) return [];

    return reportData.transactions.filter((sale) => {
      // 1. Filter Tanggal / Periode dengan safe date parser
      const saleDate = safeParseDate(sale.createdAt || sale.date);
      const isDateMatch = checkDateInPeriod(saleDate, periodFilter, startDate, endDate);

      // 2. Filter Jenis Pembayaran
      const isPaymentMatch =
        paymentFilter === "ALL" ||
        sale.paymentMethod?.toUpperCase() === paymentFilter.toUpperCase();

      return isDateMatch && isPaymentMatch;
    });
  }, [reportData?.transactions, periodFilter, startDate, endDate, paymentFilter]);

  // 2. Dynamic KPI Summaries calculated live from filteredSales
  const summaryMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalItemsSold = 0;

    filteredSales.forEach((tx) => {
      totalRevenue += tx.grandTotal || tx.subtotal || 0;
      if (tx.itemsCount) {
        totalItemsSold += tx.itemsCount;
      } else if (tx.items) {
        totalItemsSold += tx.items.reduce((acc, item) => acc + (item.quantity || 1), 0);
      }
    });

    const totalTransactions = filteredSales.length;
    const averageTransactionValue =
      totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    return {
      totalRevenue,
      totalTransactions,
      totalItemsSold,
      averageTransactionValue,
    };
  }, [filteredSales]);

  // 3. Dynamic Daily Sales Chart calculated live from filteredSales
  const dailyChartData = useMemo<DailySalesChartData[]>(() => {
    const dailyMap: Record<string, { date: string; timestamp: number; revenue: number; transactions: number }> = {};

    filteredSales.forEach((tx) => {
      const d = safeParseDate(tx.createdAt || tx.date);

      const dateKey = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;
      const dayTimestamp = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, timestamp: dayTimestamp, revenue: 0, transactions: 0 };
      }
      dailyMap[dateKey].revenue += tx.grandTotal || tx.subtotal || 0;
      dailyMap[dateKey].transactions += 1;
    });

    return Object.values(dailyMap)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(({ date, revenue, transactions }) => ({ date, revenue, transactions }));
  }, [filteredSales]);

  // 4. Dynamic Payment Breakdown calculated live from filteredSales
  const paymentBreakdownData = useMemo<PaymentMethodBreakdown[]>(() => {
    const paymentMap: Record<string, { amount: number; count: number }> = {
      CASH: { amount: 0, count: 0 },
      QRIS: { amount: 0, count: 0 },
      DEBIT: { amount: 0, count: 0 },
      TRANSFER: { amount: 0, count: 0 },
    };

    let totalRev = 0;
    filteredSales.forEach((tx) => {
      const grandTotal = tx.grandTotal || tx.subtotal || 0;
      totalRev += grandTotal;
      const method = (tx.paymentMethod?.toUpperCase() as PaymentMethod) || "CASH";

      if (!paymentMap[method]) {
        paymentMap[method] = { amount: 0, count: 0 };
      }
      paymentMap[method].amount += grandTotal;
      paymentMap[method].count += 1;
    });

    const methodsToShow = ["CASH", "QRIS", "DEBIT", "TRANSFER"] as PaymentMethod[];
    return methodsToShow
      .map((method) => {
        const item = paymentMap[method] || { amount: 0, count: 0 };
        return {
          method,
          amount: item.amount,
          count: item.count,
          percentage: totalRev > 0 ? Math.round((item.amount / totalRev) * 100) : 0,
        };
      })
      .filter((pb) => paymentFilter === "ALL" || pb.method === paymentFilter.toUpperCase());
  }, [filteredSales, paymentFilter]);

  // 5. Dynamic Top 5 Products calculated live from filteredSales
  const topProductsData = useMemo<TopSellingProduct[]>(() => {
    const productMap: Record<string, TopSellingProduct> = {};

    filteredSales.forEach((tx) => {
      const items = tx.items || [];
      items.forEach((it) => {
        const qty = it.quantity || 1;
        const pId = it.productId || it.productName || "UNKNOWN";

        if (!productMap[pId]) {
          productMap[pId] = {
            productId: pId,
            sku: it.sku || pId,
            productName: it.productName || "Produk Non-SKU",
            categoryName: it.categoryName || "Umum",
            quantitySold: 0,
            totalRevenue: 0,
          };
        }
        productMap[pId].quantitySold += qty;
        productMap[pId].totalRevenue += it.subtotal || it.price * qty;
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.quantitySold - a.quantitySold || b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [filteredSales]);

  // 6. Filtered Transaction List (with Search Query)
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return filteredSales;

    const query = searchQuery.toLowerCase().trim();
    return filteredSales.filter(
      (tx) =>
        tx.invoiceNumber.toLowerCase().includes(query) ||
        tx.cashierName.toLowerCase().includes(query) ||
        tx.paymentMethod.toLowerCase().includes(query)
    );
  }, [filteredSales, searchQuery]);

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
    if (filteredTransactions && filteredTransactions.length > 0) {
      exportTransactionsCSV(filteredTransactions);
    } else {
      alert("Tidak ada data transaksi terfilter untuk diekspor!");
    }
  };

  const periodText =
    periodFilter === "today"
      ? "Hari Ini"
      : periodFilter === "7days"
      ? "7 Hari Terakhir"
      : periodFilter === "30days"
      ? "30 Hari Terakhir"
      : periodFilter === "thisMonth"
      ? "Bulan Ini"
      : periodFilter === "thisYear"
      ? "Tahun Ini"
      : periodFilter === "custom"
      ? `Kustom (${startDate || "-"} s/d ${endDate || "-"})`
      : "Semua Waktu";

  // Colors for charts
  const METHOD_COLORS: Record<string, string> = {
    CASH: "#10B981", // Mint / Emerald
    QRIS: "#6366F1", // Indigo
    DEBIT: "#F59E0B", // Amber
    TRANSFER: "#3B82F6", // Blue
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-[#0F172A] p-4 lg:p-6 print:p-0 print:bg-white print:m-0 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:w-full print:m-0 print:space-y-0">
        {/* ========================================================================= */}
        {/* PRINT ONLY: RINGKASAN EKSEKUTIF PERFORMA PENJUALAN RETAIL (1 HALAMAN A4)  */}
        {/* ========================================================================= */}
        <div className="hidden print:block w-full max-w-2xl mx-auto text-slate-900 font-sans text-xs space-y-3 print:px-8 print:py-6">
          {/* Header Kop Dokumen */}
          <div className="border-t-2 border-b border-slate-900 py-2.5 text-center space-y-0.5">
            <h1 className="text-base font-black tracking-wider uppercase text-slate-900">
              DAILYMART POS
            </h1>
            <p className="text-xs font-bold text-slate-800">
              Ringkasan Eksekutif Performa Penjualan Retail
            </p>
            <p className="text-[10px] text-slate-600">
              Jl. Retail Utama No. 88, Jakarta Selatan • Telp: (021) 555-0199
            </p>
          </div>

          {/* Baris Informasi Metadata Dokumen */}
          <div className="border-b-2 border-slate-900 pb-2 flex justify-between items-start text-[11px]">
            <div className="space-y-0.5">
              <div className="font-extrabold uppercase tracking-wide text-slate-900">
                DOKUMEN PENJUALAN RESMI
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

          {/* ==================== TABEL 1: METRIK UTAMA PENJUALAN ==================== */}
          <div className="border border-slate-900 overflow-hidden shadow-none mt-4">
            <div className="bg-slate-100 border-b border-slate-900 text-center py-1.5 font-bold uppercase tracking-wider text-xs text-slate-900">
              METRIK UTAMA PENJUALAN
            </div>
            <div className="divide-y divide-slate-300 text-xs">
              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Total Volume Transaksi
                </div>
                <div className="col-span-6 font-bold text-slate-900 border-l border-slate-300 pl-3.5">
                  {summaryMetrics.totalTransactions} Transaksi
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Total Barang Terjual (Unit)
                </div>
                <div className="col-span-6 font-bold text-slate-900 border-l border-slate-300 pl-3.5">
                  {summaryMetrics.totalItemsSold} Unit Item
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2">
                <div className="col-span-6 font-medium text-slate-800">
                  Rata-Rata Nilai Transaksi (AOV)
                </div>
                <div className="col-span-6 font-semibold text-slate-700 border-l border-slate-300 pl-3.5 font-mono">
                  {formatRupiah(summaryMetrics.averageTransactionValue)} / Transaksi
                </div>
              </div>

              <div className="grid grid-cols-12 px-3.5 py-2.5 bg-slate-100 border-t border-slate-900">
                <div className="col-span-6 font-extrabold text-slate-900 uppercase">
                  TOTAL OMZET PENJUALAN (GROSS SALES)
                </div>
                <div className="col-span-6 font-extrabold text-slate-900 border-l border-slate-300 pl-3.5 font-mono">
                  {formatRupiah(summaryMetrics.totalRevenue)}
                </div>
              </div>
            </div>
          </div>

          {/* ==================== TABEL 2: RINCIAN PENJUALAN BERDASARKAN METODE BAYAR ==================== */}
          <div className="border border-slate-900 overflow-hidden shadow-none mt-3.5">
            <div className="bg-slate-100 border-b border-slate-900 text-center py-1.5 font-bold uppercase tracking-wider text-xs text-slate-900">
              RINCIAN PENJUALAN BERDASARKAN METODE BAYAR
            </div>
            <div className="grid grid-cols-12 px-3.5 py-1.5 bg-slate-50 border-b border-slate-400 text-[11px] font-bold text-slate-800 uppercase">
              <div className="col-span-6">METODE PEMBAYARAN</div>
              <div className="col-span-3 border-l border-slate-300 pl-3">JUMLAH TX</div>
              <div className="col-span-3 border-l border-slate-300 pl-3 text-right">TOTAL PENERIMAAN</div>
            </div>
            <div className="divide-y divide-slate-300 text-xs">
              {paymentBreakdownData && paymentBreakdownData.length > 0 ? (
                paymentBreakdownData.map((item) => {
                  const label =
                    item.method === "CASH"
                      ? "Tunai / Cash"
                      : item.method === "QRIS"
                      ? "Non-Tunai / QRIS"
                      : item.method === "DEBIT"
                      ? "Kartu Debit"
                      : item.method === "TRANSFER"
                      ? "Transfer Bank"
                      : item.method;
                  return (
                    <div key={item.method} className="grid grid-cols-12 px-3.5 py-2">
                      <div className="col-span-6 font-medium text-slate-800">
                        {label}
                      </div>
                      <div className="col-span-3 font-semibold text-slate-700 border-l border-slate-300 pl-3">
                        {item.count} Transaksi
                      </div>
                      <div className="col-span-3 font-mono font-bold text-slate-900 border-l border-slate-300 pl-3 text-right">
                        {formatRupiah(item.amount)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="grid grid-cols-12 px-3.5 py-2">
                  <div className="col-span-6 font-medium text-slate-800">Tunai / Cash</div>
                  <div className="col-span-3 font-semibold text-slate-700 border-l border-slate-300 pl-3">0 Transaksi</div>
                  <div className="col-span-3 font-mono font-bold text-slate-900 border-l border-slate-300 pl-3 text-right">Rp 0</div>
                </div>
              )}

              {/* Total Penerimaan Kas Footer */}
              <div className="grid grid-cols-12 px-3.5 py-2.5 bg-slate-100 border-t border-slate-900 font-extrabold">
                <div className="col-span-6 text-slate-900 uppercase">
                  TOTAL PENERIMAAN KAS
                </div>
                <div className="col-span-3 text-slate-900 border-l border-slate-300 pl-3">
                  {summaryMetrics.totalTransactions} Transaksi
                </div>
                <div className="col-span-3 text-slate-900 border-l border-slate-300 pl-3 font-mono text-right">
                  {formatRupiah(summaryMetrics.totalRevenue)}
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
                <p className="text-[10px] text-slate-500">Administrator Retail</p>
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
                Laporan Penjualan & Performa Retail
              </h1>
              <p className="hidden sm:block text-[11px] text-slate-600 dark:text-slate-400 font-bold mt-0.5">
                Monitoring omzet penjualan, tren grafik harian, metode pembayaran, dan produk terlaris.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              {/* Primary: Cetak / Ekspor Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsExportOpen(!isExportOpen)}
                  className="bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#4338CA] text-white font-black text-xs py-1.5 px-3 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-1.5 cursor-pointer"
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
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Format resmi A4 Ringkasan</div>
                      </div>
                    </button>

                    <div className="my-1 border-t-2 border-slate-200 dark:border-slate-800" />

                    {/* Opsi 2: Ekspor CSV Excel */}
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer border border-transparent hover:border-slate-900 dark:hover:border-slate-100"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-slate-900 dark:border-slate-100 text-emerald-700 dark:text-emerald-300">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-slate-100">Ekspor CSV (Excel)</div>
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Unduh lembar kerja mentah</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary: Refresh */}
              <button
                type="button"
                onClick={loadSalesReport}
                title="Refresh Data"
                className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-100 p-1.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-slate-900 dark:text-slate-100 transition-all cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
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

          {/* 2. Kompresi 4 Cards KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {/* Card 1 (Total Omset Penjualan) */}
            <div className="bg-[#E8F5E9] dark:bg-emerald-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 mb-0.5 block">
                Total Omset Penjualan
              </span>
              <span className="text-[#065F46] dark:text-emerald-300 font-mono font-black text-base sm:text-lg tracking-tight block">
                {formatRupiah(summaryMetrics.totalRevenue)}
              </span>
            </div>

            {/* Card 2 (Total Transaksi) */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 mb-0.5 block">
                Total Transaksi
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-50 tracking-tight block">
                {summaryMetrics.totalTransactions}{" "}
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">tx</span>
              </span>
            </div>

            {/* Card 3 (Total Unit Terjual) */}
            <div className="bg-[#FEF3C7] dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 mb-0.5 block">
                Total Unit Terjual
              </span>
              <span className="text-[#B45309] dark:text-amber-300 font-mono font-black text-base sm:text-lg tracking-tight block">
                {summaryMetrics.totalItemsSold}{" "}
                <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300/80">unit</span>
              </span>
            </div>

            {/* Card 4 (Rata-Rata Transaksi / AOV) */}
            <div className="bg-[#EEF2FF] dark:bg-indigo-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2.5 sm:p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
              <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 mb-0.5 block">
                Rata-Rata Transaksi (AOV)
              </span>
              <span className="text-[#4338CA] dark:text-indigo-300 font-mono font-black text-base sm:text-lg tracking-tight block">
                {formatRupiah(summaryMetrics.averageTransactionValue)}
              </span>
            </div>
          </div>

          {/* 3. Inline Filter Bar */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex flex-wrap items-center gap-2.5 mb-3 transition-colors">
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
                <option value="30days">30 Hari Terakhir</option>
                <option value="thisMonth">Bulan Ini</option>
                <option value="thisYear">Tahun Ini</option>
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
              <label className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider whitespace-nowrap">PEMBAYARAN:</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-3 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
              >
                <option value="ALL">Semua Pembayaran</option>
                <option value="CASH">CASH (Tunai)</option>
                <option value="QRIS">QRIS</option>
                <option value="DEBIT">KARTU DEBIT</option>
                <option value="TRANSFER">TRANSFER BANK</option>
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
                placeholder="Cari No. Invoice / Kasir..."
                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full pl-8 pr-3 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
              />
            </div>
          </div>

          {/* 4. Chart Section (Grafik Tren Omset & Metode Pembayaran) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
            {/* Grafik Tren Omset Penjualan (2 Kolom) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-colors">
              <div className="mb-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Grafik Tren Omset Penjualan
                </h2>
              </div>

              <div className="w-full h-[190px] sm:h-[210px]">
                {dailyChartData && dailyChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: 5, bottom: -5 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94A3B8" opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 'bold', fill: 'currentColor' }} className="text-slate-700 dark:text-slate-300" />
                      <YAxis width={60} tick={{ fontSize: 10, fontWeight: 'bold', fill: 'currentColor' }} className="text-slate-700 dark:text-slate-300" tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(val: any) => [formatRupiah(Number(val)), "Omset Penjualan"]}
                        labelFormatter={(lbl) => `Tanggal: ${lbl}`}
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          border: "2px solid #334155",
                          borderRadius: "10px",
                          color: "#FFF",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#6366F1"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500">
                    Belum ada data grafik untuk periode ini.
                  </div>
                )}
              </div>
            </div>

            {/* Analisis Metode Pembayaran (1 Kolom) */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-colors">
              <div className="mb-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Analisis Metode Pembayaran
                </h2>
              </div>

              <div className="w-full h-[130px] sm:h-[140px] mb-1">
                {paymentBreakdownData && paymentBreakdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentBreakdownData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: -5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94A3B8" opacity={0.3} />
                      <XAxis type="number" tick={{ fontSize: 10, fontWeight: 'bold', fill: 'currentColor' }} className="text-slate-700 dark:text-slate-300" tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="method" type="category" width={45} tick={{ fontSize: 10, fontWeight: '900', fill: 'currentColor' }} className="text-slate-700 dark:text-slate-300" />
                      <Tooltip
                        formatter={(val: any) => [formatRupiah(Number(val)), "Total Pembayaran"]}
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          border: "2px solid #334155",
                          borderRadius: "10px",
                          color: "#FFF",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                      <Bar dataKey="amount" stroke="#0F172A" strokeWidth={1.5} radius={[0, 6, 6, 0]}>
                        {paymentBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={METHOD_COLORS[entry.method] || "#6366F1"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500">
                    Tidak ada data metode bayar.
                  </div>
                )}
              </div>

              {/* List Legend Persentase Pembayaran */}
              <div className="space-y-1 pt-1.5 border-t-2 border-slate-200 dark:border-slate-800">
                {paymentBreakdownData.map((pb) => (
                  <div
                    key={pb.method}
                    className="py-1 px-2 text-[10px] font-mono font-bold mb-1 bg-slate-50 dark:bg-slate-800 border-[1.5px] border-slate-900 dark:border-slate-100 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded border border-slate-900 dark:border-slate-100"
                        style={{ backgroundColor: METHOD_COLORS[pb.method] || "#6366F1" }}
                      />
                      <span className="font-black text-slate-900 dark:text-slate-100">{pb.method}</span>
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">({pb.count} tx)</span>
                    </div>
                    <div className="text-slate-900 dark:text-slate-100 font-black">
                      {formatRupiah(pb.amount)}{" "}
                      <span className="text-slate-500 dark:text-slate-400 font-bold text-[9px]">({pb.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5. Table 5 Produk Terlaris */}
          {topProductsData && topProductsData.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden mb-6 transition-colors">
              <div className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 p-4 font-black text-sm text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <span>🔥</span>
                <span>5 Produk Terlaris (Top Selling Products)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-black text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Kode SKU</th>
                      <th className="py-3 px-4">Nama Produk</th>
                      <th className="py-3 px-4 text-center">Qty Terjual</th>
                      <th className="py-3 px-4 text-right">Total Contributed Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {topProductsData.map((p, idx) => (
                      <tr key={p.productId || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                            {p.sku}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {p.productName}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-xs text-[#4338CA] dark:text-indigo-400">
                          {p.quantitySold} unit
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-xs text-[#065F46] dark:text-emerald-400">
                          {formatRupiah(p.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. Tabel Riwayat Transaksi Detail */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden transition-colors">
            <div className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 p-4 font-black text-sm text-slate-900 dark:text-slate-50 flex items-center justify-between">
              <span>Daftar Riwayat Transaksi Penjualan</span>
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                Total: {filteredTransactions.length} transaksi
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                <div className="w-8 h-8 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Memuat data transaksi penjualan...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center text-rose-600 dark:text-rose-400 space-y-3">
                <p className="text-sm font-bold">{error}</p>
                <button
                  type="button"
                  onClick={loadSalesReport}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
                >
                  Coba Lagi
                </button>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Belum ada transaksi penjualan yang tercatat pada periode ini.
                </p>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Klik tombol seeder di bawah untuk mengisi sampel data transaksi penjualan.
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
                  <span>Generate Data Dummy Transaksi (Seeder)</span>
                </button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full table-auto text-left border-collapse text-xs text-slate-700 dark:text-slate-300">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b-2 border-slate-900 dark:border-slate-100 text-[11px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      <th className="px-4 py-3">No. Invoice</th>
                      <th className="px-4 py-3">Tanggal & Waktu</th>
                      <th className="px-4 py-3">Kasir</th>
                      <th className="px-4 py-3 text-center">Metode Bayar</th>
                      <th className="px-3 py-3 text-center">Item</th>
                      <th className="px-4 py-3 text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    {paginatedTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors">
                        <td className="px-4 py-3 align-middle font-mono font-bold text-slate-900 dark:text-slate-100">
                          {tx.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 align-middle font-medium text-slate-700 dark:text-slate-300">
                          {tx.date}
                        </td>
                        <td className="px-4 py-3 align-middle font-bold text-slate-900 dark:text-slate-100">
                          {tx.cashierName}
                        </td>
                        <td className="px-4 py-3 align-middle text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md font-mono font-black text-[10px] uppercase border border-slate-900 dark:border-slate-100 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] ${
                              tx.paymentMethod === "CASH"
                                ? "bg-[#E8F5E9] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300"
                                : tx.paymentMethod === "QRIS"
                                ? "bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300"
                                : "bg-[#FEF3C7] dark:bg-amber-950/60 text-[#B45309] dark:text-amber-300"
                            }`}
                          >
                            {tx.paymentMethod}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-middle text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {tx.itemsCount} pcs
                        </td>
                        <td className="px-4 py-3 align-middle text-right font-mono font-black text-slate-900 dark:text-slate-100">
                          {formatRupiah(tx.grandTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Component */}
            <div className="border-t-2 border-slate-900 dark:border-slate-100">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredTransactions.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      </div>
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
  );
}
