"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Product } from "@/types/product.types";
import { productService } from "@/services/product.service";
import ConfirmModal from "@/components/admin/ConfirmModal";

// ==========================================
// CONSTANTS
// ==========================================
const CATEGORIES = [
  { id: "all", name: "Semua Kategori" },
  { id: "low_stock", name: "⚠️ Stok Menipis (Low Stock)" },
  { id: "cat_makanan", name: "Makanan" },
  { id: "cat_minuman", name: "Minuman" },
  { id: "cat_snack", name: "Snack & Biskuit" },
  { id: "cat_sembako", name: "Sembako" },
  { id: "cat_perawatan", name: "Perawatan Diri" },
  { id: "cat_kebersihan", name: "Kebersihan Rumah" },
  { id: "cat_obat", name: "Obat & P3K" },
];

const UNITS = [
  "Pcs",
  "Bungkus",
  "Botol",
  "Kaleng",
  "Kotak",
  "Sak",
  "Pouch",
  "Tube",
  "Kg",
  "Liter",
  "Strip",
];

const ITEMS_PER_PAGE = 10;

// Helper Format Currency Rupiah
const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

// Helper Format Margin %
const calculateMarginPercentage = (
  purchasePrice: number,
  sellingPrice: number
): number => {
  if (!sellingPrice || sellingPrice <= 0) return 0;
  const profit = sellingPrice - purchasePrice;
  return Math.round((profit / sellingPrice) * 1000) / 10; // 1 desimal
};

