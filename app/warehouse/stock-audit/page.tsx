"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Product } from "@/types/product.types";
import { StockAuditRecord, AuditReason } from "@/types/stockAudit.types";
import { productService } from "@/services/product.service";
import { stockAuditService } from "@/services/stockAudit.service";
import { getThisWeekDateRange, formatIndonesianDate } from "@/lib/utils/date";
import Pagination from "@/components/common/Pagination";
import EvidenceImageUploader from "@/components/warehouse/EvidenceImageUploader";
import EvidenceLightboxModal from "@/components/warehouse/EvidenceLightboxModal";
import { uploadDeferredImages } from "@/lib/utils/uploadDeferred";

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
  const [evidenceImagesInput, setEvidenceImagesInput] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Lightbox Gallery States
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

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
    setEvidenceImagesInput([]);
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
      // 1. Eksekusi Upload Deferred seluruh gambar draf ke Cloudinary (Target folder: audits)
      const uploadedCloudinaryUrls = await uploadDeferredImages(
        evidenceImagesInput,
        "audits"
      );

      // 2. Simpan dokumen verifikasi stock opname ke Firestore
      await stockAuditService.submitStockAudit({
        productId: selectedProduct.id || selectedProduct.sku,
        physicalStock: numericPhysicalStock,
        reason: reasonInput,
        notes: notesInput,
        evidenceImages: uploadedCloudinaryUrls,
      });

      toast.success("Hasil audit stok berhasil diverifikasi");
      // Refresh data
      setIsModalOpen(false);
      loadAuditHistory();
      loadProducts();
    } catch (err: any) {
      console.error("Gagal menyimpan verifikasi stok:", err);
      toast.error(err.message || "Gagal memproses verifikasi stok.");
      setSubmitError(err.message || "Gagal memproses verifikasi stok.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 p-3 sm:p-5 lg:p-6 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER & PRIMARY ACTION (COMPACT)                                 */}
        {/* ========================================================================= */}
        <div className="mb-2 p-0 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Verifikasi & Audit Stok Fisik (Stock Opname)
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-600 dark:text-slate-400 font-bold">
              Sinkronisasi pencatatan stok fisik barang di gudang dengan stok sistem secara atomik dan akurat.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="bg-[#FFB800] hover:bg-[#FFA800] text-slate-950 font-black text-xs py-1.5 px-3 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Mulai Opname Stok</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. WEEKLY AUDIT PROGRESS BANNER (INLINE & ULTRA-COMPACT)                  */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2.5 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] mb-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 transition-colors">
          <div className="flex items-center gap-2 shrink-0">
            <h2 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100 tracking-wider">
              Siklus Audit Mingguan
            </h2>
            <span className="bg-slate-100 dark:bg-slate-800 border-[1.5px] border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] text-slate-900 dark:text-slate-100">
              {formatIndonesianDate(startOfWeek)} – {formatIndonesianDate(endOfWeek)}
            </span>
          </div>

          {/* Progress Indicators & Track Inline */}
          <div className="flex items-center gap-3 text-xs font-bold shrink-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-700 dark:text-slate-300">
              <span>Total: <strong className="font-mono text-slate-900 dark:text-slate-100 font-black">{totalProductsCount}</strong></span>
              <span>•</span>
              <span>Diverifikasi: <strong className="font-mono text-[#065F46] dark:text-emerald-400 font-black">{weeklyAuditedCount}</strong></span>
              <span>•</span>
              <span>Sisa: <strong className="font-mono text-[#B45309] dark:text-amber-400 font-black">{Math.max(0, totalProductsCount - weeklyAuditedCount)}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-24 sm:w-36 h-2 bg-slate-100 dark:bg-slate-800 border border-slate-900 dark:border-slate-100 rounded-full overflow-hidden shrink-0">
                <div
                  style={{ width: `${weeklyProgressPercentage}%` }}
                  className="bg-[#6366F1] h-full transition-all duration-300"
                  title={`Progres: ${weeklyProgressPercentage}%`}
                />
              </div>
              <span className="font-mono font-black text-xs text-[#4338CA] dark:text-indigo-400">{weeklyProgressPercentage}%</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. KPI AUDIT STAT CARDS (3 GRID METRICS COMPACT)                          */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {/* Card 1: Total Audit Diselesaikan */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2.5 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-0.5">
              Total Audit Diselesaikan
            </span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-slate-50 block">
              {totalAuditCount}{" "}
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">kali</span>
            </span>
          </div>

          {/* Card 2: Item Defisit (Minus) */}
          <div className="bg-[#FFE4E6] dark:bg-rose-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2.5 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-[9px] font-black uppercase text-[#E11D48] dark:text-rose-400 block mb-0.5">
              Item Defisit (Minus)
            </span>
            <span className="text-[#E11D48] dark:text-rose-400 font-mono font-black text-base sm:text-lg block">
              {totalDeficitItems}{" "}
              <span className="text-[10px] font-bold text-[#E11D48]/80 dark:text-rose-400/80">produk</span>
            </span>
          </div>

          {/* Card 3: Item Surplus (Plus) */}
          <div className="bg-[#EEF2FF] dark:bg-indigo-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2.5 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-[9px] font-black uppercase text-[#4338CA] dark:text-indigo-300 block mb-0.5">
              Item Surplus (Plus)
            </span>
            <span className="text-[#4338CA] dark:text-indigo-300 font-mono font-black text-base sm:text-lg block">
              {totalSurplusItems}{" "}
              <span className="text-[10px] font-bold text-[#4338CA]/80 dark:text-indigo-300/80">produk</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. INLINE FILTER BAR                                                      */}
        {/* ========================================================================= */}
        <div className="p-2 mb-3 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center gap-2 flex-wrap sm:flex-nowrap transition-colors">
          {/* Search Input Field */}
          <div className="relative flex-1 min-w-[180px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari SKU, Nama Produk, Auditor, atau Alasan..."
              className="py-1 px-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border-[1.5px] border-slate-900 dark:border-slate-100 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 flex-1 w-full shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-400"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Date Input Field */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="py-1 px-2.5 text-xs font-bold bg-white dark:bg-slate-800 border-[1.5px] border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
            />
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                className="text-xs font-black text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300"
              >
                Reset
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadAuditHistory}
              className="p-1.5 rounded-lg border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] text-slate-900 dark:text-slate-100 transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Refresh Data"
            >
              <svg
                className={`w-3.5 h-3.5 ${isLoadingLogs ? "animate-spin" : ""}`}
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

        {/* ========================================================================= */}
        {/* 5. TABLE DATA AUDIT STOK                                                  */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] overflow-hidden transition-colors">
          {isLoadingLogs ? (
            <div className="p-8 text-center text-slate-700 dark:text-slate-300 space-y-2">
              <div className="w-6 h-6 border-3 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-1" />
              <p className="text-xs font-black">Memuat riwayat verifikasi stok...</p>
            </div>
          ) : logsError ? (
            <div className="p-8 text-center text-rose-600 dark:text-rose-400 space-y-2">
              <p className="text-xs font-black">{logsError}</p>
              <button
                type="button"
                onClick={loadAuditHistory}
                className="px-3 py-1.5 bg-[#6366F1] text-white border-2 border-slate-900 dark:border-slate-100 rounded-lg text-xs font-black shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] hover:bg-[#4F46E5] cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-900 dark:text-slate-100 space-y-1">
              <p className="text-xs font-black text-slate-900 dark:text-slate-100">
                Belum ada data verifikasi stok fisik.
              </p>
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                Klik tombol &quot;Mulai Opname Stok&quot; untuk mengonfirmasi stok fisik aktual gudang.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-black text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-3">Waktu Audit</th>
                    <th className="py-2 px-3">Auditor</th>
                    <th className="py-2 px-3">Produk & SKU</th>
                    <th className="py-2 px-3 text-center">Stok Sistem</th>
                    <th className="py-2 px-3 text-center">Stok Fisik</th>
                    <th className="py-2 px-3 text-center">Selisih</th>
                    <th className="py-2 px-3">Alasan & Catatan</th>
                    <th className="py-2 px-3 text-center">Bukti Foto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs text-slate-900 dark:text-slate-100 font-bold">
                  {paginatedLogs.map((log) => {
                    const isMatch = log.difference === 0;
                    const isDeficit = log.difference < 0;
                    const isSurplus = log.difference > 0;
                    const hasEvidence = Boolean(log.evidenceImages && log.evidenceImages.length > 0);

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-200 dark:border-slate-800"
                      >
                        {/* Waktu Audit */}
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </td>

                        {/* Auditor Badge */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-[10px] px-1.5 py-0.5 rounded">
                            {log.auditorName || "Staf Gudang"}
                          </span>
                        </td>

                        {/* Produk & SKU Tag */}
                        <td className="py-2 px-3">
                          <div className="font-black text-slate-900 dark:text-slate-100 text-xs leading-tight">
                            {log.productName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[9px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                              SKU: {log.sku}
                            </span>
                            {log.categoryName && (
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-semibold">• {log.categoryName}</span>
                            )}
                          </div>
                        </td>

                        {/* Stok Sistem */}
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                          {log.systemStock} Pcs
                        </td>

                        {/* Stok Fisik */}
                        <td className="py-2 px-3 text-center font-mono font-black text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
                          {log.physicalStock} Pcs
                        </td>

                        {/* Selisih Variance Badges */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {isMatch && (
                            <span className="bg-[#D1FAE5] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border-[1.5px] border-slate-900 dark:border-slate-100 font-mono font-black text-[9px] px-1.5 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                              ✓ COCOK (0)
                            </span>
                          )}
                          {isDeficit && (
                            <span className="bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-400 border-[1.5px] border-slate-900 dark:border-slate-100 font-mono font-black text-[9px] px-1.5 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                              ⚠️ DEFISIT ({log.difference})
                            </span>
                          )}
                          {isSurplus && (
                            <span className="bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-[1.5px] border-slate-900 dark:border-slate-100 font-mono font-black text-[9px] px-1.5 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                              ℹ️ SURPLUS (+{log.difference})
                            </span>
                          )}
                        </td>

                        {/* Alasan & Catatan */}
                        <td className="py-2 px-3">
                          <div className="font-black text-slate-900 dark:text-slate-100 text-xs">
                            {log.reason}
                          </div>
                          {log.notes && (
                            <div className="text-[10px] italic font-medium text-slate-600 dark:text-slate-400 truncate max-w-xs">
                              &quot;{log.notes}&quot;
                            </div>
                          )}
                        </td>

                        {/* Bukti Foto Column */}
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          {hasEvidence ? (
                            <button
                              type="button"
                              onClick={() => {
                                setLightboxImages(log.evidenceImages || []);
                                setLightboxIndex(0);
                                setIsLightboxOpen(true);
                              }}
                              className="inline-flex items-center gap-1 bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-black text-[10px] px-2 py-0.5 rounded-lg hover:scale-105 transition-transform cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
                              title="Lihat Foto Bukti Physical Audit"
                            >
                              <span>📷</span>
                              <span>{log.evidenceImages?.length} Foto</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium italic">-</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-colors">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between shrink-0 transition-colors">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-50">
                  Formulir Audit Stok Fisik (Stock Opname)
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold mt-0.5">
                  Input kuantitas fisik aktual untuk memperbarui stok produk di database.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-center font-black text-xs transition-colors cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
                title="Tutup Modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitAudit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {submitError && (
                <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-black text-rose-800 dark:text-rose-300 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  {submitError}
                </div>
              )}

              {/* 1. Pemilihan Produk */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Pilih Produk Yang Di-audit <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>

                {/* Modal Search Input */}
                <input
                  type="text"
                  value={productSearchModal}
                  onChange={(e) => setProductSearchModal(e.target.value)}
                  placeholder="Ketik untuk filter nama produk / SKU..."
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 mb-1.5 w-full shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
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
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] w-full cursor-pointer"
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
                        className={isAudited ? "text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 font-normal" : "text-slate-900 dark:text-slate-100 font-bold bg-white dark:bg-slate-900"}
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
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] space-y-2 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-xs text-slate-900 dark:text-slate-100">
                          {selectedProduct.name}
                        </h4>
                        {isSelectedProductAuditedThisWeek && (
                          <span className="px-2 py-0.5 rounded-md bg-[#D1FAE5] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border border-slate-900 dark:border-slate-100 text-[10px] font-black">
                            ✓ Sudah Diaudit
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-bold mt-0.5">
                        SKU: {selectedProduct.sku} • {selectedProduct.categoryName || "Umum"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                        Stok Sistem
                      </span>
                      <span className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">
                        {selectedProduct.stock} {selectedProduct.unit}
                      </span>
                    </div>
                  </div>

                  {isSelectedProductAuditedThisWeek && (
                    <div className="p-2.5 bg-amber-100 dark:bg-amber-950/50 border border-slate-900 dark:border-slate-100 rounded-lg text-xs text-amber-900 dark:text-amber-200 font-bold flex items-center gap-2">
                      <span>⚠️</span>
                      <span>
                        Produk ini telah diverifikasi pada siklus minggu berjalan. Pemilihan produk ini dikunci untuk mencegah duplikasi opname.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Input Stok Fisik Aktual & Control Buttons */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Stok Fisik Aktual (Fisik Gudang) <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustQuantity(-1)}
                    disabled={!selectedProduct || numericPhysicalStock <= 0 || isSelectedProductAuditedThisWeek}
                    className="w-10 h-10 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-black text-base flex items-center justify-center cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] active:translate-y-[1px] disabled:opacity-40"
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
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-base font-black font-mono text-center text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => handleAdjustQuantity(1)}
                    disabled={!selectedProduct || isSelectedProductAuditedThisWeek}
                    className="w-10 h-10 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-black text-base flex items-center justify-center cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] active:translate-y-[1px] disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 4. Live Calculation Difference Alert Box */}
              {selectedProduct && (
                <div
                  className={`p-3 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between ${
                    difference === 0
                      ? "bg-[#D1FAE5] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300"
                      : difference < 0
                      ? "bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-300"
                      : "bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300"
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider block">
                      Status Kalkulasi Selisih
                    </span>
                    <span className="text-xs font-black mt-0.5 block">
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

              {/* 5. Alasan Penyesuaian */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Alasan Penyesuaian Stok <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <select
                  value={reasonInput}
                  disabled={isSelectedProductAuditedThisWeek}
                  onChange={(e) => setReasonInput(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] w-full cursor-pointer disabled:opacity-60"
                >
                  {AUDIT_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Upload Bukti Foto Fisik Pendukung Opname */}
              <EvidenceImageUploader
                images={evidenceImagesInput}
                onChange={setEvidenceImagesInput}
                disabled={isSubmitting || isSelectedProductAuditedThisWeek}
              />

              {/* 7. Catatan Tambahan */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  disabled={isSelectedProductAuditedThisWeek}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Keterangan kondisi fisik barang, lokasi rak, dll..."
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] w-full disabled:opacity-60 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t-2 border-slate-900 dark:border-slate-100 flex items-center justify-end gap-2.5 shrink-0 transition-colors">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs px-3.5 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProduct || isSelectedProductAuditedThisWeek}
                  className="bg-[#FFB800] hover:bg-[#FFA800] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isSubmitting ? "Menyimpan..." : "Konfirmasi & Sesuaikan Stok"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Lightbox Pop-up Gallery */}
      <EvidenceLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={lightboxImages}
        initialIndex={lightboxIndex}
        title="Galeri Foto Bukti Stock Opname"
      />
    </div>
  );
}
