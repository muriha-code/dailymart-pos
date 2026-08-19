"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Product } from "@/types/product.types";
import { StockAuditRecord, AuditReason } from "@/types/stockAudit.types";
import { productService } from "@/services/product.service";
import { stockAuditService } from "@/services/stockAudit.service";
import { getThisWeekDateRange, formatIndonesianDate } from "@/lib/utils/date";
import Pagination from "@/components/common/Pagination";

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

const AUDIT_REASONS: AuditReason[] = [
  "Stok Cocok",
  "Barang Rusak",
  "Kadaluarsa",
  "Hilang",
  "Selisih Input",
  "Lainnya",
];

export default function StockAuditPage() {
  // State Log Riwayat Audit
  const [auditLogs, setAuditLogs] = useState<StockAuditRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  // State List Produk untuk Form Audit
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  // Auto-Reset Halaman ke 1 saat filter pencarian/tanggal berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedDate]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form Audit States
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [physicalStockInput, setPhysicalStockInput] = useState<string>("");
  const [reasonInput, setReasonInput] = useState<AuditReason | string>("Stok Cocok");
  const [notesInput, setNotesInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Product pencarian di dalam modal
  const [productSearchModal, setProductSearchModal] = useState<string>("");

  // ==========================================
  // 1. WEEKLY CYCLE DATE RANGE & AUDIT SET
  // ==========================================
  const { startOfWeek, endOfWeek } = useMemo(() => getThisWeekDateRange(), []);

  // Map product IDs / SKUs audited during current week cycle
  const auditedProductIdsThisWeek = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((log) => {
      const logDate = new Date(log.createdAt);
      if (logDate >= startOfWeek && logDate <= endOfWeek) {
        if (log.productId) set.add(log.productId);
        if (log.sku) set.add(log.sku);
      }
    });
    return set;
  }, [auditLogs, startOfWeek, endOfWeek]);

  // Total Products Count & Weekly Audit Progress
  const totalProductsCount = products.length;

  const weeklyAuditedCount = useMemo(() => {
    return products.filter((p) => {
      const pId = p.id || p.sku;
      return (
        auditedProductIdsThisWeek.has(pId) ||
        (p.id && auditedProductIdsThisWeek.has(p.id)) ||
        (p.sku && auditedProductIdsThisWeek.has(p.sku))
      );
    }).length;
  }, [products, auditedProductIdsThisWeek]);

  const weeklyProgressPercentage = useMemo(() => {
    if (totalProductsCount === 0) return 0;
    return Math.min(
      100,
      Math.round((weeklyAuditedCount / totalProductsCount) * 100)
    );
  }, [weeklyAuditedCount, totalProductsCount]);

  // Load Products for Selection Dropdown
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } catch (err) {
      console.warn("Gagal memuat katalog produk untuk stock opname:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Load Stock Audit Log History
  const loadAuditHistory = useCallback(async () => {
    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const data = await stockAuditService.getStockAuditHistory({
        search: searchQuery,
        date: selectedDate,
      });
      setAuditLogs(data);
    } catch (err: any) {
      console.error("Gagal memuat riwayat audit stok:", err);
      setLogsError(
        err.message || "Gagal terhubung ke database. Silakan coba lagi."
      );
    } finally {
      setIsLoadingLogs(false);
    }
  }, [searchQuery, selectedDate]);

  useEffect(() => {
    loadAuditHistory();
  }, [loadAuditHistory]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Selected Product details in form
  const selectedProduct = useMemo(() => {
    return products.find((p) => (p.id || p.sku) === selectedProductId) || null;
  }, [products, selectedProductId]);

  const isSelectedProductAuditedThisWeek = useMemo(() => {
    if (!selectedProduct) return false;
    const pId = selectedProduct.id || selectedProduct.sku;
    const matchId = Boolean(selectedProduct.id && auditedProductIdsThisWeek.has(selectedProduct.id));
    const matchSku = Boolean(selectedProduct.sku && auditedProductIdsThisWeek.has(selectedProduct.sku));
    const matchPId = Boolean(pId && auditedProductIdsThisWeek.has(pId));
    return matchId || matchSku || matchPId;
  }, [selectedProduct, auditedProductIdsThisWeek]);

  // Dynamic system stock & physical stock calculation
  const systemStock = selectedProduct ? Number(selectedProduct.stock ?? 0) : 0;
  const numericPhysicalStock = physicalStockInput !== "" ? parseInt(physicalStockInput, 10) : systemStock;
  const difference = numericPhysicalStock - systemStock;

  // Filtered Products for Modal Search
  const modalFilteredProducts = useMemo(() => {
    if (!productSearchModal.trim()) return products;
    const query = productSearchModal.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query)
    );
  }, [products, productSearchModal]);

  // Quick KPI Aggregations
  const totalAuditCount = auditLogs.length;

  const totalDeficitItems = useMemo(() => {
    return auditLogs.filter((log) => log.difference < 0).length;
  }, [auditLogs]);

  const totalSurplusItems = useMemo(() => {
    return auditLogs.filter((log) => log.difference > 0).length;
  }, [auditLogs]);

  // Paginated Logs
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return auditLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [auditLogs, currentPage]);

  // Open Modal Handler
  const handleOpenModal = (productToAudit?: Product) => {
    setSubmitError(null);
    if (productToAudit) {
      const pId = productToAudit.id || productToAudit.sku;
      setSelectedProductId(pId);
      setPhysicalStockInput(String(productToAudit.stock ?? 0));
    } else {
      setSelectedProductId("");
      setPhysicalStockInput("");
    }
    setReasonInput("Stok Cocok");
    setNotesInput("");
    setProductSearchModal("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  // Adjust Physical Stock (+ / -)
  const handleAdjustQuantity = (delta: number) => {
    const currentVal = physicalStockInput !== "" ? parseInt(physicalStockInput, 10) : systemStock;
    const newVal = Math.max(0, currentVal + delta);
    setPhysicalStockInput(String(newVal));

    const newDiff = newVal - systemStock;
    if (newDiff === 0) {
      setReasonInput("Stok Cocok");
    } else if (reasonInput === "Stok Cocok") {
      setReasonInput(newDiff < 0 ? "Barang Rusak" : "Selisih Input");
    }
  };

  // Form Submission
  const handleSubmitAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setSubmitError("Harap pilih produk yang akan diverifikasi!");
      return;
    }

    if (isSelectedProductAuditedThisWeek) {
      setSubmitError("Produk ini sudah diverifikasi pada minggu berjalan!");
      return;
    }

    if (physicalStockInput === "" || isNaN(parseInt(physicalStockInput, 10)) || parseInt(physicalStockInput, 10) < 0) {
      setSubmitError("Masukkan stok fisik aktual yang valid (minimal 0)!");
      return;
    }

    if (difference !== 0 && reasonInput === "Stok Cocok") {
      setSubmitError("Terdapat selisih stok! Harap pilih alasan penyesuaian yang sesuai.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await stockAuditService.submitStockAudit({
        productId: selectedProduct.id || selectedProduct.sku,
        physicalStock: numericPhysicalStock,
        reason: reasonInput,
        notes: notesInput,
      });

      // Refresh data
      setIsModalOpen(false);
      loadAuditHistory();
      loadProducts();
    } catch (err: any) {
      console.error("Gagal menyimpan verifikasi stok:", err);
      setSubmitError(err.message || "Gagal memproses verifikasi stok.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER                                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold text-[11px] uppercase tracking-wider">
                Gudang & Logistik
              </span>
              <span className="text-xs text-slate-400">• Opname Stok</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Verifikasi & Audit Stok Fisik (Stock Opname)
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Sinkronisasi pencatatan stok fisik barang di gudang dengan stok sistem secara atomik dan akurat.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Mulai Opname Stok</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. WEEKLY STOCK AUDIT CYCLE PROGRESS CARD                                 */}
        {/* ========================================================================= */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base">📅</span>
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Siklus Audit Mingguan (Weekly Stock Audit Cycle)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Target verifikasi fisik seluruh SKU produk toko pada periode minggu berjalan.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shrink-0">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>
                {formatIndonesianDate(startOfWeek)} – {formatIndonesianDate(endOfWeek)}
              </span>
            </div>
          </div>

          {/* Progress Bar & Indicators */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-semibold gap-2">
              <div className="flex flex-wrap items-center gap-4 text-slate-600">
                <span>Total SKU Toko: <strong className="font-mono text-slate-900">{totalProductsCount}</strong> produk</span>
                <span className="text-slate-300">•</span>
                <span>Telah Diverifikasi Minggu Ini: <strong className="font-mono text-emerald-700">{weeklyAuditedCount}</strong> produk</span>
                <span className="text-slate-300">•</span>
                <span>Sisa Belum Diaudit: <strong className="font-mono text-amber-700">{Math.max(0, totalProductsCount - weeklyAuditedCount)}</strong> produk</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Progres Mingguan: </span>
                <span className="font-mono font-black text-sm text-emerald-600">{weeklyProgressPercentage}%</span>
              </div>
            </div>

            {/* Pill Progress Bar */}
            <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200 p-0.5">
              <div
                style={{ width: `${weeklyProgressPercentage}%` }}
                className="bg-emerald-500 h-full rounded-full transition-all duration-500 flex items-center justify-center text-[9px] font-black text-white"
                title={`Progres: ${weeklyProgressPercentage}%`}
              >
                {weeklyProgressPercentage > 10 ? `${weeklyProgressPercentage}%` : ""}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. KPI METRICS CARDS                                                      */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Verifikasi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Audit Diselesaikan
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                {totalAuditCount}{" "}
                <span className="text-xs font-normal text-slate-400">kali</span>
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Defisit / Minus */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Item Defisit (Minus)
              </span>
              <span className="text-2xl font-black text-red-600 mt-1 block font-mono">
                {totalDeficitItems}{" "}
                <span className="text-xs font-normal text-slate-400">produk</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700 shrink-0">
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
                  d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: Surplus / Plus */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Item Surplus (Plus)
              </span>
              <span className="text-2xl font-black text-sky-600 mt-1 block font-mono">
                {totalSurplusItems}{" "}
                <span className="text-xs font-normal text-slate-400">produk</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
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
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TOOLBAR SEARCH & FILTER                                                */}
        {/* ========================================================================= */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
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
              placeholder="Cari berdasarkan SKU, Nama Produk, Auditor, atau Alasan..."
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

          <div className="flex items-center gap-3">
            {/* Date Filter */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                Reset Tanggal
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadAuditHistory}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5"
            >
              <svg
                className={`w-4 h-4 ${isLoadingLogs ? "animate-spin" : ""}`}
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
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. TABEL RIWAYAT AUDIT STOK                                                */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {isLoadingLogs ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Memuat riwayat verifikasi stok...</p>
            </div>
          ) : logsError ? (
            <div className="p-12 text-center text-red-600 space-y-3">
              <p className="text-sm font-bold">{logsError}</p>
              <button
                type="button"
                onClick={loadAuditHistory}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Coba Lagi
              </button>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <p className="text-sm font-bold text-slate-800">
                Belum ada data verifikasi stok fisik.
              </p>
              <p className="text-xs text-slate-400">
                Klik tombol &quot;Mulai Opname Stok&quot; untuk mengonfirmasi stok fisik aktual gudang.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Waktu Audit</th>
                    <th className="py-3.5 px-4">Auditor</th>
                    <th className="py-3.5 px-4">Produk & SKU</th>
                    <th className="py-3.5 px-4 text-center">Stok Sistem</th>
                    <th className="py-3.5 px-4 text-center">Stok Fisik</th>
                    <th className="py-3.5 px-4 text-center">Selisih</th>
                    <th className="py-3.5 px-4">Alasan & Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {paginatedLogs.map((log) => {
                    const isMatch = log.difference === 0;
                    const isDeficit = log.difference < 0;
                    const isSurplus = log.difference > 0;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Waktu Audit */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>

                        {/* Auditor */}
                        <td className="py-3.5 px-4 font-medium whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {log.auditorName || "Staf Gudang"}
                          </span>
                        </td>

                        {/* Produk & SKU */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">
                            {log.productName}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>SKU: {log.sku}</span>
                            {log.categoryName && (
                              <span>• {log.categoryName}</span>
                            )}
                          </div>
                        </td>

                        {/* Stok Sistem */}
                        <td className="py-3.5 px-4 text-center font-mono font-semibold text-slate-600 whitespace-nowrap">
                          {log.systemStock} Pcs
                        </td>

                        {/* Stok Fisik */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-900 whitespace-nowrap">
                          {log.physicalStock} Pcs
                        </td>

                        {/* Selisih Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                          {isMatch && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-[10px]">
                              ✓ COCOK (0)
                            </span>
                          )}
                          {isDeficit && (
                            <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-extrabold text-[10px]">
                              ⚠️ DEFISIT ({log.difference})
                            </span>
                          )}
                          {isSurplus && (
                            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-extrabold text-[10px]">
                              ℹ️ SURPLUS (+{log.difference})
                            </span>
                          )}
                        </td>

                        {/* Alasan & Catatan */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {log.reason}
                          </div>
                          {log.notes && (
                            <div className="text-[11px] text-slate-500 italic mt-0.5">
                              &quot;{log.notes}&quot;
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={currentPage}
            totalItems={auditLogs.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. FORMULIR INPUT OPNAME (QUICK AUDIT MODAL)                              */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Formulir Audit Stok Fisik (Stock Opname)
                </h3>
                <p className="text-xs text-slate-500">
                  Input kuantitas fisik aktual untuk memperbarui stok produk di database.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 text-base font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitAudit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                  {submitError}
                </div>
              )}

              {/* 1. Pemilihan Produk */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Pilih Produk Yang Di-audit <span className="text-red-500">*</span>
                </label>

                {/* Modal Search Input */}
                <input
                  type="text"
                  value={productSearchModal}
                  onChange={(e) => setProductSearchModal(e.target.value)}
                  placeholder="Ketik untuk filter nama produk / SKU..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium mb-1"
                />

                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    setSelectedProductId(pId);
                    const prod = products.find((p) => (p.id || p.sku) === pId);
                    if (prod) {
                      setPhysicalStockInput(String(prod.stock ?? 0));
                    }
                  }}
                  required
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">-- Pilih Produk --</option>
                  {modalFilteredProducts.map((p) => {
                    const pId = p.id || p.sku;
                    const isAudited = Boolean(
                      auditedProductIdsThisWeek.has(pId) ||
                      (p.id && auditedProductIdsThisWeek.has(p.id)) ||
                      (p.sku && auditedProductIdsThisWeek.has(p.sku))
                    );

                    return (
                      <option
                        key={pId}
                        value={pId}
                        disabled={isAudited}
                        className={isAudited ? "text-slate-400 bg-slate-100 font-normal" : "text-slate-900 font-bold"}
                      >
                        {p.name} (SKU: {p.sku} | Stok: {p.stock} {p.unit})
                        {isAudited ? " [✓ Sudah Diaudit Minggu Ini]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. Kartu Info Produk Terpilih & Status Audit Minggu Ini */}
              {selectedProduct && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {selectedProduct.name}
                        </h4>
                        {isSelectedProductAuditedThisWeek && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            ✓ Sudah Diaudit
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        SKU: {selectedProduct.sku} • {selectedProduct.categoryName || "Umum"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Stok Sistem
                      </span>
                      <span className="text-base font-black font-mono text-slate-800">
                        {selectedProduct.stock} {selectedProduct.unit}
                      </span>
                    </div>
                  </div>

                  {isSelectedProductAuditedThisWeek && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-bold flex items-center gap-2">
                      <span>⚠️</span>
                      <span>
                        Produk ini telah diverifikasi pada siklus minggu berjalan. Pemilihan produk ini dikunci untuk mencegah duplikasi opname.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Input Stok Fisik Aktual & Control Buttons */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Stok Fisik Aktual (Fisik Gudang) <span className="text-red-500">*</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustQuantity(-1)}
                    disabled={!selectedProduct || numericPhysicalStock <= 0 || isSelectedProductAuditedThisWeek}
                    className="w-10 h-10 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-base flex items-center justify-center cursor-pointer disabled:opacity-40"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="0"
                    value={physicalStockInput}
                    disabled={isSelectedProductAuditedThisWeek}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPhysicalStockInput(val);
                      if (val !== "") {
                        const numericVal = parseInt(val, 10);
                        const newDiff = numericVal - systemStock;
                        if (newDiff === 0) {
                          setReasonInput("Stok Cocok");
                        } else if (reasonInput === "Stok Cocok") {
                          setReasonInput(newDiff < 0 ? "Barang Rusak" : "Selisih Input");
                        }
                      }
                    }}
                    placeholder="Masukkan jumlah fisik..."
                    required
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black font-mono text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => handleAdjustQuantity(1)}
                    disabled={!selectedProduct || isSelectedProductAuditedThisWeek}
                    className="w-10 h-10 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-base flex items-center justify-center cursor-pointer disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 4. Live Calculation Difference Alert Box */}
              {selectedProduct && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between ${
                    difference === 0
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : difference < 0
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-sky-50 border-sky-200 text-sky-800"
                  }`}
                >
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider block">
                      Status Kalkulasi Selisih
                    </span>
                    <span className="text-xs font-extrabold mt-0.5 block">
                      {difference === 0 && "✓ Stok fisik cocok dengan stok sistem."}
                      {difference < 0 && `⚠️ Stok fisik kurang ${Math.abs(difference)} Pcs dari sistem (Defisit).`}
                      {difference > 0 && `ℹ️ Stok fisik lebih ${difference} Pcs dari sistem (Surplus).`}
                    </span>
                  </div>

                  <div className="font-mono font-black text-sm text-right shrink-0">
                    {difference === 0 ? "0 Pcs" : difference < 0 ? `${difference} Pcs` : `+${difference} Pcs`}
                  </div>
                </div>
              )}

              {/* 5. Alasan Penyesuaian (Mandatory if difference !== 0) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Alasan Penyesuaian Stok <span className="text-red-500">*</span>
                </label>
                <select
                  value={reasonInput}
                  disabled={isSelectedProductAuditedThisWeek}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:opacity-60"
                >
                  {AUDIT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Catatan Tambahan (Opsional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  disabled={isSelectedProductAuditedThisWeek}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Keterangan kondisi fisik barang, lokasi rak, dll..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:opacity-60"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProduct || isSelectedProductAuditedThisWeek}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isSubmitting ? "Menyimpan..." : "Konfirmasi & Sesuaikan Stok"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
