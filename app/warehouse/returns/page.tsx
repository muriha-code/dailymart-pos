"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Form Input States
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [returnType, setReturnType] = useState<ReturnType>("RETURN_TO_SUPPLIER");
  const [quantityInput, setQuantityInput] = useState<string>("1");
  const [reasonInput, setReasonInput] = useState<ReturnReason | string>("PACKAGING_DAMAGED");
  const [supplierNameInput, setSupplierNameInput] = useState<string>("");
  const [notesInput, setNotesInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  // Open Modal Handler
  const handleOpenModal = () => {
    setSubmitError(null);
    setSelectedProductId("");
    setReturnType("RETURN_TO_SUPPLIER");
    setQuantityInput("1");
    setReasonInput("PACKAGING_DAMAGED");
    setSupplierNameInput("");
    setNotesInput("");
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
      });

      setIsModalOpen(false);
      loadReturnLogs();
      loadProducts();
    } catch (err: any) {
      console.error("Gagal mencatat retur barang:", err);
      setSubmitError(err.message || "Gagal memproses pencatatan retur.");
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
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[11px] uppercase tracking-wider">
                Gudang & Inventaris
              </span>
              <span className="text-xs text-slate-400">• Retur & Damage</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Kelola Retur & Barang Rusak
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Pencatatan pengembalian barang ke vendor supplier dan pemusnahan barang rusak/kedaluwarsa.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Catat Retur / Barang Rusak</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. KPI METRICS CARDS                                                      */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Unit Diproses */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Unit Diproses
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                {totalUnitProcessed}{" "}
                <span className="text-xs font-normal text-slate-400">unit</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>

          {/* Card 2: Retur ke Supplier */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Retur ke Supplier (Claim)
              </span>
              <span className="text-2xl font-black text-amber-600 mt-1 block font-mono">
                {totalSupplierReturns}{" "}
                <span className="text-xs font-normal text-slate-400">unit</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8" />
              </svg>
            </div>
          </div>

          {/* Card 3: Pemusnahan Barang Rusak */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Pemusnahan / Write-Off
              </span>
              <span className="text-2xl font-black text-red-600 mt-1 block font-mono">
                {totalDisposals}{" "}
                <span className="text-xs font-normal text-slate-400">unit</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TOOLBAR SEARCH & FILTER                                                */}
        {/* ========================================================================= */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input Bar */}
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
              placeholder="Cari Kode Retur (RTN-...), SKU, Nama Produk, atau Supplier..."
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

          {/* Filters Dropdown */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Tipe Filter */}
            <div className="flex items-center gap-1.5 min-w-[150px]">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Tipe:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="ALL">Semua Tipe</option>
                <option value="RETURN_TO_SUPPLIER">Retur Supplier</option>
                <option value="DISPOSAL_DAMAGED">Pemusnahan Rusak</option>
              </select>
            </div>

            {/* Alasan Filter */}
            <div className="flex items-center gap-1.5 min-w-[160px]">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Alasan:</label>
              <select
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
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
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1.5"
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
        {/* 4. TABEL RIWAYAT RETUR / BARANG RUSAK                                      */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {isLoadingLogs ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Memuat riwayat retur & barang rusak...</p>
            </div>
          ) : logsError ? (
            <div className="p-12 text-center text-red-600 space-y-3">
              <p className="text-sm font-bold">{logsError}</p>
              <button
                type="button"
                onClick={loadReturnLogs}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Coba Lagi
              </button>
            </div>
          ) : returnLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <p className="text-sm font-bold text-slate-800">
                Belum ada data retur atau pemusnahan barang rusak.
              </p>
              <p className="text-xs text-slate-400">
                Klik tombol &quot;Catat Retur / Barang Rusak&quot; untuk memulai pencatatan baru.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full table-fixed text-left border-collapse text-xs text-slate-600">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="w-[15%] px-3.5 py-3">Waktu & Kode Retur</th>
                    <th className="w-[26%] px-3 py-3">Produk & SKU</th>
                    <th className="w-[10%] px-3 py-3 text-center">Jumlah</th>
                    <th className="w-[18%] px-3 py-3">Tipe & Alasan</th>
                    <th className="w-[19%] px-3 py-3">Supplier / Keterangan</th>
                    <th className="w-[12%] px-3.5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {returnLogs.map((log) => {
                    const isSupplierReturn = log.type === "RETURN_TO_SUPPLIER";
                    const reasonText = REASON_LABELS[log.reason] || log.reason;

                    return (
                      <tr
                        key={log.id || log.returnCode}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* 1. Waktu & Kode Retur */}
                        <td className="px-3.5 py-3 align-top">
                          <div className="font-mono font-bold text-slate-900 truncate">
                            {log.returnCode || log.id}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                            {formatDate(log.createdAt)}
                          </div>
                        </td>

                        {/* 2. Produk & SKU */}
                        <td className="px-3 py-3 align-top">
                          <div className="font-semibold text-slate-900 leading-snug line-clamp-1" title={log.productName}>
                            {log.productName}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                            <span className="font-mono font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              {log.sku}
                            </span>
                            {log.category && (
                              <>
                                <span>•</span>
                                <span className="truncate text-slate-400">{log.category}</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* 3. Jumlah (Qty) */}
                        <td className="px-3 py-3 align-top text-center">
                          <span className="inline-block font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 text-xs whitespace-nowrap">
                            -{log.quantity} Unit
                          </span>
                        </td>

                        {/* 4. Tipe & Alasan */}
                        <td className="px-3 py-3 align-top">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            !isSupplierReturn 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {!isSupplierReturn ? '🗑️ Pemusnahan' : '📦 Retur Vendor'}
                          </span>
                          <p className="text-[11px] font-medium text-slate-700 mt-1 line-clamp-1" title={reasonText}>
                            {reasonText}
                          </p>
                        </td>

                        {/* 5. Supplier / Keterangan */}
                        <td className="px-3 py-3 align-top">
                          {isSupplierReturn && log.supplierName && log.supplierName !== '-' ? (
                            <div className="font-semibold text-slate-800 text-[11px] line-clamp-1" title={log.supplierName}>
                              {log.supplierName}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">Pemusnahan Internal</div>
                          )}
                          {log.notes && (
                            <p className="text-[11px] text-slate-500 italic line-clamp-2 mt-0.5" title={log.notes}>
                              &quot;{log.notes}&quot;
                            </p>
                          )}
                        </td>

                        {/* 6. Status */}
                        <td className="px-3.5 py-3 align-top text-right whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            log.actionStatus === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : log.actionStatus === 'DISPOSED'
                              ? 'bg-slate-100 text-slate-700 border-slate-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {log.actionStatus === 'COMPLETED'
                              ? '✓ Selesai'
                              : log.actionStatus === 'DISPOSED'
                              ? '🔥 Dimusnahkan'
                              : '⏳ Menunggu'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL FORM PENCATATAN RETUR & BARANG RUSAK                             */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Formulir Retur & Barang Rusak
                </h3>
                <p className="text-xs text-slate-500">
                  Pencatatan barang cacat/expired untuk dipotong dari stok produk secara atomik.
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
            <form onSubmit={handleSubmitReturn} className="p-5 overflow-y-auto space-y-4 flex-1">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                  {submitError}
                </div>
              )}

              {/* 1. Pemilihan Produk */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Pilih Produk Yang Diretur / Rusak <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={productSearchModal}
                  onChange={(e) => setProductSearchModal(e.target.value)}
                  placeholder="Ketik untuk filter nama produk / SKU..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium mb-1"
                />

                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                        className={stock <= 0 ? "text-slate-400 bg-slate-100" : "text-slate-900 font-bold"}
                      >
                        {p.name} (SKU: {p.sku} | Stok: {stock} {p.unit}){stock <= 0 ? " [Stok Habis]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 2. Ringkasan Info Produk Terpilih */}
              {selectedProduct && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900">
                      {selectedProduct.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      SKU: {selectedProduct.sku} • {selectedProduct.categoryName || "Umum"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Stok Tersedia
                    </span>
                    <span className="text-sm font-black font-mono text-slate-800">
                      {maxAvailableStock} {selectedProduct.unit}
                    </span>
                  </div>
                </div>
              )}

              {/* 3. Tipe Proses Retur (Pill Selector) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Tipe Proses Retur <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnType("RETURN_TO_SUPPLIER")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      returnType === "RETURN_TO_SUPPLIER"
                        ? "bg-amber-50 border-amber-500 text-amber-950 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>📦 Retur ke Supplier</span>
                    <span className="text-[10px] font-normal text-slate-500 text-center">
                      Klaim pengembalian barang ke vendor
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnType("DISPOSAL_DAMAGED")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      returnType === "DISPOSAL_DAMAGED"
                        ? "bg-red-50 border-red-500 text-red-950 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>🗑️ Pemusnahan Barang Rusak</span>
                    <span className="text-[10px] font-normal text-slate-500 text-center">
                      Write-off pecah / expired / busuk
                    </span>
                  </button>
                </div>
              </div>

              {/* 4. Input Jumlah Retur / Rusak */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Jumlah Barang (Qty Unit) <span className="text-red-500">*</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantityInput(String(Math.max(1, numericQty - 1)))}
                    disabled={!selectedProduct || numericQty <= 1}
                    className="w-10 h-10 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-base flex items-center justify-center cursor-pointer disabled:opacity-40"
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
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black font-mono text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />

                  <button
                    type="button"
                    onClick={() => setQuantityInput(String(Math.min(maxAvailableStock || 1, numericQty + 1)))}
                    disabled={!selectedProduct || numericQty >= maxAvailableStock}
                    className="w-10 h-10 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-base flex items-center justify-center cursor-pointer disabled:opacity-40"
                  >
                    +
                  </button>
                </div>

                {selectedProduct && numericQty > maxAvailableStock && (
                  <p className="text-[11px] text-red-600 font-bold">
                    ⚠️ Jumlah retur melebihi stok yang tersedia ({maxAvailableStock} {selectedProduct.unit}).
                  </p>
                )}
              </div>

              {/* 5. Alasan Kerusakan / Retur */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Alasan Kerusakan / Retur <span className="text-red-500">*</span>
                </label>

                <select
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="PACKAGING_DAMAGED">Kemasan Rusak / Bocor / Pecah</option>
                  <option value="EXPIRED">Kedaluwarsa / Expired</option>
                  <option value="FACTORY_DEFECT">Cacat Pabrik / Defektif</option>
                  <option value="NEAR_EXPIRY">Mendekati Kedaluwarsa</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>

              {/* 6. Nama Supplier (Searchable Dropdown dari Database) */}
              {returnType === "RETURN_TO_SUPPLIER" && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Nama Supplier / Vendor <span className="text-red-500">*</span>
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

              {/* 7. Catatan Tambahan (Opsional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Catatan Kondisi Barang (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Keterangan nomor faktur pengiriman, detail bocor/rusak..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                  disabled={
                    isSubmitting ||
                    !selectedProduct ||
                    maxAvailableStock <= 0 ||
                    numericQty > maxAvailableStock ||
                    (returnType === "RETURN_TO_SUPPLIER" && !supplierNameInput.trim())
                  }
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isSubmitting ? "Memproses..." : "Proses & Potong Stok"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