export default function AdminProductsPage() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all"); // 'all' | 'active' | 'inactive'

  // Pagination State (Revisi 2: 10 data per halaman)
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Custom Confirm Modal State for Product Status Toggle (Deactivate / Activate)
  const [productToToggle, setProductToToggle] = useState<Product | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState<boolean>(false);

  // Form Field States
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    barcode: "",
    categoryId: "cat_makanan",
    supplierId: "",
    purchasePrice: 0,
    sellingPrice: 0,
    stock: 0,
    minimumStock: 5,
    unit: "Pcs",
    status: "active" as "active" | "inactive",
  });

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedStatus]);

  // ==========================================
  // FETCH PRODUCTS VIA SERVICE LAYER
  // ==========================================
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await productService.getProducts({
        search: searchQuery,
        categoryId:
          selectedCategory !== "all" && selectedCategory !== "low_stock"
            ? selectedCategory
            : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
      });
      setProducts(data);
    } catch (err: any) {
      console.error("Gagal memuat daftar produk:", err);
      setFetchError(
        err.message || "Gagal terhubung ke database. Silakan muat ulang."
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedStatus]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // ==========================================
  // METRICS COMPUTATION (Revisi 1: Tambah Total Nonaktif)
  // ==========================================
  const totalActiveProducts = useMemo(() => {
    return products.filter((p) => p.status === "active").length;
  }, [products]);

  // Revisi 1: Total Produk Nonaktif
  const totalInactiveProducts = useMemo(() => {
    return products.filter((p) => p.status === "inactive").length;
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(
      (p) => p.status === "active" && p.stock <= p.minimumStock
    ).length;
  }, [products]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((acc, p) => acc + p.purchasePrice * p.stock, 0);
  }, [products]);

  // Filtered Products List (Revisi 3: Kategori Low Stock)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search filter
      const matchesSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter (Revisi 3: Low Stock Filter)
      const matchesCategory =
        selectedCategory === "all"
          ? true
          : selectedCategory === "low_stock"
          ? p.stock <= p.minimumStock
          : p.categoryId === selectedCategory;

      // Status filter
      const matchesStatus =
        selectedStatus === "all" || p.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus]);

  // Pagination Logic (Revisi 2: 10 items per page)
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // ==========================================
  // HANDLERS MODAL FORM
  // ==========================================
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: `DM-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      barcode: "",
      categoryId: "cat_makanan",
      supplierId: "sup_indofood",
      purchasePrice: 0,
      sellingPrice: 0,
      stock: 10,
      minimumStock: 5,
      unit: "Pcs",
      status: "active",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      barcode: product.barcode || "",
      categoryId: product.categoryId || "cat_makanan",
      supplierId: product.supplierId || "",
      purchasePrice: product.purchasePrice || 0,
      sellingPrice: product.sellingPrice || 0,
      stock: product.stock || 0,
      minimumStock: product.minimumStock || 5,
      unit: product.unit || "Pcs",
      status: product.status || "active",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormError(null);
  };

  // Real-time Margin Calculation
  const calculatedMargin = useMemo(() => {
    return calculateMarginPercentage(
      formData.purchasePrice,
      formData.sellingPrice
    );
  }, [formData.purchasePrice, formData.sellingPrice]);

  const calculatedProfit = useMemo(() => {
    return Math.max(0, formData.sellingPrice - formData.purchasePrice);
  }, [formData.purchasePrice, formData.sellingPrice]);

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.sku.trim()) {
      setFormError("SKU Produk wajib diisi!");
      return;
    }
    if (!formData.name.trim()) {
      setFormError("Nama Produk wajib diisi!");
      return;
    }
    if (formData.purchasePrice <= 0) {
      setFormError("Harga beli (modal) harus lebih dari Rp 0!");
      return;
    }
    if (formData.sellingPrice <= 0) {
      setFormError("Harga jual harus lebih dari Rp 0!");
      return;
    }
    if (formData.sellingPrice < formData.purchasePrice) {
      setFormError("Harga jual tidak boleh lebih rendah dari harga beli (modal)!");
      return;
    }

    setIsSubmitting(true);

    try {
      const categoryObj = CATEGORIES.find((c) => c.id === formData.categoryId);
      const categoryName = categoryObj ? categoryObj.name : "Umum";

      if (editingProduct && editingProduct.id) {
        await productService.updateProduct(editingProduct.id, {
          sku: formData.sku.trim(),
          name: formData.name.trim(),
          barcode: formData.barcode.trim() || undefined,
          categoryId: formData.categoryId,
          categoryName,
          supplierId: formData.supplierId.trim() || undefined,
          purchasePrice: Number(formData.purchasePrice),
          sellingPrice: Number(formData.sellingPrice),
          stock: Number(formData.stock),
          minimumStock: Number(formData.minimumStock),
          unit: formData.unit,
          status: formData.status,
        });
      } else {
        await productService.createProduct({
          sku: formData.sku.trim(),
          name: formData.name.trim(),
          barcode: formData.barcode.trim() || undefined,
          categoryId: formData.categoryId,
          categoryName,
          supplierId: formData.supplierId.trim() || undefined,
          purchasePrice: Number(formData.purchasePrice),
          sellingPrice: Number(formData.sellingPrice),
          stock: Number(formData.stock),
          minimumStock: Number(formData.minimumStock),
          unit: formData.unit,
          status: formData.status,
        });
      }

      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      console.error("Error submit product form:", err);
      setFormError(err.message || "Terjadi kesalahan saat menyimpan produk.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buka Modal Konfirmasi Status (Aktif / Nonaktif)
  const handleOpenToggleConfirm = (product: Product) => {
    setProductToToggle(product);
  };

  // Eksekusi Konfirmasi Toggle Status
  const handleConfirmToggleStatus = async () => {
    if (!productToToggle || !productToToggle.id) return;
    const newStatus = productToToggle.status === "active" ? "inactive" : "active";

    setIsTogglingStatus(true);
    try {
      await productService.toggleProductStatus(productToToggle.id, newStatus);
      setProductToToggle(null);
      loadProducts();
    } catch (err: any) {
      console.error("Gagal mengubah status produk:", err);
      alert(err.message || "Terjadi kesalahan saat mengubah status produk.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER & QUICK METRICS                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px] uppercase tracking-wider">
                Admin Panel
              </span>
              <span className="text-xs text-slate-400">• Master Data</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Manajemen Master Produk
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Kelola katalog produk minimarket, penentuan harga modal & jual, stok inventaris, serta margin keuntungan.
            </p>
          </div>

          {/* Tombol Utama: Tambah Produk Baru (Warm Amber Accent) */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer shrink-0"
          >
            <svg
              className="w-5 h-5"
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
            <span>+ Tambah Produk Baru</span>
          </button>
        </div>

        {/* Quick Stats Metric Cards (Revisi 1: 4 Metrik Kartu Termasuk Total Nonaktif) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Total Produk Aktif */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Produk Aktif
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">
                {totalActiveProducts}{" "}
                <span className="text-xs font-normal text-slate-400">item</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
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
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          </div>

          {/* Metric 2: Total Produk Nonaktif (Revisi 1) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Nonaktif
              </span>
              <span className="text-2xl font-black text-slate-700 mt-1 block font-mono">
                {totalInactiveProducts}{" "}
                <span className="text-xs font-normal text-slate-400">item</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
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
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
          </div>

          {/* Metric 3: Stok Menipis (Low Stock Alert - Deep Red Accent) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Stok Menipis (Low Stock)
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`text-2xl font-black font-mono ${
                    lowStockCount > 0 ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {lowStockCount}
                </span>
                {lowStockCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[10px] animate-pulse">
                    ⚠️ Perlu Restok
                  </span>
                )}
              </div>
            </div>
            <div
              className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                lowStockCount > 0
                  ? "bg-red-50 border-red-200 text-red-600"
                  : "bg-slate-100 border-slate-200 text-slate-700"
              }`}
            >
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Metric 4: Total Nilai Aset Inventaris */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Aset Modal
              </span>
              <span className="text-lg font-black text-slate-900 mt-1 block font-mono">
                {formatRupiah(totalInventoryValue)}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
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
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TOOLBAR FILTER & SEARCH                                                */}
        {/* ========================================================================= */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Bar Input */}
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
              placeholder="Cari berdasarkan SKU, Nama Produk, atau Barcode..."
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

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Kategori Dropdown (Revisi 3: Termasuk opsi Low Stock) */}
            <div className="flex items-center gap-1.5 min-w-[200px]">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Kategori:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none transition-all ${
                  selectedCategory === "low_stock"
                    ? "bg-red-50 border-red-300 text-red-800 font-bold"
                    : "bg-slate-50 border-slate-300 text-slate-800 focus:bg-white"
                }`}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status Dropdown */}
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                Status:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadProducts}
              className="p-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
              title="Refresh Data"
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
        {/* 3. DATA TABLE INVENTARIS PRODUK (Revisi 2: 10 Data per Halaman)            */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Memuat master produk...</p>
            </div>
          ) : fetchError ? (
            <div className="p-12 text-center text-red-600 space-y-3">
              <p className="text-sm font-bold">{fetchError}</p>
              <button
                type="button"
                onClick={loadProducts}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <p className="text-sm font-bold text-slate-800">
                Tidak ada produk yang ditemukan.
              </p>
              <p className="text-xs text-slate-400">
                Coba ubah kata kunci pencarian atau filter kategori & status.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">SKU / Barcode</th>
                      <th className="py-3.5 px-4">Nama Produk</th>
                      <th className="py-3.5 px-4">Kategori</th>
                      <th className="py-3.5 px-4 text-right">Modal (Beli)</th>
                      <th className="py-3.5 px-4 text-right">Harga Jual</th>
                      <th className="py-3.5 px-4 text-center">Est. Margin</th>
                      <th className="py-3.5 px-4 text-center">Stok / Min</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                    {paginatedProducts.map((prod) => {
                      const isLowStock =
                        prod.status === "active" && prod.stock <= prod.minimumStock;
                      const marginPct = calculateMarginPercentage(
                        prod.purchasePrice,
                        prod.sellingPrice
                      );

                      return (
                        <tr
                          key={prod.id || prod.sku}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            prod.status === "inactive"
                              ? "bg-slate-50/40 opacity-70"
                              : ""
                          }`}
                        >
                          {/* SKU / Barcode */}
                          <td className="py-3.5 px-4 font-mono">
                            <div className="font-bold text-slate-900">
                              {prod.sku}
                            </div>
                            {prod.barcode && (
                              <div className="text-[10px] text-slate-400">
                                {prod.barcode}
                              </div>
                            )}
                          </td>

                          {/* Nama Produk & Satuan */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 max-w-xs truncate">
                              {prod.name}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase">
                              Satuan: {prod.unit || "Pcs"}
                            </span>
                          </td>

                          {/* Kategori */}
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] whitespace-nowrap">
                              {prod.categoryName || prod.categoryId}
                            </span>
                          </td>

                          {/* Harga Beli */}
                          <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-600 whitespace-nowrap">
                            {formatRupiah(prod.purchasePrice)}
                          </td>

                          {/* Harga Jual */}
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatRupiah(prod.sellingPrice)}
                          </td>

                          {/* Estimasi Margin (%) */}
                          <td className="py-3.5 px-4 text-center font-mono whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                                marginPct >= 15
                                  ? "bg-emerald-50 text-emerald-700"
                                  : marginPct >= 5
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              +{marginPct}%
                            </span>
                          </td>

                          {/* Stok Aktual vs Min Stock */}
                          <td className="py-3.5 px-4 text-center font-mono whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-bold text-slate-900 text-sm">
                                {prod.stock}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                / min {prod.minimumStock}
                              </span>
                            </div>
                            {isLowStock && (
                              <span className="inline-block px-1.5 py-0.2 mt-0.5 rounded bg-red-600 text-white font-sans font-bold text-[9px] uppercase tracking-wider">
                                ⚠️ Low Stock
                              </span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {prod.status === "active" ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] uppercase tracking-wider">
                                Aktif
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-300 font-bold text-[10px] uppercase tracking-wider">
                                Nonaktif
                              </span>
                            )}
                          </td>

                          {/* Kolom Aksi (Edit & Toggle Status) */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(prod)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                                title="Edit Produk"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenToggleConfirm(prod)}
                                className={`px-2.5 py-1.5 rounded-lg border font-semibold text-xs transition-colors cursor-pointer ${
                                  prod.status === "active"
                                    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              >
                                {prod.status === "active"
                                  ? "Nonaktifkan"
                                  : "Aktifkan"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ========================================================================= */}
              {/* PAGINATION FOOTER (Revisi 2: 10 Data per Halaman)                         */}
              {/* ========================================================================= */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {/* Information Text */}
                <div className="text-slate-500 text-center sm:text-left">
                  Menampilkan{" "}
                  <span className="font-bold font-mono text-slate-800">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  </span>{" "}
                  -{" "}
                  <span className="font-bold font-mono text-slate-800">
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}
                  </span>{" "}
                  dari{" "}
                  <span className="font-bold font-mono text-slate-800">
                    {filteredProducts.length}
                  </span>{" "}
                  total produk
                </div>

                {/* Page Navigation Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    ← Prev
                  </button>

                  {/* Numbered Page Buttons */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`w-8 h-8 rounded-lg font-bold font-mono text-xs transition-colors cursor-pointer ${
                        currentPage === pg
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {pg}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL FORM (TAMBAH / EDIT PRODUK)                                      */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingProduct ? "Edit Master Produk" : "Tambah Produk Baru"}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingProduct
                    ? `Perbarui informasi untuk SKU: ${editingProduct.sku}`
                    : "Isi formulir lengkap untuk menambahkan barang ke katalog minimarket."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium text-xs">
                  ⚠️ {formError}
                </div>
              )}

              {/* Row 1: SKU & Barcode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    SKU Produk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    placeholder="Contoh: DM-MKN-001"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Barcode EAN/UPC (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    placeholder="Contoh: 8998866200112"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Row 2: Nama Produk */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Produk <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Contoh: Indomie Goreng Spesial 85g"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                />
              </div>

              {/* Row 3: Kategori & Satuan Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Barang <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    {CATEGORIES.filter(
                      (c) => c.id !== "all" && c.id !== "low_stock"
                    ).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Satuan Unit Kemasan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Harga Beli & Harga Jual */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Harga Beli / Modal (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.purchasePrice || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        purchasePrice: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Harga Jual Ritel (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.sellingPrice || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sellingPrice: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Real-time Profit Margin Calculation Display Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[11px]">
                    Estimasi Keuntungan Bersih:
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatRupiah(calculatedProfit)} / {formData.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[11px]">
                    Margin Persentase:
                  </span>
                  <span
                    className={`font-black text-sm ${
                      calculatedMargin >= 15
                        ? "text-emerald-600"
                        : calculatedMargin >= 5
                        ? "text-amber-600"
                        : "text-red-600"
                    }`}
                  >
                    {calculatedMargin}%
                  </span>
                </div>
              </div>

              {/* Row 5: Stok Awal & Stok Minimum */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Stok {editingProduct ? "Saat Ini" : "Awal"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Minimum Stok Warning <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.minimumStock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minimumStock: Number(e.target.value),
                      })
                    }
                    placeholder="5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Menyimpan..."
                    : editingProduct
                    ? "Simpan Perubahan"
                    : "+ Tambah Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CUSTOM CONFIRMATION MODAL (STATUS TOGGLE)                             */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={!!productToToggle}
        title={
          productToToggle?.status === "active"
            ? "Nonaktifkan Produk?"
            : "Aktifkan Kembali Produk?"
        }
        message={
          productToToggle?.status === "active"
            ? `Apakah Anda yakin ingin menonaktifkan produk "${productToToggle?.name}" (${productToToggle?.sku})? Produk yang dinonaktifkan tidak akan muncul di katalog kasir.`
            : `Apakah Anda yakin ingin mengaktifkan kembali produk "${productToToggle?.name}" (${productToToggle?.sku})?`
        }
        confirmLabel={
          productToToggle?.status === "active"
            ? "Ya, Nonaktifkan"
            : "Ya, Aktifkan"
        }
        cancelLabel="Batal"
        isDestructive={productToToggle?.status === "active"}
        isLoading={isTogglingStatus}
        onConfirm={handleConfirmToggleStatus}
        onClose={() => {
          if (!isTogglingStatus) setProductToToggle(null);
        }}
      />
    </div>
  );
}
