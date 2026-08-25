"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Product } from "@/types/product.types";
import { productService } from "@/services/product.service";
import { restockRequestService } from "@/services/restockRequest.service";
import {
  RestockRequestRecord,
  RestockRequestSummary,
  RequestUrgency,
  RequestStatus,
} from "@/types/restockRequest.types";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/common/SearchableSelect";
import Pagination from "@/components/common/Pagination";

// Helper Format Date
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

export default function RestockRequestsPage() {
  // Main Data States
  const [records, setRecords] = useState<RestockRequestRecord[]>([]);
  const [summary, setSummary] = useState<RestockRequestSummary>({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Master Catalog Products State (for Modal selection)
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<RestockRequestRecord | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [requestedQtyInput, setRequestedQtyInput] = useState<string>("10");
  const [urgencyInput, setUrgencyInput] = useState<RequestUrgency>("NORMAL");
  const [reasonNotesInput, setReasonNotesInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [seedingLoading, setSeedingLoading] = useState<boolean>(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  // Load Restock Request Tickets
  const loadRestockRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await restockRequestService.getRestockRequests({
        search: searchQuery,
        status: statusFilter,
        urgency: urgencyFilter,
      });
      setRecords(data.data);
      setSummary(data.summary);
    } catch (err: any) {
      console.error("Gagal memuat data pengajuan restok:", err);
      setError(
        err.message || "Gagal terhubung ke database. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, urgencyFilter]);

  // Load Products Catalog
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const data = await productService.getProducts({ status: "active" });
      setProducts(data);
    } catch (err) {
      console.warn("Gagal memuat katalog produk untuk form restok:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadRestockRequests();
  }, [loadRestockRequests]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Auto-Reset Halaman ke 1 saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, urgencyFilter]);

  // Paginated records for table rendering
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return records.slice(start, start + ITEMS_PER_PAGE);
  }, [records, currentPage]);

  // Product options mapped for SearchableSelect
  const productOptions: SearchableSelectOption[] = useMemo(() => {
    return products.map((p) => ({
      value: p.id!,
      label: p.name,
      sublabel: `SKU: ${p.sku} | Stok: ${p.stock} ${p.unit || "Pcs"}`,
    }));
  }, [products]);

  // Selected Product details in form modal
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Handle Open Modal
  const handleOpenModal = () => {
    setSubmitError(null);
    setSelectedProductId("");
    setRequestedQtyInput("10");
    setUrgencyInput("NORMAL");
    setReasonNotesInput("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
  };

  // Handle Submit Form
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      setSubmitError("Harap pilih produk yang akan diajukan!");
      return;
    }

    const qty = parseInt(requestedQtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      setSubmitError("Jumlah barang yang diminta harus minimal 1 unit!");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await restockRequestService.createRestockRequest({
        productId: selectedProductId,
        requestedQty: qty,
        urgency: urgencyInput,
        reasonNotes: reasonNotesInput,
      });

      toast.success("Pengajuan restok berhasil dibuat");
      setIsModalOpen(false);
      loadRestockRequests();
    } catch (err: any) {
      console.error("Gagal membuat pengajuan restok:", err);
      toast.error(err.message || "Gagal menyimpan tiket pengajuan restok.");
      setSubmitError(err.message || "Gagal menyimpan tiket pengajuan restok.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trigger Seeder Handler
  const handleTriggerSeeder = async () => {
    setSeedingLoading(true);
    try {
      await restockRequestService.seedRestockRequests();
      await loadRestockRequests();
    } catch (err: any) {
      alert("Gagal seeding data: " + (err.message || err));
    } finally {
      setSeedingLoading(false);
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
              Restock Request List
            </h1>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              Kelola dan pantau tiket pengajuan pengadaan stok barang dari tim gudang ke purchasing/admin.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleOpenModal}
              className="bg-[#FFB800] hover:bg-[#FFA800] text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:hover:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Buat Pengajuan Baru</span>
            </button>

            <button
              type="button"
              onClick={loadRestockRequests}
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

        {/* ========================================================================= */}
        {/* 2. KPI SUMMARY HEADER CARDS (4 GRID METRICS - COMPACT)                    */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {/* Card 1: Total Pengajuan */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center min-h-[72px] transition-all">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Total Pengajuan
            </span>
            <span className="text-lg font-black font-mono text-slate-900 dark:text-slate-50 block">
              {summary.total}{" "}
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">tiket</span>
            </span>
          </div>

          {/* Card 2: Menunggu Persetujuan (Pending) */}
          <div className="bg-[#FEF3C7] dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center min-h-[72px] transition-all">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#B45309] dark:text-amber-300 block mb-1">
              Menunggu Persetujuan
            </span>
            <span className="text-[#B45309] dark:text-amber-300 font-mono font-black text-lg block">
              {summary.pending}{" "}
              <span className="text-xs font-bold text-[#B45309]/80 dark:text-amber-300/80">pending</span>
            </span>
          </div>

          {/* Card 3: Disetujui Admin (Approved) */}
          <div className="bg-[#EEF2FF] dark:bg-indigo-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center min-h-[72px] transition-all">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#4338CA] dark:text-indigo-300 block mb-1">
              Disetujui (Procurement)
            </span>
            <span className="text-[#4338CA] dark:text-indigo-300 font-mono font-black text-lg block">
              {summary.approved}{" "}
              <span className="text-xs font-bold text-[#4338CA]/80 dark:text-indigo-300/80">tiket</span>
            </span>
          </div>

          {/* Card 4: Selesai Diterima (Completed) */}
          <div className="bg-[#E8F5E9] dark:bg-emerald-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center min-h-[72px] transition-all">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#065F46] dark:text-emerald-300 block mb-1">
              Selesai Diterima
            </span>
            <span className="text-[#065F46] dark:text-emerald-300 font-mono font-black text-lg block">
              {summary.completed}{" "}
              <span className="text-xs font-bold text-[#065F46]/80 dark:text-emerald-300/80">tiket</span>
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TOOLBAR SEARCH & FILTERS DENGAN OVAL/PILL INPUTS                       */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] flex flex-wrap items-center gap-2 mb-4 transition-colors">
          {/* Search Input Bar (Oval/Pill) */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Kode Tiket (REQ-...), Produk, SKU, atau Pemohon..."
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

          {/* Filter Options (Oval/Pill) */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-4 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">Menunggu (Pending)</option>
                <option value="APPROVED">Disetujui (Approved)</option>
                <option value="COMPLETED">Selesai (Completed)</option>
                <option value="REJECTED">Ditolak (Rejected)</option>
              </select>
            </div>

            {/* Urgency Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">Urgensi:</label>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-4 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
              >
                <option value="ALL">Semua Urgensi</option>
                <option value="URGENT">Sangat Mendesak</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Rendah</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TABEL RESTOCK REQUEST LIST                                             */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[3.5px_3.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3.5px_3.5px_0px_0px_rgba(255,255,255,1)] overflow-hidden transition-colors">
          {isLoading ? (
            <div className="p-12 text-center text-slate-700 dark:text-slate-300 space-y-2">
              <div className="w-8 h-8 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-black">Memuat data tiket pengajuan restok...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-rose-600 dark:text-rose-400 space-y-2">
              <p className="text-sm font-black">{error}</p>
              <button
                type="button"
                onClick={loadRestockRequests}
                className="px-4 py-2 bg-[#6366F1] text-white border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-[#4F46E5] cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-900 dark:text-slate-100 space-y-2">
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                Belum ada data tiket pengajuan restok barang.
              </p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Klik tombol &quot;Buat Pengajuan Baru&quot; atau tambahkan sampel data awal.
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
                    <th className="px-3 py-3">Waktu & Kode Tiket</th>
                    <th className="px-3 py-3">Produk & SKU</th>
                    <th className="px-2 py-3 text-center">Stok Saat Ini</th>
                    <th className="px-2 py-3 text-center">Qty Minta</th>
                    <th className="px-2 py-3 text-center">Urgensi</th>
                    <th className="px-2 py-3 text-center">Status Tiket</th>
                    <th className="px-3 py-3">Pemohon & Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {paginatedRecords.map((item) => {
                    return (
                      <tr
                        key={item.id || item.requestCode}
                        onClick={() => setSelectedDetailRequest(item)}
                        title="Klik untuk melihat detail lengkap tiket"
                        className="hover:bg-slate-50/90 dark:hover:bg-slate-800/90 transition-colors cursor-pointer border-b border-slate-200 dark:border-slate-800"
                      >
                        {/* 1. Waktu & Kode Tiket */}
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                            {item.requestCode}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                            {formatDate(item.createdAt)}
                          </div>
                        </td>

                        {/* 2. Produk & SKU */}
                        <td className="px-3 py-3 align-top">
                          <div className="font-black text-slate-900 dark:text-slate-100 leading-snug" title={item.productName}>
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

                        {/* 3. Stok Fisik Saat Ini */}
                        <td className="px-2 py-3 align-top text-center whitespace-nowrap font-mono">
                          <span className={`font-black text-xs ${item.currentStock === 0 ? 'text-red-700 dark:text-red-400' : 'text-[#B45309] dark:text-amber-400'}`}>
                            {item.currentStock} {item.unit || "Pcs"}
                          </span>
                        </td>

                        {/* 4. Qty Diminta Badge */}
                        <td className="px-2 py-3 align-top text-center whitespace-nowrap">
                          <span className="bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-black text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                            +{item.requestedQty} {item.unit || "Pcs"}
                          </span>
                        </td>

                        {/* 5. Urgensi Badges */}
                        <td className="px-2 py-3 align-top text-center whitespace-nowrap">
                          {item.urgency === 'URGENT' ? (
                            <span className="bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-400 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-black text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                              MENDESAK
                            </span>
                          ) : (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-400 dark:border-slate-600 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md inline-block">
                              {item.urgency === 'NORMAL' ? 'NORMAL' : 'RENDAH'}
                            </span>
                          )}
                        </td>

                        {/* 6. Status Tiket Badges */}
                        <td className="px-2 py-3 align-top text-center whitespace-nowrap">
                          {item.status === 'PENDING' && (
                            <span className="bg-[#FEF3C7] dark:bg-amber-950/60 text-[#B45309] dark:text-amber-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                              MENUNGGU PERSETUJUAN
                            </span>
                          )}
                          {item.status === 'APPROVED' && (
                            <span className="bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                              DISETUJUI
                            </span>
                          )}
                          {item.status === 'REJECTED' && (
                            <span className="bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-400 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                              DITOLAK
                            </span>
                          )}
                          {item.status === 'COMPLETED' && (
                            <span className="bg-[#D1FAE5] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                              SELESAI
                            </span>
                          )}
                        </td>

                        {/* 7. Pemohon & Catatan */}
                        <td className="px-3 py-3 align-top">
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-xs" title={item.requestedBy}>
                            {item.requestedBy}
                          </div>
                          {item.reasonNotes && (
                            <p 
                              className="text-[11px] text-slate-600 dark:text-slate-400 italic truncate mt-0.5 font-normal"
                              title={item.reasonNotes}
                            >
                              &quot;{item.reasonNotes}&quot;
                            </p>
                          )}
                          {item.status === 'REJECTED' && item.rejectionReason && (
                            <p 
                              className="text-[10px] text-rose-600 dark:text-rose-400 italic truncate mt-0.5 font-bold"
                              title={`Alasan Ditolak: ${item.rejectionReason}`}
                            >
                              Alasan: {item.rejectionReason}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Integrated Reusable Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={records.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL FORMULIR PENGAJUAN RESTOK BARU                                   */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-colors">

            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between shrink-0 transition-colors">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-slate-50">
                  Formulir Pengajuan Restok Barang Baru
                </h3>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Buat tiket permintaan pengadaan stok ke tim Purchasing/Admin.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-400 text-base font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitRequest} className="p-5 overflow-y-auto space-y-4 flex-1">
              {submitError && (
                <div className="p-3 bg-[#FFE4E6] dark:bg-rose-950/60 border-1.5 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-black text-[#E11D48] dark:text-rose-300">
                  {submitError}
                </div>
              )}

              {/* 1. Pilih Produk */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  Pilih Produk Yang Membutuhkan Restok <span className="text-red-500 dark:text-red-400">*</span>
                </label>

                <SearchableSelect
                  options={productOptions}
                  value={selectedProductId}
                  onChange={(val) => setSelectedProductId(val)}
                  placeholder="-- Pilih Produk Ritel --"
                  searchPlaceholder="Cari SKU atau Nama Produk..."
                  disabled={isLoadingProducts}
                  emptyMessage="Produk tidak ditemukan di katalog"
                  className="w-full text-xs font-bold"
                />
              </div>

              {/* Preview Produk Terpilih */}
              {selectedProduct && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-1.5 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between transition-colors">
                  <div>
                    <h4 className="font-black text-xs text-slate-900 dark:text-slate-100">
                      {selectedProduct.name}
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono font-bold mt-0.5">
                      SKU: {selectedProduct.sku} • {selectedProduct.categoryName || "Umum"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block">
                      Stok Fisik Saat Ini
                    </span>
                    <span className="text-sm font-black font-mono text-[#B45309] dark:text-amber-400">
                      {selectedProduct.stock} {selectedProduct.unit}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. Jumlah Qty Diminta */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  Jumlah Barang Yang Diminta (Qty) <span className="text-red-500 dark:text-red-400">*</span>
                </label>

                <input
                  type="number"
                  min="1"
                  value={requestedQtyInput}
                  onChange={(e) => setRequestedQtyInput(e.target.value)}
                  placeholder="Masukkan jumlah unit..."
                  required
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-base font-black font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                />
              </div>

              {/* 3. Tingkat Urgensi (Pill Selectors) */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  Tingkat Urgensi Restok <span className="text-red-500 dark:text-red-400">*</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setUrgencyInput("LOW")}
                    className={`px-3 py-2.5 rounded-xl border-1.5 border-slate-900 dark:border-slate-100 text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${urgencyInput === "LOW"
                        ? "bg-[#E0F2FE] dark:bg-sky-950/60 text-[#0369A1] dark:text-sky-300 font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                  >
                    <span>Rendah</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Pengadaan rutin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrgencyInput("NORMAL")}
                    className={`px-3 py-2.5 rounded-xl border-1.5 border-slate-900 dark:border-slate-100 text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${urgencyInput === "NORMAL"
                        ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                  >
                    <span>Normal</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Persediaan standar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrgencyInput("URGENT")}
                    className={`px-3 py-2.5 rounded-xl border-1.5 border-slate-900 dark:border-slate-100 text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${urgencyInput === "URGENT"
                        ? "bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-400 font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                  >
                    <span>Mendesak</span>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Stok habis/kritis</span>
                  </button>
                </div>
              </div>

              {/* 4. Catatan / Alasan Restok */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider block">
                  Catatan / Alasan Pengajuan Restok
                </label>
                <textarea
                  rows={3}
                  value={reasonNotesInput}
                  onChange={(e) => setReasonNotesInput(e.target.value)}
                  placeholder="Contoh: Stok toko tinggal sedikit menjelang promo akhir pekan..."
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t-2 border-slate-900 dark:border-slate-100 flex items-center justify-end gap-2 shrink-0 transition-colors">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedProductId}
                  className="px-4 py-2 rounded-xl bg-[#FFB800] hover:bg-[#FFA800] text-slate-950 font-black text-xs border-2 border-slate-900 dark:border-slate-100 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isSubmitting ? "Kirim Pengajuan..." : "Kirim Tiket Pengajuan"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL QUICK VIEW DETAIL PENGAJUAN (RestockDetailModal)                 */}
      {/* ========================================================================= */}
      {selectedDetailRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] flex flex-col max-h-[90vh] overflow-hidden transition-colors">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-100 pb-4 shrink-0 transition-colors">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  DETAIL PENGAJUAN RESTOK
                </span>
                <h3 className="text-lg font-black font-mono text-slate-900 dark:text-slate-50 mt-0.5">
                  {selectedDetailRequest.requestCode}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {selectedDetailRequest.status === 'PENDING' && (
                  <span className="bg-[#FEF3C7] dark:bg-amber-950/60 text-[#B45309] dark:text-amber-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2.5 py-1 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                    MENUNGGU PERSETUJUAN
                  </span>
                )}
                {selectedDetailRequest.status === 'APPROVED' && (
                  <span className="bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2.5 py-1 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                    DISETUJUI
                  </span>
                )}
                {selectedDetailRequest.status === 'REJECTED' && (
                  <span className="bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2.5 py-1 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                    DITOLAK
                  </span>
                )}
                {selectedDetailRequest.status === 'COMPLETED' && (
                  <span className="bg-[#D1FAE5] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2.5 py-1 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]">
                    SELESAI
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDetailRequest(null)}
                  className="rounded-xl p-1.5 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-base font-black"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="mt-4 space-y-4 text-xs text-slate-900 dark:text-slate-100 font-bold overflow-y-auto flex-1 pr-1">
              {/* Info Produk */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border-1.5 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] space-y-2 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Produk Yang Diajukan</p>
                    <p className="text-sm font-black text-slate-900 dark:text-slate-100 mt-0.5">{selectedDetailRequest.productName}</p>
                  </div>
                  {selectedDetailRequest.categoryName && (
                    <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px] border border-slate-300 dark:border-slate-600">
                      {selectedDetailRequest.categoryName}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-slate-800 dark:text-slate-200 pt-2 border-t border-slate-300 dark:border-slate-700 font-mono text-xs">
                  <span>SKU: <strong className="text-slate-900 dark:text-slate-100">{selectedDetailRequest.sku}</strong></span>
                  <span>Stok Saat Minta: <strong>{selectedDetailRequest.currentStock} {selectedDetailRequest.unit || "Pcs"}</strong></span>
                  <span>Qty Diminta: <strong className="text-[#4338CA] dark:text-indigo-400 font-black">+{selectedDetailRequest.requestedQty} {selectedDetailRequest.unit || "Pcs"}</strong></span>
                </div>
              </div>

              {/* Pemohon & Urgensi */}
              <div className="flex justify-between items-center px-1">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px]">Diajukan oleh:</span>
                  <p className="font-black text-slate-900 dark:text-slate-100 text-xs mt-0.5">{selectedDetailRequest.requestedBy}</p>
                  <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(selectedDetailRequest.createdAt)}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px]">Tingkat Urgensi:</span>
                  <p className={`font-black text-xs uppercase mt-0.5 ${
                    selectedDetailRequest.urgency === 'URGENT' ? 'text-[#E11D48] dark:text-rose-400' : selectedDetailRequest.urgency === 'LOW' ? 'text-sky-700 dark:text-sky-400' : 'text-slate-900 dark:text-slate-100'
                  }`}>
                    {selectedDetailRequest.urgency === 'URGENT' ? 'Sangat Mendesak' : selectedDetailRequest.urgency === 'LOW' ? 'Rendah' : 'Normal'}
                  </p>
                </div>
              </div>

              {/* Catatan Lengkap Pemohon */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Catatan / Alasan Pemohon:
                </label>
                <div className="rounded-xl border-1.5 border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800 p-3.5 text-slate-900 dark:text-slate-100 font-medium italic text-xs shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]">
                  &quot;{selectedDetailRequest.reasonNotes || 'Tidak ada catatan tambahan.'}&quot;
                </div>
              </div>

              {/* Alasan Ditolak (Jika Ada) */}
              {selectedDetailRequest.status === 'REJECTED' && selectedDetailRequest.rejectionReason && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#E11D48] dark:text-rose-400 mb-1">
                    Alasan Penolakan dari Admin:
                  </label>
                  <div className="rounded-xl border-1.5 border-slate-900 dark:border-slate-100 bg-[#FFE4E6] dark:bg-rose-950/60 p-3.5 text-[#E11D48] dark:text-rose-300 font-bold text-xs shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]">
                    {selectedDetailRequest.rejectionReason}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-3 border-t-2 border-slate-900 dark:border-slate-100 flex justify-end shrink-0 transition-colors">
              <button
                type="button"
                onClick={() => setSelectedDetailRequest(null)}
                className="rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 border-2 border-slate-900 dark:border-slate-100 px-5 py-2 text-xs font-black text-white dark:text-slate-950 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
