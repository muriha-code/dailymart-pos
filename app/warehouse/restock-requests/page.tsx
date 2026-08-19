"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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

      setIsModalOpen(false);
      loadRestockRequests();
    } catch (err: any) {
      console.error("Gagal membuat pengajuan restok:", err);
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
              <span className="text-xs text-slate-400">• Pengadaan Barang</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Restock Request List
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Kelola dan pantau tiket pengajuan pengadaan stok barang dari tim gudang ke purchasing/admin.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Buat Pengajuan Baru</span>
            </button>

            <button
              type="button"
              onClick={loadRestockRequests}
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

        {/* ========================================================================= */}
        {/* 2. KPI SUMMARY HEADER CARDS                                               */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Pengajuan */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Pengajuan
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                {summary.total}{" "}
                <span className="text-xs font-normal text-slate-400">tiket</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          {/* Card 2: Menunggu Persetujuan (Pending) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Menunggu Persetujuan
              </span>
              <span className="text-2xl font-black text-amber-600 mt-1 block font-mono">
                {summary.pending}{" "}
                <span className="text-xs font-normal text-slate-400">pending</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Card 3: Disetujui Admin (Approved) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Disetujui (Procurement)
              </span>
              <span className="text-2xl font-black text-blue-600 mt-1 block font-mono">
                {summary.approved}{" "}
                <span className="text-xs font-normal text-slate-400">tiket</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          {/* Card 4: Selesai Diterima (Completed) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Selesai Diterima
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono">
                {summary.completed}{" "}
                <span className="text-xs font-normal text-slate-400">tiket</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TOOLBAR SEARCH & FILTERS                                               */}
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
              placeholder="Cari Kode Tiket (REQ-...), Produk, SKU, atau Pemohon..."
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

          {/* Filter Options */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 min-w-[150px]">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="PENDING">Menunggu (Pending)</option>
                <option value="APPROVED">Disetujui (Approved)</option>
                <option value="COMPLETED">Selesai (Completed)</option>
                <option value="REJECTED">Ditolak (Rejected)</option>
              </select>
            </div>

            {/* Urgency Filter */}
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Urgensi:</label>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Memuat data tiket pengajuan restok...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600 space-y-3">
              <p className="text-sm font-bold">{error}</p>
              <button
                type="button"
                onClick={loadRestockRequests}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <p className="text-sm font-bold text-slate-800">
                Belum ada data tiket pengajuan restok barang.
              </p>
              <p className="text-xs text-slate-400">
                Klik tombol &quot;+ Buat Pengajuan Baru&quot; atau tambahkan sampel data awal.
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
            <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full table-fixed text-left border-collapse text-xs text-slate-600">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="w-[16%] px-3 py-3">Waktu & Kode Tiket</th>
                    <th className="w-[24%] px-3 py-3">Produk & SKU</th>
                    <th className="w-[9%] px-2 py-3 text-center">
                      <div className="leading-tight">
                        <span>STOK</span>
                        <br />
                        <span className="text-[10px] text-slate-400 font-medium">SAAT INI</span>
                      </div>
                    </th>
                    <th className="w-[9%] px-2 py-3 text-center">Qty Minta</th>
                    <th className="w-[12%] px-2 py-3 text-center">Urgensi</th>
                    <th className="w-[13%] px-2 py-3 text-center">Status Tiket</th>
                    <th className="w-[17%] px-3 py-3">Pemohon & Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedRecords.map((item) => {
                    return (
                      <tr
                        key={item.id || item.requestCode}
                        onClick={() => setSelectedDetailRequest(item)}
                        title="Klik untuk melihat detail lengkap tiket"
                        className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                      >
                        {/* 1. Waktu & Kode Tiket */}
                        <td className="px-3 py-3 align-top">
                          <div className="font-mono font-bold text-slate-900 text-xs">
                            {item.requestCode}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                            {formatDate(item.createdAt)}
                          </div>
                        </td>

                        {/* 2. Produk & SKU */}
                        <td className="px-3 py-3 align-top">
                          <div className="font-semibold text-slate-900 leading-snug truncate" title={item.productName}>
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

                        {/* 3. Stok Fisik Saat Ini */}
                        <td className="px-2 py-3 align-top text-center">
                          <span className={`font-mono font-bold ${item.currentStock === 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {item.currentStock} {item.unit || "Pcs"}
                          </span>
                        </td>

                        {/* 4. Qty Diminta */}
                        <td className="px-2 py-3 align-top text-center">
                          <span className="inline-block font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 text-[11px]">
                            +{item.requestedQty} {item.unit || "Pcs"}
                          </span>
                        </td>

                        {/* 5. Urgensi */}
                        <td className="px-2 py-3 align-top text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.urgency === 'URGENT'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.urgency === 'NORMAL'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {item.urgency === 'URGENT' ? 'Mendesak' : item.urgency === 'NORMAL' ? 'Normal' : 'Rendah'}
                          </span>
                        </td>

                        {/* 6. Status Tiket */}
                        <td className="px-2 py-3 align-top text-center">
                          {item.status === 'PENDING' && (
                            <span className="inline-flex flex-col items-center justify-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 leading-tight">
                              <span>MENUNGGU</span>
                              <span>PERSETUJUAN</span>
                            </span>
                          )}
                          {item.status === 'APPROVED' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                              DISETUJUI
                            </span>
                          )}
                          {item.status === 'REJECTED' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                              DITOLAK
                            </span>
                          )}
                          {item.status === 'COMPLETED' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              SELESAI
                            </span>
                          )}
                        </td>

                        {/* 7. Pemohon & Catatan (Dengan Tooltip) */}
                        <td className="px-3 py-3 align-top">
                          <div className="font-semibold text-slate-800 text-[11px] truncate" title={item.requestedBy}>
                            {item.requestedBy}
                          </div>
                          {item.reasonNotes && (
                            <p 
                              className="text-[11px] text-slate-500 italic truncate mt-0.5 cursor-pointer hover:text-slate-800"
                              title={item.reasonNotes}
                            >
                              &quot;{item.reasonNotes}&quot;
                            </p>
                          )}
                          {item.status === 'REJECTED' && item.rejectionReason && (
                            <p 
                              className="text-[10px] text-rose-600 italic truncate mt-0.5 font-medium"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Formulir Pengajuan Restok Barang Baru
                </h3>
                <p className="text-xs text-slate-500">
                  Buat tiket permintaan pengadaan stok ke tim Purchasing/Admin.
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
            <form onSubmit={handleSubmitRequest} className="p-5 overflow-y-auto space-y-4 flex-1">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
                  {submitError}
                </div>
              )}

              {/* 1. Pilih Produk */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Pilih Produk Yang Membutuhkan Restok <span className="text-red-500">*</span>
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
                      Stok Fisik Saat Ini
                    </span>
                    <span className="text-sm font-black font-mono text-slate-800">
                      {selectedProduct.stock} {selectedProduct.unit}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. Jumlah Qty Diminta */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Jumlah Barang Yang Diminta (Qty) <span className="text-red-500">*</span>
                </label>

                <input
                  type="number"
                  min="1"
                  value={requestedQtyInput}
                  onChange={(e) => setRequestedQtyInput(e.target.value)}
                  placeholder="Masukkan jumlah unit..."
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-base font-black font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* 3. Tingkat Urgensi (Pill Selectors) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Tingkat Urgensi Restok <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setUrgencyInput("LOW")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${urgencyInput === "LOW"
                        ? "bg-sky-50 border-sky-500 text-sky-950 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    <span>Rendah</span>
                    <span className="text-[10px] font-normal text-slate-400">Pengadaan rutin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrgencyInput("NORMAL")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${urgencyInput === "NORMAL"
                        ? "bg-slate-900 border-slate-900 text-white shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    <span>Normal</span>
                    <span className="text-[10px] font-normal text-slate-400">Persediaan standar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUrgencyInput("URGENT")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${urgencyInput === "URGENT"
                        ? "bg-rose-50 border-rose-500 text-rose-950 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    <span>Sangat Mendesak</span>
                    <span className="text-[10px] font-normal text-slate-400">Stok habis/kritis</span>
                  </button>
                </div>
              </div>

              {/* 4. Catatan / Alasan Restok */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Catatan / Alasan Pengajuan Restok
                </label>
                <textarea
                  rows={3}
                  value={reasonNotesInput}
                  onChange={(e) => setReasonNotesInput(e.target.value)}
                  placeholder="Contoh: Stok toko tinggal sedikit menjelang promo akhir pekan..."
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
                  disabled={isSubmitting || !selectedProductId}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div>
                <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  DETAIL PENGAJUAN RESTOK
                </span>
                <h3 className="text-lg font-bold font-mono text-slate-900 mt-0.5">
                  {selectedDetailRequest.requestCode}
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                {selectedDetailRequest.status === 'PENDING' && (
                  <span className="inline-flex flex-col items-center justify-center px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 leading-tight">
                    <span>MENUNGGU</span>
                    <span>PERSETUJUAN</span>
                  </span>
                )}
                {selectedDetailRequest.status === 'APPROVED' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    DISETUJUI
                  </span>
                )}
                {selectedDetailRequest.status === 'REJECTED' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                    DITOLAK
                  </span>
                )}
                {selectedDetailRequest.status === 'COMPLETED' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    SELESAI
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedDetailRequest(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer text-base font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="mt-4 space-y-4 text-xs text-slate-600 overflow-y-auto flex-1 pr-1">
              {/* Info Produk */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Produk Yang Diajukan</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{selectedDetailRequest.productName}</p>
                  </div>
                  {selectedDetailRequest.categoryName && (
                    <span className="px-2 py-0.5 rounded bg-slate-200/60 text-slate-700 font-semibold text-[11px]">
                      {selectedDetailRequest.categoryName}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-slate-700 pt-2 border-t border-slate-200/80 font-mono text-xs">
                  <span>SKU: <strong className="text-slate-900">{selectedDetailRequest.sku}</strong></span>
                  <span>Stok Saat Minta: <strong>{selectedDetailRequest.currentStock} {selectedDetailRequest.unit || "Pcs"}</strong></span>
                  <span>Qty Diminta: <strong className="text-blue-600 font-black">+{selectedDetailRequest.requestedQty} {selectedDetailRequest.unit || "Pcs"}</strong></span>
                </div>
              </div>

              {/* Pemohon & Urgensi */}
              <div className="flex justify-between items-center px-1">
                <div>
                  <span className="text-slate-400">Diajukan oleh:</span>
                  <p className="font-semibold text-slate-800 text-xs mt-0.5">{selectedDetailRequest.requestedBy}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(selectedDetailRequest.createdAt)}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400">Tingkat Urgensi:</span>
                  <p className={`font-bold text-xs uppercase mt-0.5 ${
                    selectedDetailRequest.urgency === 'URGENT' ? 'text-rose-600' : selectedDetailRequest.urgency === 'LOW' ? 'text-sky-600' : 'text-slate-800'
                  }`}>
                    {selectedDetailRequest.urgency === 'URGENT' ? 'Sangat Mendesak' : selectedDetailRequest.urgency === 'LOW' ? 'Rendah' : 'Normal'}
                  </p>
                </div>
              </div>

              {/* Catatan Lengkap Pemohon */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Catatan / Alasan Pemohon:
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50/75 p-3.5 text-slate-800 leading-relaxed italic text-xs">
                  &quot;{selectedDetailRequest.reasonNotes || 'Tidak ada catatan tambahan.'}&quot;
                </div>
              </div>

              {/* Alasan Ditolak (Jika Ada) */}
              {selectedDetailRequest.status === 'REJECTED' && selectedDetailRequest.rejectionReason && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1">
                    Alasan Penolakan dari Admin:
                  </label>
                  <div className="rounded-xl border border-rose-200 bg-rose-50/75 p-3.5 text-rose-800 leading-relaxed font-medium text-xs">
                    {selectedDetailRequest.rejectionReason}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedDetailRequest(null)}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer shadow-xs"
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
