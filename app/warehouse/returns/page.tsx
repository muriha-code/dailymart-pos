"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Product } from "@/types/product.types";
import { Supplier } from "@/types/supplier.types";
import {
  StockReturnRecord,
  ReturnType,
  ReturnReason,
} from "@/types/stockReturn.types";
import { productService } from "@/services/product.service";
import { supplierService } from "@/services/supplier.service";
import { stockReturnService } from "@/services/stockReturn.service";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/common/SearchableSelect";
import Pagination from "@/components/common/Pagination";
import EvidenceImageUploader from "@/components/warehouse/EvidenceImageUploader";
import EvidenceLightboxModal from "@/components/warehouse/EvidenceLightboxModal";

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

const REASON_LABELS: Record<string, string> = {
  EXPIRED: "Kedaluwarsa / Expired",
  PACKAGING_DAMAGED: "Kemasan Rusak / Bocor / Pecah",
  FACTORY_DEFECT: "Cacat Pabrik / Defektif",
  NEAR_EXPIRY: "Mendekati Kedaluwarsa",
  OTHER: "Lainnya",
};

export default function StockReturnsPage() {
  // State List Riwayat Retur
  const [returnLogs, setReturnLogs] = useState<StockReturnRecord[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  // State List Produk & Supplier dari Database
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState<boolean>(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [reasonFilter, setReasonFilter] = useState<string>("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  // Auto-Reset Halaman ke 1 saat filter pencarian/tipe/alasan berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, reasonFilter]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form Input States
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [returnType, setReturnType] = useState<ReturnType>("RETURN_TO_SUPPLIER");
  const [quantityInput, setQuantityInput] = useState<string>("1");
  const [reasonInput, setReasonInput] = useState<ReturnReason | string>("PACKAGING_DAMAGED");
  const [supplierNameInput, setSupplierNameInput] = useState<string>("");
  const [notesInput, setNotesInput] = useState<string>("");
  const [evidenceImagesInput, setEvidenceImagesInput] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Detail Modal & Lightbox Gallery States
  const [selectedReturnDetail, setSelectedReturnDetail] = useState<StockReturnRecord | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);

  // Search filter inside modal for products
  const [productSearchModal, setProductSearchModal] = useState<string>("");

  // Load Products for Selection Dropdown
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } catch (err) {
      console.warn("Gagal memuat produk untuk form retur:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Load Suppliers from Database
  const loadSuppliers = useCallback(async () => {
    setIsLoadingSuppliers(true);
    try {
      const data = await supplierService.getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.warn("Gagal memuat daftar supplier dari database:", err);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, []);

  // Load Return History Logs
  const loadReturnLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const data = await stockReturnService.getStockReturns({
        search: searchQuery,
        type: typeFilter as any,
        reason: reasonFilter as any,
      });
      setReturnLogs(data);
    } catch (err: any) {
      console.error("Gagal memuat riwayat retur & barang rusak:", err);
      setLogsError(
        err.message || "Gagal terhubung ke server. Silakan coba lagi."
      );
    } finally {
      setIsLoadingLogs(false);
    }
  }, [searchQuery, typeFilter, reasonFilter]);

  useEffect(() => {
    loadReturnLogs();
  }, [loadReturnLogs]);

  useEffect(() => {
    loadProducts();
    loadSuppliers();
  }, [loadProducts, loadSuppliers]);

  // Selected Product details
  const selectedProduct = useMemo(() => {
    return products.find((p) => (p.id || p.sku) === selectedProductId) || null;
  }, [products, selectedProductId]);

  const maxAvailableStock = selectedProduct ? Number(selectedProduct.stock ?? 0) : 0;
  const numericQty = parseInt(quantityInput, 10) || 0;

  // Supplier Options mapped for SearchableSelect
  const supplierOptions: SearchableSelectOption[] = useMemo(() => {
    return suppliers.map((sup) => ({
      value: sup.name,
      label: sup.name,
      sublabel: sup.contactPerson
        ? `Kontak: ${sup.contactPerson}${sup.phone ? ` (${sup.phone})` : ""}`
        : undefined,
    }));
  }, [suppliers]);

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

  // KPI Summaries
  const totalUnitProcessed = useMemo(() => {
    return returnLogs.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [returnLogs]);

  const totalSupplierReturns = useMemo(() => {
    return returnLogs
      .filter((item) => item.type === "RETURN_TO_SUPPLIER")
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [returnLogs]);

  const totalDisposals = useMemo(() => {
    return returnLogs
      .filter((item) => item.type === "DISPOSAL_DAMAGED")
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [returnLogs]);

  // Paginated Logs
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return returnLogs.slice(start, start + ITEMS_PER_PAGE);
  }, [returnLogs, currentPage]);

  // Open Modal Handler
  const handleOpenModal = () => {
    setSubmitError(null);
    setSelectedProductId("");
    setReturnType("RETURN_TO_SUPPLIER");
    setQuantityInput("1");
    setReasonInput("PACKAGING_DAMAGED");
    setSupplierNameInput("");
    setNotesInput("");
    setEvidenceImagesInput([]);
    setProductSearchModal("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  // Submit Form Handler
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      setSubmitError("Harap pilih produk yang akan diretur!");
      return;
    }

    if (maxAvailableStock <= 0) {
      setSubmitError(`Stok produk "${selectedProduct.name}" telah habis! Tidak dapat melakukan retur.`);
      return;
    }

    if (numericQty <= 0) {
      setSubmitError("Jumlah barang retur harus minimal 1 unit!");
      return;
    }

    if (numericQty > maxAvailableStock) {
      setSubmitError(`Jumlah retur (${numericQty}) melebihi stok yang tersedia (${maxAvailableStock} ${selectedProduct.unit})!`);
      return;
    }

    if (returnType === "RETURN_TO_SUPPLIER" && !supplierNameInput.trim()) {
      setSubmitError("Nama supplier/vendor wajib dipilih dari daftar!");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await stockReturnService.createStockReturn({
        productId: selectedProduct.id || selectedProduct.sku,
        quantity: numericQty,
        type: returnType,
        reason: reasonInput,
        supplierName: returnType === "RETURN_TO_SUPPLIER" ? supplierNameInput : undefined,
        notes: notesInput,
        evidenceImages: evidenceImagesInput,
      });

      toast.success("Laporan retur / pemusnahan barang berhasil dicatat");
      setIsModalOpen(false);
      loadReturnLogs();
      loadProducts();
    } catch (err: any) {
      console.error("Gagal mencatat retur barang:", err);
      toast.error(err.message || "Gagal memproses pencatatan retur.");
      setSubmitError(err.message || "Gagal memproses pencatatan retur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER COMPACT & CLEAN (HAPUS BADGE)                             */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Kelola Retur & Barang Rusak
            </h1>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              Pencatatan pengembalian barang ke vendor supplier dan pemusnahan barang rusak/kedaluwarsa.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="bg-[#FFB800] hover:bg-[#FFA800] text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:hover:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Catat Retur / Barang Rusak</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. KPI RETURN STAT CARDS (3 GRID METRICS - COMPACT)                       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Card 1: Total Unit Diproses */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block mb-1">
              Total Unit Diproses
            </span>
            <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-50 block">
              {totalUnitProcessed}{" "}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">unit</span>
            </span>
          </div>

          {/* Card 2: Retur ke Supplier */}
          <div className="bg-[#FEF3C7] dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#B45309] dark:text-amber-300 block mb-1">
              Retur ke Supplier (Claim)
            </span>
            <span className="text-[#B45309] dark:text-amber-300 font-mono font-black text-lg block">
              {totalSupplierReturns}{" "}
              <span className="text-xs font-bold text-[#B45309]/80 dark:text-amber-300/80">unit</span>
            </span>
          </div>

          {/* Card 3: Pemusnahan Barang Rusak */}
          <div className="bg-[#FFE4E6] dark:bg-rose-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-between transition-all">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E11D48] dark:text-rose-400 block mb-1">
              Pemusnahan / Write-Off
            </span>
            <span className="text-[#E11D48] dark:text-rose-400 font-mono font-black text-lg block">
              {totalDisposals}{" "}
              <span className="text-xs font-bold text-[#E11D48]/80 dark:text-rose-400/80">unit</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. INLINE FILTER BAR                                                      */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] flex flex-wrap items-center gap-2 mb-4 transition-colors">
          {/* Search Input Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Kode Retur (RTN-...), SKU, Nama Produk, atau Supplier..."
              className="bg-slate-50 dark:bg-slate-800 border-1.5 border-slate-900 dark:border-slate-100 rounded-lg px-3 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 flex-1 w-full"
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

          {/* Filters Dropdown */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Tipe Filter */}
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">Tipe:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border-1.5 border-slate-900 dark:border-slate-100 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] w-full cursor-pointer"
              >
                <option value="ALL">Semua Tipe</option>
                <option value="RETURN_TO_SUPPLIER">Retur Supplier</option>
                <option value="DISPOSAL_DAMAGED">Pemusnahan Rusak</option>
              </select>
            </div>

            {/* Alasan Filter */}
            <div className="flex items-center gap-1.5 min-w-[150px]">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">Alasan:</label>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border-1.5 border-slate-900 dark:border-slate-100 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] w-full cursor-pointer"
              >
                <option value="ALL">Semua Alasan</option>
                <option value="EXPIRED">Kedaluwarsa</option>
                <option value="PACKAGING_DAMAGED">Kemasan Rusak/Bocor</option>
                <option value="FACTORY_DEFECT">Cacat Pabrik</option>
                <option value="NEAR_EXPIRY">Mendekati Kedaluwarsa</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadReturnLogs}
              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-1.5 border-slate-900 dark:border-slate-100 p-1.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] text-slate-900 dark:text-slate-100 transition-all cursor-pointer flex items-center gap-1"
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
        {/* 4. TABLE DATA RETUR & DAMAGE                                              */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[3.5px_3.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3.5px_3.5px_0px_0px_rgba(255,255,255,1)] overflow-hidden transition-colors">
          {isLoadingLogs ? (
            <div className="p-12 text-center text-slate-700 dark:text-slate-300 space-y-2">
              <div className="w-8 h-8 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-black">Memuat riwayat retur & barang rusak...</p>
            </div>
          ) : logsError ? (
            <div className="p-12 text-center text-rose-600 dark:text-rose-400 space-y-2">
              <p className="text-sm font-black">{logsError}</p>
              <button
                type="button"
                onClick={loadReturnLogs}
                className="px-4 py-2 bg-[#6366F1] text-white border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-[#4F46E5] cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : returnLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-900 dark:text-slate-100 space-y-1">
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                Belum ada data retur atau pemusnahan barang rusak.
              </p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Klik tombol &quot;Catat Retur / Barang Rusak&quot; untuk memulai pencatatan baru.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-black text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-3.5">Waktu & Kode Retur</th>
                    <th className="py-3 px-3">Produk & SKU</th>
                    <th className="py-3 px-3 text-center">Jumlah</th>
                    <th className="py-3 px-3">Tipe & Alasan</th>
                    <th className="py-3 px-3">Supplier / Keterangan</th>
                    <th className="py-3 px-3 text-center">Bukti Foto</th>
                    <th className="py-3 px-3.5 text-right">Aksi / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs text-slate-900 dark:text-slate-100 font-bold">
                  {paginatedLogs.map((log) => {
                    const isSupplierReturn = log.type === "RETURN_TO_SUPPLIER";
                    const reasonText = REASON_LABELS[log.reason] || log.reason;
                    const hasEvidence = Boolean(log.evidenceImages && log.evidenceImages.length > 0);

                    return (
                      <tr
                        key={log.id || log.returnCode}
                        onClick={() => setSelectedReturnDetail(log)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-200 dark:border-slate-800 cursor-pointer"
                      >
                        {/* 1. Waktu & Kode Retur */}
                        <td className="py-3 px-3.5 align-top whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                            {log.returnCode || log.id}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {formatDate(log.createdAt)}
                          </div>
                        </td>

                        {/* 2. Produk & SKU Tag */}
                        <td className="py-3 px-3 align-top">
                          <div className="font-black text-slate-900 dark:text-slate-100 leading-snug line-clamp-1" title={log.productName}>
                            {log.productName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                              SKU: {log.sku}
                            </span>
                            {log.category && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">• {log.category}</span>
                            )}
                          </div>
                        </td>

                        {/* 3. Jumlah (Qty) (-Unit) */}
                        <td className="py-3 px-3 align-top text-center">
                          <span className="bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-400 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-black text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                            -{log.quantity} Unit
                          </span>
                        </td>

                        {/* 4. Tipe & Alasan Badges */}
                        <td className="py-3 px-3 align-top">
                          {!isSupplierReturn ? (
                            <span className="bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-400 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md inline-block">
                              🗑️ PEMUSNAHAN
                            </span>
                          ) : (
                            <span className="bg-[#FEF3C7] dark:bg-amber-950/60 text-[#B45309] dark:text-amber-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md inline-block">
                              📦 RETUR VENDOR
                            </span>
                          )}
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1 line-clamp-1" title={reasonText}>
                            {reasonText}
                          </p>
                        </td>

                        {/* 5. Supplier / Keterangan */}
                        <td className="py-3 px-3 align-top">
                          {isSupplierReturn && log.supplierName && log.supplierName !== '-' ? (
                            <div className="font-black text-slate-800 dark:text-slate-200 text-xs line-clamp-1" title={log.supplierName}>
                              {log.supplierName}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 italic font-medium">Pemusnahan Internal</div>
                          )}
                          {log.notes && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 italic font-medium line-clamp-2 mt-0.5" title={log.notes}>
                              &quot;{log.notes}&quot;
                            </p>
                          )}
                        </td>

                        {/* 6. Bukti Foto Thumbnail / Badge */}
                        <td className="py-3 px-3 align-top text-center whitespace-nowrap">
                          {hasEvidence ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImages(log.evidenceImages || []);
                                setLightboxIndex(0);
                                setIsLightboxOpen(true);
                              }}
                              className="inline-flex items-center gap-1 bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-black text-[10px] px-2 py-1 rounded-lg hover:scale-105 transition-transform cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
                              title="Lihat Galeri Foto Bukti"
                            >
                              <span>📷</span>
                              <span>{log.evidenceImages?.length} Foto</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium italic">-</span>
                          )}
                        </td>

                        {/* 7. Status & Detail Action */}
                        <td className="py-3 px-3.5 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {log.actionStatus === 'COMPLETED' ? (
                              <span className="bg-[#D1FAE5] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                                ✓ Selesai
                              </span>
                            ) : log.actionStatus === 'DISPOSED' ? (
                              <span className="bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-400 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                                🔥 Dimusnahkan
                              </span>
                            ) : (
                              <span className="bg-[#FEF3C7] dark:bg-amber-950/60 text-[#B45309] dark:text-amber-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                                ⏳ Menunggu
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReturnDetail(log);
                              }}
                              className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-1.5 border-slate-900 dark:border-slate-100 font-black text-[10px] rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] transition-transform hover:scale-105 cursor-pointer"
                              title="Lihat Detail Retur"
                            >
                              Detail
                            </button>
                          </div>
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
            totalItems={returnLogs.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL FORM PENCATATAN RETUR & BARANG RUSAK                             */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-colors">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between shrink-0 transition-colors">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-50">
                  Formulir Retur & Barang Rusak
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold mt-0.5">
                  Pencatatan barang cacat/expired untuk dipotong dari stok produk secara atomik.
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
            <form onSubmit={handleSubmitReturn} className="p-5 overflow-y-auto space-y-4 flex-1">
              {submitError && (
                <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-black text-rose-800 dark:text-rose-300 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  {submitError}
                </div>
              )}

              {/* 1. Pemilihan Produk */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Pilih Produk Yang Diretur / Rusak <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>

                <input
                  type="text"
                  value={productSearchModal}
                  onChange={(e) => setProductSearchModal(e.target.value)}
                  placeholder="Ketik untuk filter nama produk / SKU..."
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 mb-1.5 w-full shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
                />

                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] w-full cursor-pointer"
                >
                  <option value="">-- Pilih Produk --</option>
                  {modalFilteredProducts.map((p) => {
                    const pId = p.id || p.sku;
                    const stock = Number(p.stock ?? 0);
                    return (
                      <option
                        key={pId}
                        value={pId}
                        disabled={stock <= 0}
                        className={stock <= 0 ? "text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 font-normal" : "text-slate-900 dark:text-slate-100 font-bold bg-white dark:bg-slate-900"}
                      >
                        {p.name} (SKU: {p.sku} | Stok: {stock} {p.unit}){stock <= 0 ? " [Stok Habis]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. Ringkasan Info Produk Terpilih */}
              {selectedProduct && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between transition-colors">
                  <div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-slate-100">
                      {selectedProduct.name}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-bold mt-0.5">
                      SKU: {selectedProduct.sku} • {selectedProduct.categoryName || "Umum"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Stok Tersedia
                    </span>
                    <span className="text-sm font-black font-mono text-slate-900 dark:text-slate-100">
                      {maxAvailableStock} {selectedProduct.unit}
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Tipe Proses Retur (Pill Selector) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Tipe Proses Retur <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnType("RETURN_TO_SUPPLIER")}
                    className={`px-3 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] ${
                      returnType === "RETURN_TO_SUPPLIER"
                        ? "bg-[#FEF3C7] dark:bg-amber-950/60 text-amber-950 dark:text-amber-300"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>📦 Retur ke Supplier</span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 text-center">
                      Klaim pengembalian barang ke vendor
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnType("DISPOSAL_DAMAGED")}
                    className={`px-3 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 text-xs font-black transition-all cursor-pointer flex flex-col items-center gap-1 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] ${
                      returnType === "DISPOSAL_DAMAGED"
                        ? "bg-[#FFE4E6] dark:bg-rose-950/60 text-rose-950 dark:text-rose-300"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <span>🗑️ Pemusnahan Barang Rusak</span>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 text-center">
                      Write-off pecah / expired / busuk
                    </span>
                  </button>
                </div>
              </div>

              {/* 4. Input Jumlah Retur / Rusak */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Jumlah Barang (Qty Unit) <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantityInput(String(Math.max(1, numericQty - 1)))}
                    disabled={!selectedProduct || numericQty <= 1}
                    className="w-10 h-10 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-black text-base flex items-center justify-center cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] active:translate-y-[1px] disabled:opacity-40"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="1"
                    max={maxAvailableStock || 1}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    placeholder="Masukkan Qty..."
                    required
                    className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-base font-black font-mono text-center text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                  />

                  <button
                    type="button"
                    onClick={() => setQuantityInput(String(Math.min(maxAvailableStock || 1, numericQty + 1)))}
                    disabled={!selectedProduct || numericQty >= maxAvailableStock}
                    className="w-10 h-10 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-black text-base flex items-center justify-center cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] active:translate-y-[1px] disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                {selectedProduct && numericQty > maxAvailableStock && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-black">
                    ⚠️ Jumlah retur melebihi stok yang tersedia ({maxAvailableStock} {selectedProduct.unit}).
                  </p>
                )}
              </div>

              {/* 5. Alasan Kerusakan / Retur */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Alasan Kerusakan / Retur <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>

                <select
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value as any)}
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] w-full cursor-pointer"
                >
                  <option value="PACKAGING_DAMAGED">Kemasan Rusak / Bocor / Pecah</option>
                  <option value="EXPIRED">Kedaluwarsa / Expired</option>
                  <option value="FACTORY_DEFECT">Cacat Pabrik / Defektif</option>
                  <option value="NEAR_EXPIRY">Mendekati Kedaluwarsa</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>

              {/* 6. Nama Supplier */}
              {returnType === "RETURN_TO_SUPPLIER" && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                    Nama Supplier / Vendor <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>

                  <SearchableSelect
                    options={supplierOptions}
                    value={supplierNameInput}
                    onChange={(val) => setSupplierNameInput(val)}
                    placeholder="-- Pilih Supplier / Vendor --"
                    searchPlaceholder="Cari nama supplier / vendor..."
                    disabled={isLoadingSuppliers}
                    emptyMessage="Supplier tidak ditemukan di database"
                    className="w-full text-xs font-bold"
                  />
                </div>
              )}

              {/* 7. Upload Bukti Foto Fisik */}
              <EvidenceImageUploader
                images={evidenceImagesInput}
                onChange={setEvidenceImagesInput}
                disabled={isSubmitting}
              />

              {/* 8. Catatan Tambahan (Opsional) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                  Catatan Kondisi Barang (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Keterangan nomor faktur pengiriman, detail bocor/rusak..."
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] w-full placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                  disabled={
                    isSubmitting ||
                    !selectedProduct ||
                    maxAvailableStock <= 0 ||
                    numericQty > maxAvailableStock ||
                    (returnType === "RETURN_TO_SUPPLIER" && !supplierNameInput.trim())
                  }
                  className="bg-[#FFB800] hover:bg-[#FFA800] text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isSubmitting ? "Memproses..." : "Proses & Potong Stok"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL POP-UP DETAIL RETUR & BARANG RUSAK WITH GALLERY                 */}
      {/* ========================================================================= */}
      {selectedReturnDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-colors">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <span>Detail Retur Barcode</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
                    {selectedReturnDetail.returnCode}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-bold mt-0.5">
                  Dicatat pada: {formatDate(selectedReturnDetail.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturnDetail(null)}
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-center font-black text-xs cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Product Info Card */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-slate-900 dark:border-slate-100 space-y-1">
                <div className="font-black text-sm text-slate-900 dark:text-slate-100">
                  {selectedReturnDetail.productName}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <span>SKU: {selectedReturnDetail.sku}</span>
                  {selectedReturnDetail.category && <span>• {selectedReturnDetail.category}</span>}
                </div>
              </div>

              {/* Status & Type Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-300 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Tipe & Jumlah
                  </span>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedReturnDetail.type === "RETURN_TO_SUPPLIER" ? "📦 Retur ke Supplier" : "🗑️ Pemusnahan Rusak"}
                  </div>
                  <div className="font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    -{selectedReturnDetail.quantity} Unit
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-300 dark:border-slate-700">
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1">
                    Status Dokumen
                  </span>
                  <div className="font-bold">
                    {selectedReturnDetail.actionStatus === "COMPLETED" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black">✓ Selesai</span>
                    ) : selectedReturnDetail.actionStatus === "DISPOSED" ? (
                      <span className="text-rose-600 dark:text-rose-400 font-mono font-black">🔥 Dimusnahkan</span>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 font-mono font-black">⏳ Menunggu Pickup</span>
                    )}
                  </div>
                  <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                    Pelapor: {selectedReturnDetail.reportedBy}
                  </div>
                </div>
              </div>

              {/* Alasan & Supplier */}
              <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-700">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
                    Alasan Kerusakan / Retur:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {REASON_LABELS[selectedReturnDetail.reason] || selectedReturnDetail.reason}
                  </span>
                </div>
                {selectedReturnDetail.supplierName && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
                      Supplier / Vendor:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {selectedReturnDetail.supplierName}
                    </span>
                  </div>
                )}
                {selectedReturnDetail.notes && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
                      Catatan Tambahan:
                    </span>
                    <p className="italic text-slate-700 dark:text-slate-300 font-medium">
                      &quot;{selectedReturnDetail.notes}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* Evidence Photo Gallery */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
                  Foto Bukti Kondisi Fisik ({selectedReturnDetail.evidenceImages?.length || 0} Foto)
                </span>
                {selectedReturnDetail.evidenceImages && selectedReturnDetail.evidenceImages.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    {selectedReturnDetail.evidenceImages.map((imgUrl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setLightboxImages(selectedReturnDetail.evidenceImages || []);
                          setLightboxIndex(i);
                          setIsLightboxOpen(true);
                        }}
                        className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] group cursor-pointer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imgUrl}
                          alt={`Bukti ${i + 1}`}
                          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-black text-[10px]">
                          🔍 Perbesar
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-slate-500 dark:text-slate-400 font-medium italic">
                    Tidak ada foto bukti fisik yang dilampirkan.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-900 dark:border-slate-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedReturnDetail(null)}
                className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black text-xs rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:scale-105 transition-transform cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Pop-up Gallery */}
      <EvidenceLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={lightboxImages}
        initialIndex={lightboxIndex}
      />
    </div>
  );
}
