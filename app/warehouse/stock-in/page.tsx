"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Product } from "@/types/product.types";
import { StockInItem } from "@/types/inventory.types";
import { productService } from "@/services/product.service";
import { inventoryService } from "@/services/inventory.service";
import {
  SearchableSelect,
  SearchableSelectOption,
} from "@/components/common/SearchableSelect";
import Pagination from "@/components/common/Pagination";

// ==========================================
// CONSTANTS & HELPERS
// ==========================================
const SUPPLIERS = [
  { id: "sup_indofood", name: "PT Indofood Sukses Makmur Tbk" },
  { id: "sup_unilever", name: "PT Unilever Indonesia Tbk" },
  { id: "sup_mayora", name: "PT Mayora Indah Tbk" },
  { id: "sup_wings", name: "PT Wings Food Indonesia" },
  { id: "sup_frisian", name: "PT Frisian Flag Indonesia" },
  { id: "sup_kalbe", name: "PT Kalbe Farma Tbk" },
  { id: "sup_lotte", name: "PT Lotte Indonesia" },
];

const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

export default function WarehouseStockInPage() {
  // Master Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);

  // Left Column Form State
  const [supplierId, setSupplierId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [receivedBy, setReceivedBy] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Right Column Selector State
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [inputQuantity, setInputQuantity] = useState<number>(0);
  const [inputPurchasePrice, setInputPurchasePrice] = useState<number>(0);

  // Temporary Queue Items
  const [queueItems, setQueueItems] = useState<
    (StockInItem & { currentStock: number; unit: string })[]
  >([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Options mapped for SearchableSelect
  const supplierOptions: SearchableSelectOption[] = useMemo(() => {
    return SUPPLIERS.map((sup) => ({
      value: sup.id,
      label: sup.name,
    }));
  }, []);

  const productOptions: SearchableSelectOption[] = useMemo(() => {
    return products.map((p) => ({
      value: p.id!,
      label: p.name,
      sublabel: `SKU: ${p.sku}`,
      badge: `Stok: ${p.stock} ${p.unit || "Pcs"}`,
    }));
  }, [products]);

  // Load products from master catalog
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const data = await productService.getProducts({ status: "active" });
      setProducts(data);
    } catch (err: any) {
      console.error("Gagal memuat produk master:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Update input purchase price when product selection changes
  const handleProductSelectChange = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setInputPurchasePrice(prod.purchasePrice || 0);
      if (inputQuantity <= 0) setInputQuantity(10);
    } else {
      setInputPurchasePrice(0);
      setInputQuantity(0);
    }
  };

  // Add Item to Temporary Queue
  const handleAddItemToQueue = () => {
    if (!selectedProductId) {
      toast.error("Pilih produk terlebih dahulu!");
      return;
    }

    const targetProduct = products.find((p) => p.id === selectedProductId);
    if (!targetProduct) return;

    if (inputQuantity <= 0) {
      toast.error("Kuantitas barang masuk harus lebih dari 0!");
      return;
    }

    if (inputPurchasePrice < 0) {
      toast.error("Harga beli tidak boleh negatif!");
      return;
    }

    // Check if item already exists in queue
    const existingIndex = queueItems.findIndex(
      (item) => item.productId === selectedProductId
    );

    if (existingIndex >= 0) {
      // Update quantity and price if item exists
      const updatedQueue = [...queueItems];
      updatedQueue[existingIndex] = {
        ...updatedQueue[existingIndex],
        quantity: updatedQueue[existingIndex].quantity + inputQuantity,
        purchasePrice: inputPurchasePrice,
      };
      setQueueItems(updatedQueue);
    } else {
      // Add new item
      setQueueItems((prev) => [
        ...prev,
        {
          productId: targetProduct.id!,
          productName: targetProduct.name,
          sku: targetProduct.sku,
          quantity: inputQuantity,
          purchasePrice: inputPurchasePrice,
          currentStock: targetProduct.stock,
          unit: targetProduct.unit || "Pcs",
        },
      ]);
    }

    toast.success(`Item "${targetProduct.name}" ditambahkan ke antrean penerimaan`);
    setStatusMessage(null);
  };

  // Remove Item from Queue
  const handleRemoveQueueItem = (productId: string) => {
    setQueueItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Update Item Quantity in Queue
  const handleUpdateQueueItemQty = (productId: string, newQty: number) => {
    if (newQty <= 0) return;
    setQueueItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  // Update Item Purchase Price in Queue
  const handleUpdateQueueItemPrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setQueueItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, purchasePrice: newPrice } : item
      )
    );
  };

  // Compute Totals
  const totalItemTypes = queueItems.length;
  const totalPhysicalQuantity = useMemo(() => {
    return queueItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [queueItems]);

  const totalEstimatedCost = useMemo(() => {
    return queueItems.reduce(
      (acc, item) => acc + item.quantity * item.purchasePrice,
      0
    );
  }, [queueItems]);

  // Handle Page bounds
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(queueItems.length / ITEMS_PER_PAGE));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [queueItems.length, currentPage]);

  // Paginated Queue Items
  const paginatedQueueItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return queueItems.slice(start, start + ITEMS_PER_PAGE);
  }, [queueItems, currentPage]);

  // Submit Stock-In Payload to Service Layer
  const handleSubmitStockIn = async () => {
    if (!supplierId || !supplierId.trim()) {
      toast.error("Pemasok / Supplier wajib dipilih!");
      return;
    }

    if (!receivedBy || !receivedBy.trim()) {
      toast.error("Petugas Penerima (Staf Gudang) wajib diisi!");
      return;
    }

    if (queueItems.length === 0) {
      toast.error("Antrean penerimaan barang masih kosong!");
      return;
    }

    const selectedSupplierObj = SUPPLIERS.find((s) => s.id === supplierId);
    const supplierName = selectedSupplierObj ? selectedSupplierObj.name : supplierId;

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      const result = await inventoryService.submitStockIn({
        supplierId,
        supplierName,
        invoiceNumber: invoiceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        receivedBy: receivedBy.trim() || "Staff Gudang",
        items: queueItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
        })),
      });

      toast.success("Stok masuk berhasil dicatat");
      setStatusMessage({
        type: "success",
        text: `Penerimaan barang (${result.invoiceNumber}) sebanyak ${result.totalQuantity} unit berhasil dicatat di sistem gudang!`,
      });

      // Reset Form Queue
      setQueueItems([]);
      setCurrentPage(1);
      setInvoiceNumber("");
      setNotes("");
      loadProducts();
    } catch (err: any) {
      console.error("Gagal submit restock:", err);
      toast.error(err.message || "Gagal mencatat penerimaan barang.");
      setStatusMessage({
        type: "error",
        text: err.message || "Gagal mencatat penerimaan barang.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER                                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col gap-1 mb-6">
          <h1 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Penerimaan Barang Masuk (Stock-In)
          </h1>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Formulir penerimaan stok dari distributor/supplier, pembaruan harga modal beli, dan pencatatan audit log mutasi gudang.
          </p>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] text-xs font-black flex items-center justify-between mb-6 ${
              statusMessage.type === "success"
                ? "bg-[#D1FAE5] dark:bg-emerald-950/60 text-[#065F46] dark:text-emerald-300"
                : "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300"
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-900 dark:border-slate-100 flex items-center justify-center text-xs font-black hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Split Layout Grid (Left: Document & Summary, Right: Selector & Queue Table) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* SISI KIRI (Dokumen & Ringkasan Restock - 5/12 Cols)                      */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 1: Dokumen Penerimaan Barang */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-colors">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b-2 border-slate-900/10 dark:border-slate-100/10 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-slate-900 dark:text-slate-100"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Dokumen Penerimaan Barang</span>
              </h3>

              {/* Input Supplier */}
              <div className="mb-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 block">
                  Pemasok / Supplier <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <SearchableSelect
                  options={supplierOptions}
                  value={supplierId}
                  onChange={(val) => setSupplierId(val)}
                  placeholder="Pilih Pemasok"
                  searchPlaceholder="Cari nama PT / distributor..."
                  emptyMessage="Supplier tidak ditemukan"
                />
              </div>

              {/* Input No Faktur / Surat Jalan */}
              <div className="mb-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 block">
                  No. Faktur / Surat Jalan (Opsional)
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Contoh: INV-2026/08/109"
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] w-full font-mono placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">
                  *Format otomatis: IN-YYYYMMDD-XXXX jika dikosongkan.
                </span>
              </div>

              {/* Input Petugas Gudang */}
              <div className="mb-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 block">
                  Petugas Penerima (Staf Gudang) <span className="text-rose-600 dark:text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  placeholder="Ketikkan Nama Lengkap"
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] w-full placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Input Catatan */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 block">
                  Catatan Penerimaan / Pengiriman
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Kemasan dus rapi, garansi retur 7 hari jika terdapat cacat."
                  className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] w-full placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Card 2: Ringkasan Nilai Restock & Submit Final */}
            <div className="bg-[#FEF3C7] dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-colors">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-amber-200 mb-3 pb-2 border-b-2 border-slate-900/20 dark:border-slate-100/20">
                Ringkasan Nilai Penerimaan
              </h3>

              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-800 dark:text-amber-100 flex justify-between py-1">
                  <span>Jumlah Varian Barang:</span>
                  <span className="font-black font-mono text-slate-950 dark:text-amber-300">
                    {totalItemTypes} jenis
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-amber-100 flex justify-between py-1">
                  <span>Total Kuantitas Fisik:</span>
                  <span className="font-black font-mono text-slate-950 dark:text-amber-300">
                    {totalPhysicalQuantity} unit
                  </span>
                </div>
              </div>

              <div className="text-xl font-black font-mono text-slate-950 dark:text-amber-100 flex justify-between items-center pt-2 border-t-2 border-slate-900/20 dark:border-slate-100/20 my-3">
                <span className="text-xs font-black text-slate-900 dark:text-amber-200 uppercase">
                  Total Nilai Pembelian (Modal):
                </span>
                <span className="text-xl font-black text-[#065F46] dark:text-emerald-400 font-mono">
                  {formatRupiah(totalEstimatedCost)}
                </span>
              </div>

              {/* Tombol Primary: Konfirmasi Penerimaan Barang */}
              <button
                type="button"
                disabled={isSubmitting || queueItems.length === 0}
                onClick={handleSubmitStockIn}
                className="bg-[#FFB800] hover:bg-[#FFA800] text-slate-950 font-black text-xs py-3.5 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all w-full uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Konfirmasi Penerimaan Barang</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SISI KANAN (Selector & Antrean Barang Masuk - 7/12 Cols)                  */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* Form Card 2: Pilih Barang Dari Katalog */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-colors">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b-2 border-slate-900/10 dark:border-slate-100/10 flex items-center justify-between">
                <span>Pilih Barang Dari Katalog</span>
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400">
                  {products.length} barang tersedia
                </span>
              </h3>

              {isLoadingProducts ? (
                <div className="p-4 text-center text-slate-500 dark:text-slate-400 font-bold">
                  Memuat katalog produk...
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Dropdown Produk */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 block">
                      Pilih Produk Ritel
                    </label>
                    <SearchableSelect
                      options={productOptions}
                      value={selectedProductId}
                      onChange={(val) => handleProductSelectChange(val)}
                      placeholder="Pilih Produk Ritel"
                      searchPlaceholder="Cari SKU atau Nama (contoh: Indomie, SNK-002, Bimoli)..."
                      emptyMessage="Produk tidak ditemukan"
                    />
                  </div>

                  {/* Input Kuantitas & Harga Beli Baru */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 block">
                        Jumlah Masuk (Qty)
                      </label>
                      <input
                        type="number"
                        min="1"
                        disabled={!selectedProductId}
                        value={inputQuantity}
                        onChange={(e) => setInputQuantity(Number(e.target.value))}
                        className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] w-full font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1 block">
                        Harga Beli / Modal Baru (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        disabled={!selectedProductId}
                        value={inputPurchasePrice}
                        onChange={(e) => setInputPurchasePrice(Number(e.target.value))}
                        className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] w-full font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Tombol "+ Tambah ke Antrean Restok" */}
                  <button
                    type="button"
                    onClick={handleAddItemToQueue}
                    className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs py-3 px-4 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all w-full mt-4 uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
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
                        strokeWidth="2.5"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span>+ Tambah ke Antrean Restok</span>
                  </button>
                </div>
              )}
            </div>

            {/* List / Table Antrean Penerimaan Barang */}
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-colors">
              <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-slate-900/10 dark:border-slate-100/10">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Daftar Antrean Penerimaan Barang ({queueItems.length})
                </h3>
                {queueItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQueueItems([]);
                      setCurrentPage(1);
                    }}
                    className="text-xs font-black text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 cursor-pointer"
                  >
                    Kosongkan Antrean
                  </button>
                )}
              </div>

              {queueItems.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-800/60 border-2 border-dashed border-slate-900 dark:border-slate-100 rounded-xl p-8 text-center transition-colors">
                  <p className="text-xs font-black text-slate-900 dark:text-slate-100 mb-1">
                    Antrean barang masuk masih kosong.
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Pilih produk dari dropdown di atas dan klik &quot;+ Tambah ke Antrean Restok&quot;.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Produk</th>
                          <th className="py-2.5 px-2 text-center">Stok Awal</th>
                          <th className="py-2.5 px-2 text-center">Qty Masuk</th>
                          <th className="py-2.5 px-3 text-right">Harga Beli Baru</th>
                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                          <th className="py-2.5 px-2 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs text-slate-900 dark:text-slate-100 font-bold">
                        {paginatedQueueItems.map((item) => {
                          const subtotal = item.quantity * item.purchasePrice;

                          return (
                            <tr
                              key={item.productId}
                              className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors"
                            >
                              {/* Produk Name & SKU */}
                              <td className="py-2.5 px-3">
                                <div className="font-black text-slate-900 dark:text-slate-100 max-w-xs truncate">
                                  {item.productName}
                                </div>
                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                  SKU: {item.sku}
                                </span>
                              </td>

                              {/* Stok Awal */}
                              <td className="py-2.5 px-2 text-center font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                {item.currentStock} {item.unit}
                              </td>

                              {/* Input Qty Masuk */}
                              <td className="py-2.5 px-2 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateQueueItemQty(
                                      item.productId,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-lg text-center font-mono text-xs font-black text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
                                />
                              </td>

                              {/* Input Harga Beli Baru */}
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.purchasePrice}
                                  onChange={(e) =>
                                    handleUpdateQueueItemPrice(
                                      item.productId,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-28 px-2 py-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-lg text-right font-mono text-xs font-black text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
                                />
                              </td>

                              {/* Subtotal */}
                              <td className="py-2.5 px-3 text-right font-mono font-black text-[#065F46] dark:text-emerald-400 whitespace-nowrap">
                                {formatRupiah(subtotal)}
                              </td>

                              {/* Hapus Button */}
                              <td className="py-2.5 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQueueItem(item.productId)}
                                  className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-black transition-colors cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center mx-auto"
                                  title="Hapus dari antrean"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalItems={queueItems.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
