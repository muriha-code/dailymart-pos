"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Product } from "@/types/product.types";
import { productService } from "@/services/product.service";
import Cropper from "react-easy-crop";
import { getCroppedImg, Area } from "@/lib/cropImage";
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

const PURCHASE_UNITS = ["Karton", "Dus"];

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

  // Delete State (Single & Bulk Batch Delete)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState<boolean>(false);

  // Modal Tab State
  const [modalTab, setModalTab] = useState<"info" | "hpp" | "stock" | "purchases">("info");
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState<boolean>(false);

  // Form Field States (Including HPP Detail & Unit Conversion)
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    barcode: "",
    categoryId: "cat_makanan",
    supplierId: "",
    purchaseMode: "retail" as "retail" | "bulk", // 'retail' (satuan jual) | 'bulk' (satuan kemasan besar misal karton/dus)
    purchaseUnit: "", // Satuan pembelian (Karton, Dus, dll)
    conversionQty: 1, // Berapa satuan jual dalam 1 satuan pembelian (misal 24 botol / karton)
    purchaseUnitCost: 0, // Harga beli per satuan besar (misal Rp60.000 / karton)
    supplierPrice: 0, // Harga beli supplier dasar per unit (misal Rp21.500)
    purchaseDiscount: 0, // Diskon pembelian dari supplier per unit (misal Rp500)
    additionalCost: 0, // Biaya tambahan / ongkir per unit (misal Rp0)
    purchasePrice: 0, // Effective HPP modal per unit
    markupPercentage: 20, // Markup % (misal 20%)
    sellingPrice: 0, // Harga jual aktual (misal Rp24.900)
    stock: 0,
    minimumStock: 5,
    unit: "Pcs", // Satuan jual ritel
    status: "active" as "active" | "inactive",
    imageUrl: "",
  });

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Image Cropper State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState<boolean>(false);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setIsCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleApplyCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    setIsCropping(true);
    try {
      const result = await getCroppedImg(
        imageToCrop,
        croppedAreaPixels,
        rotation,
        500,
        500
      );
      if (result) {
        setSelectedImageFile(result.file);
        setImagePreviewUrl(result.url);
      }
      setIsCropModalOpen(false);
      setImageToCrop(null);
    } catch (err: any) {
      console.error("Gagal memotong gambar:", err);
      alert("Gagal memotong gambar. Silakan coba lagi.");
    } finally {
      setIsCropping(false);
    }
  };

  const handleCancelCrop = () => {
    setIsCropModalOpen(false);
    setImageToCrop(null);
  };

  const handleRemoveImage = () => {
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
  };

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

  // Batch Selection Helpers (Checkbox)
  const paginatedProductIds = useMemo(() => {
    return paginatedProducts.map((p) => p.id!).filter(Boolean);
  }, [paginatedProducts]);

  const isAllPaginatedSelected = useMemo(() => {
    if (paginatedProductIds.length === 0) return false;
    return paginatedProductIds.every((id) => selectedProductIds.includes(id));
  }, [paginatedProductIds, selectedProductIds]);

  const handleToggleSelectAll = () => {
    if (isAllPaginatedSelected) {
      setSelectedProductIds((prev) =>
        prev.filter((id) => !paginatedProductIds.includes(id))
      );
    } else {
      setSelectedProductIds((prev) =>
        Array.from(new Set([...prev, ...paginatedProductIds]))
      );
    }
  };

  const handleToggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Single Product Delete Confirmation Handler
  const handleConfirmSingleDelete = async () => {
    if (!productToDelete || !productToDelete.id) return;
    setIsDeletingProduct(true);
    try {
      await productService.deleteProduct(productToDelete.id, {
        sku: productToDelete.sku,
        imageUrl: productToDelete.imageUrl,
        categoryId: productToDelete.categoryId,
        categoryName: productToDelete.categoryName,
      });
      toast.success("Produk & foto berhasil dihapus permanen");
      setSelectedProductIds((prev) =>
        prev.filter((id) => id !== productToDelete.id)
      );
      setProductToDelete(null);
      loadProducts();
    } catch (err: any) {
      console.error("Gagal menghapus produk:", err);
      toast.error(err.message || "Gagal menghapus produk");
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Bulk / Batch Product Delete Confirmation Handler
  const handleConfirmBulkDelete = async () => {
    if (selectedProductIds.length === 0) return;
    setIsDeletingProduct(true);
    try {
      const items = selectedProductIds.map((id) => {
        const p = products.find((prod) => prod.id === id);
        return {
          productId: id,
          sku: p?.sku,
          imageUrl: p?.imageUrl,
          categoryId: p?.categoryId,
          categoryName: p?.categoryName,
        };
      });
      await productService.deleteProductsBulk(items);
      toast.success(`${selectedProductIds.length} produk & foto berhasil dihapus permanen`);
      setIsBulkDeleteModalOpen(false);
      setSelectedProductIds([]);
      loadProducts();
    } catch (err: any) {
      console.error("Gagal menghapus produk terpilih:", err);
      toast.error(err.message || "Gagal menghapus produk terpilih");
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // ==========================================
  // HANDLERS MODAL FORM & TABS
  // ==========================================
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setModalTab("info");
    setPurchaseHistory([]);
    setFormData({
      sku: `DM-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      barcode: "",
      categoryId: "cat_makanan",
      supplierId: "sup_indofood",
      purchaseMode: "retail",
      purchaseUnit: "",
      conversionQty: 1,
      purchaseUnitCost: 0,
      supplierPrice: 0,
      purchaseDiscount: 0,
      additionalCost: 0,
      purchasePrice: 0,
      markupPercentage: 20,
      sellingPrice: 0,
      stock: 10,
      minimumStock: 5,
      unit: "Pcs",
      status: "active",
      imageUrl: "",
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const loadProductPurchases = useCallback(async (productId: string) => {
    setIsLoadingPurchases(true);
    try {
      const data = await productService.getProductPurchases(productId);
      setPurchaseHistory(data);
    } catch (err) {
      console.warn("Gagal memuat riwayat pembelian produk:", err);
      setPurchaseHistory([]);
    } finally {
      setIsLoadingPurchases(false);
    }
  }, []);

  const handleOpenEditModal = (product: Product, defaultTab: "info" | "hpp" | "stock" | "purchases" = "info") => {
    setEditingProduct(product);
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setModalTab(defaultTab);

    const hasBulk = Boolean(
      product.purchaseUnitCost &&
      product.purchaseUnitCost > 0 &&
      product.purchaseUnit &&
      product.purchaseUnit !== product.unit
    );

    const initialSupplierPrice =
      product.supplierPrice !== undefined
        ? product.supplierPrice
        : product.purchasePrice || 0;

    const initialDiscount = product.purchaseDiscount || 0;
    const initialAdditional = product.additionalCost || 0;
    const initialCostPrice = product.costPrice ?? product.purchasePrice ?? 0;
    const initialSellingPrice = product.sellingPrice || 0;
    
    // Hitung estimasi markup jika belum tersimpan
    let initialMarkup = product.markupPercentage;
    if (initialMarkup === undefined || initialMarkup === null) {
      if (initialCostPrice > 0 && initialSellingPrice > initialCostPrice) {
        initialMarkup = Math.round(((initialSellingPrice - initialCostPrice) / initialCostPrice) * 100);
      } else {
        initialMarkup = 20;
      }
    }

    setFormData({
      sku: product.sku,
      name: product.name,
      barcode: product.barcode || "",
      categoryId: product.categoryId || "cat_makanan",
      supplierId: product.supplierId || "",
      purchaseMode: hasBulk ? "bulk" : "retail",
      purchaseUnit: product.purchaseUnit || "Karton",
      conversionQty: product.conversionQty && product.conversionQty > 0 ? product.conversionQty : 24,
      purchaseUnitCost: product.purchaseUnitCost || 0,
      supplierPrice: initialSupplierPrice,
      purchaseDiscount: initialDiscount,
      additionalCost: initialAdditional,
      purchasePrice: initialCostPrice,
      markupPercentage: initialMarkup,
      sellingPrice: initialSellingPrice,
      stock: product.stock || 0,
      minimumStock: product.minimumStock || 5,
      unit: product.unit || "Pcs",
      status: product.status || "active",
      imageUrl: product.imageUrl || "",
    });
    setFormError(null);
    setIsModalOpen(true);

    if (product.id) {
      loadProductPurchases(product.id);
    }
  };

  const handleCloseModal = () => {
    if (isSubmitting || isUploadingImage) return;
    setIsModalOpen(false);
    setEditingProduct(null);
    setSelectedImageFile(null);
    setImagePreviewUrl(null);
    setFormError(null);
    setPurchaseHistory([]);
  };

  // ==========================================
  // REAL-TIME HPP, MARKUP & MARGIN FORMULAS
  // ==========================================
  // 1. Base unit supplier price (Harga beli sebelum diskon & biaya tambahan)
  const baseUnitSupplierPrice = useMemo(() => {
    if (formData.purchaseMode === "bulk" && formData.conversionQty > 0) {
      return Math.round((Number(formData.purchaseUnitCost) || 0) / Number(formData.conversionQty));
    }
    return Number(formData.supplierPrice || 0);
  }, [formData.purchaseMode, formData.purchaseUnitCost, formData.conversionQty, formData.supplierPrice]);

  // 2. HPP per Unit = Harga Beli Supplier - Diskon Pembelian + Biaya Tambahan
  const calculatedHpp = useMemo(() => {
    const discount = Number(formData.purchaseDiscount || 0);
    const additional = Number(formData.additionalCost || 0);
    return Math.max(0, baseUnitSupplierPrice - discount + additional);
  }, [baseUnitSupplierPrice, formData.purchaseDiscount, formData.additionalCost]);

  // 3. Harga Jual Rekomendasi = HPP * (1 + Markup / 100)
  const calculatedRecommendedPrice = useMemo(() => {
    const markup = Number(formData.markupPercentage || 0);
    return Math.round(calculatedHpp * (1 + markup / 100));
  }, [calculatedHpp, formData.markupPercentage]);

  // 4. Laba per Unit = Harga Jual Aktual - HPP per Unit
  const calculatedProfit = useMemo(() => {
    return Math.max(0, (Number(formData.sellingPrice) || 0) - calculatedHpp);
  }, [formData.sellingPrice, calculatedHpp]);

  // 5. Margin Aktual (%) = (Laba per Unit / Harga Jual Aktual) * 100%
  const calculatedMargin = useMemo(() => {
    const sellPrice = Number(formData.sellingPrice) || 0;
    if (sellPrice <= 0) return 0;
    const profit = sellPrice - calculatedHpp;
    return Math.round((profit / sellPrice) * 1000) / 10;
  }, [formData.sellingPrice, calculatedHpp]);

  // Terapkan harga jual rekomendasi ke harga jual saat ini
  const handleApplyRecommendedPrice = () => {
    if (calculatedRecommendedPrice > 0) {
      setFormData((prev) => ({
        ...prev,
        sellingPrice: calculatedRecommendedPrice,
      }));
      toast.success(`Harga jual diatur ke rekomendasi: ${formatRupiah(calculatedRecommendedPrice)}`);
    }
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.sku.trim()) {
      setFormError("SKU Produk wajib diisi!");
      setModalTab("info");
      return;
    }
    if (!formData.name.trim()) {
      setFormError("Nama Produk wajib diisi!");
      setModalTab("info");
      return;
    }
    if (calculatedHpp <= 0 && formData.purchaseMode === "retail" && formData.supplierPrice <= 0) {
      setFormError("Harga beli / modal produk harus lebih dari Rp 0!");
      setModalTab("hpp");
      return;
    }
    if (formData.sellingPrice <= 0) {
      setFormError("Harga jual ritel harus lebih dari Rp 0!");
      setModalTab("hpp");
      return;
    }
    if (formData.sellingPrice < calculatedHpp) {
      setFormError("Harga jual tidak boleh lebih rendah dari HPP modal produk!");
      setModalTab("hpp");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.imageUrl;

      // Jika user memilih file gambar baru, upload ke /api/upload terlebih dahulu
      if (selectedImageFile) {
        setIsUploadingImage(true);
        const categoryObj = CATEGORIES.find((c) => c.id === formData.categoryId);
        const categoryVal = categoryObj ? categoryObj.name : formData.categoryId;

        const uploadData = new FormData();
        uploadData.append("file", selectedImageFile);
        uploadData.append("sku", formData.sku.trim());
        uploadData.append("category", categoryVal);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Gagal mengunggah foto ke Cloudinary");
        }
        finalImageUrl = json.imageUrl;
      }

      const categoryObj = CATEGORIES.find((c) => c.id === formData.categoryId);
      const categoryName = categoryObj ? categoryObj.name : "Umum";

      const productPayload = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        barcode: formData.barcode.trim() || undefined,
        categoryId: formData.categoryId,
        categoryName,
        supplierId: formData.supplierId.trim() || undefined,
        supplierPrice: baseUnitSupplierPrice,
        purchaseDiscount: Number(formData.purchaseDiscount || 0),
        additionalCost: Number(formData.additionalCost || 0),
        purchaseUnit: formData.purchaseMode === "bulk" ? formData.purchaseUnit : formData.unit,
        conversionQty: formData.purchaseMode === "bulk" ? Number(formData.conversionQty) : 1,
        purchaseUnitCost: formData.purchaseMode === "bulk" ? Number(formData.purchaseUnitCost) : undefined,
        costPrice: calculatedHpp,
        purchasePrice: calculatedHpp, // Synced as standard purchase price for backward-compatibility
        markupPercentage: Number(formData.markupPercentage || 0),
        recommendedPrice: calculatedRecommendedPrice,
        sellingPrice: Number(formData.sellingPrice),
        stock: Number(formData.stock),
        minimumStock: Number(formData.minimumStock),
        unit: formData.unit,
        status: formData.status,
        imageUrl: finalImageUrl.trim() || undefined,
      };

      if (editingProduct && editingProduct.id) {
        await productService.updateProduct(editingProduct.id, productPayload);
        toast.success("Data produk & HPP berhasil diperbarui");
      } else {
        await productService.createProduct(productPayload);
        toast.success("Produk baru berhasil ditambahkan ke katalog");
      }

      setIsModalOpen(false);
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
      loadProducts();
    } catch (err: any) {
      console.error("Error submit product form:", err);
      setFormError(err.message || "Terjadi kesalahan saat menyimpan produk.");
      toast.error(err.message || "Terjadi kesalahan saat menyimpan produk.");
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
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
      toast.success(
        `Status produk "${productToToggle.name}" diubah menjadi ${
          newStatus === "active" ? "Aktif" : "Nonaktif"
        }`
      );
      setProductToToggle(null);
      loadProducts();
    } catch (err: any) {
      console.error("Gagal mengubah status produk:", err);
      toast.error(err.message || "Terjadi kesalahan saat mengubah status produk.");
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#0F172A] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER & QUICK METRICS                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Manajemen Master Produk
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
              Kelola katalog produk minimarket, penentuan harga modal & jual, stok inventaris, serta margin keuntungan.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {selectedProductIds.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] active:bg-[#9F1239] text-white font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Hapus ({selectedProductIds.length}) Terpilih</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#4338CA] text-white font-black text-xs sm:text-sm border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
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
        </div>

        {/* Quick Stats Metric Cards (4 Grid Metrics Neo-Brutalist) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Metric 1: Total Produk Aktif */}
          <div className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
            <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider block">
              Total Produk Aktif
            </span>
            <span className="text-xl font-black font-mono text-slate-900 mt-2 block">
              {totalActiveProducts}{" "}
              <span className="text-xs font-bold text-slate-500 font-sans">item</span>
            </span>
          </div>

          {/* Metric 2: Total Produk Nonaktif */}
          <div className="bg-[#F1F5F9] border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
            <span className="text-slate-500 font-black text-[10px] uppercase tracking-wider block">
              Total Nonaktif
            </span>
            <span className="text-xl font-black font-mono text-slate-700 mt-2 block">
              {totalInactiveProducts}{" "}
              <span className="text-xs font-bold text-slate-500 font-sans">item</span>
            </span>
          </div>

          {/* Metric 3: Stok Menipis */}
          <div className="bg-[#FFE4E6] border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
            <span className="text-slate-600 font-black text-[10px] uppercase tracking-wider block">
              Stok Menipis
            </span>
            <span className="text-xl font-black font-mono text-[#E11D48] mt-2 block">
              {lowStockCount}{" "}
              <span className="text-xs font-bold text-rose-800 font-sans">item</span>
            </span>
          </div>

          {/* Metric 4: Total Nilai Aset Inventaris (Warm Amber Tint) */}
          <div className="bg-[#FEF3C7] border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
            <span className="text-slate-700 font-black text-[10px] uppercase tracking-wider block">
              Total Aset Modal
            </span>
            <span className="text-xl font-black font-mono text-[#B45309] mt-2 block">
              {formatRupiah(totalInventoryValue)}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TOOLBAR FILTER & SEARCH                                                */}
        {/* ========================================================================= */}
        <div className="bg-white border-2 border-slate-900 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6">
          {/* Search Bar Input */}
          <div className="relative flex-1">
            <svg
              className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
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
              placeholder="Cari berdasarkan SKU, Nama Produk, atau Barcode..."
              className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border-2 border-slate-900 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Kategori Dropdown */}
            <div className="flex items-center gap-1.5 min-w-[200px]">
              <label className="text-xs font-black text-slate-700 uppercase whitespace-nowrap">
                Kategori:
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full px-3 py-1.5 border-2 border-slate-900 rounded-lg text-xs font-bold focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer ${
                  selectedCategory === "low_stock"
                    ? "bg-[#FFE4E6] text-[#E11D48]"
                    : "bg-white text-slate-900"
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
              <label className="text-xs font-black text-slate-700 uppercase whitespace-nowrap">
                Status:
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border-2 border-slate-900 rounded-lg text-xs font-bold text-slate-900 focus:outline-none shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
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
              className="bg-white hover:bg-slate-100 border-2 border-slate-900 p-2 rounded-lg shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] text-slate-900 hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
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
                  strokeWidth="2.5"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. DATA TABLE INVENTARIS PRODUK                                           */}
        {/* ========================================================================= */}
        <div className="bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-black uppercase text-slate-700">Memuat master produk...</p>
            </div>
          ) : fetchError ? (
            <div className="p-12 text-center text-rose-600 space-y-3">
              <p className="text-sm font-bold">{fetchError}</p>
              <button
                type="button"
                onClick={loadProducts}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-black border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <p className="text-sm font-black text-slate-900">
                Tidak ada produk yang ditemukan.
              </p>
              <p className="text-xs text-slate-500 font-medium">
                Coba ubah kata kunci pencarian atau filter kategori & status.
              </p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-hidden">
                <table className="w-full table-fixed text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-900 text-slate-900 font-black text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-2 text-center w-[4%]">
                        <input
                          type="checkbox"
                          checked={isAllPaginatedSelected}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded border-2 border-slate-900 accent-[#6366F1] cursor-pointer"
                          title="Pilih Semua di Halaman Ini"
                        />
                      </th>
                      <th className="py-3 px-2 w-[14%]">SKU / Barcode</th>
                      <th className="py-3 px-2 w-[24%]">Nama Produk</th>
                      <th className="py-3 px-2 w-[12%] text-center">Kategori</th>
                      <th className="py-3 px-2 text-right w-[10%]">Modal (Beli)</th>
                      <th className="py-3 px-2 text-right w-[10%]">Harga Jual</th>
                      <th className="py-3 px-1.5 text-center w-[8%]">Margin (%)</th>
                      <th className="py-3 px-1.5 text-center w-[8%]">Stok</th>
                      <th className="py-3 px-1.5 text-center w-[10%]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-900">
                    {paginatedProducts.map((prod) => {
                      const isLowStock =
                        prod.status === "active" && prod.stock <= prod.minimumStock;
                      const marginPct = calculateMarginPercentage(
                        prod.purchasePrice,
                        prod.sellingPrice
                      );
                      const isSelected = selectedProductIds.includes(prod.id!);

                      return (
                        <tr
                          key={prod.id || prod.sku}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected
                              ? "bg-amber-50/70"
                              : prod.status === "inactive"
                              ? "bg-slate-50/40 opacity-70"
                              : ""
                          }`}
                        >
                          {/* Checkbox Batch Selection (4%) */}
                          <td className="py-2.5 px-2 text-center w-[4%]">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectProduct(prod.id!)}
                              className="w-4 h-4 rounded border-2 border-slate-900 accent-[#6366F1] cursor-pointer"
                            />
                          </td>

                          {/* SKU / Barcode (14%) */}
                          <td className="py-2.5 px-2 font-mono w-[14%] truncate">
                            <span className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-900 inline-block truncate" title={prod.sku}>
                              {prod.sku}
                            </span>
                            {prod.barcode && (
                              <div className="text-[10px] text-slate-500 font-bold truncate mt-0.5" title={prod.barcode}>
                                ║▌ {prod.barcode}
                              </div>
                            )}
                          </td>

                          {/* Nama Produk & Satuan (24%) */}
                          <td className="py-2.5 px-2 w-[24%]">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg border-2 border-slate-900 overflow-hidden bg-white shrink-0 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] flex items-center justify-center">
                                {prod.imageUrl ? (
                                  <img
                                    src={prod.imageUrl}
                                    alt={prod.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="font-black text-slate-500 text-[10px] uppercase font-mono">
                                    {prod.name.substring(0, 2)}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div
                                  className="font-black text-slate-900 truncate text-xs"
                                  title={prod.name}
                                >
                                  {prod.name}
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                                  {prod.unit || "Pcs"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Kategori (12%) */}
                          <td className="py-2.5 px-2 text-center w-[12%]">
                            <span
                              className="bg-[#EEF2FF] text-[#4338CA] border-1.5 border-slate-900 font-bold text-[10px] px-2 py-0.5 rounded-md block truncate"
                              title={prod.categoryName || prod.categoryId}
                            >
                              {prod.categoryName || prod.categoryId}
                            </span>
                          </td>

                          {/* Harga Beli (10%) */}
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-slate-600 w-[10%] truncate">
                            {formatRupiah(prod.purchasePrice)}
                          </td>

                          {/* Harga Jual (10%) */}
                          <td className="py-2.5 px-2 text-right font-mono font-black text-slate-900 w-[10%] truncate">
                            {formatRupiah(prod.sellingPrice)}
                          </td>

                          {/* Estimasi Margin (%) (8%) */}
                          <td className="py-2.5 px-1.5 text-center font-mono w-[8%]">
                            <span className="bg-[#D1FAE5] text-[#065F46] font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border border-slate-900 inline-block">
                              +{marginPct}%
                            </span>
                          </td>

                          {/* Stok & Status (8%) */}
                          <td className="py-2.5 px-1.5 text-center font-mono w-[8%]">
                            <div className="font-black text-slate-900 text-xs">
                              {prod.stock}{" "}
                              <span className="text-[9px] text-slate-400 font-normal">
                                /{prod.minimumStock}
                              </span>
                            </div>
                            <div className="mt-0.5">
                              {prod.status === "active" ? (
                                isLowStock ? (
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-[#E11D48] text-white border border-slate-900 font-mono font-black text-[8px] uppercase shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                                    ⚠️ Low
                                  </span>
                                ) : (
                                  <span className="inline-block px-1.5 py-0.2 rounded bg-[#10B981] text-white border border-slate-900 font-mono font-black text-[8px] uppercase shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                                    Aktif
                                  </span>
                                )
                              ) : (
                                <span className="inline-block px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 border border-slate-900 font-mono font-black text-[8px] uppercase">
                                  Off
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Kolom Aksi (10%) */}
                          <td className="py-2.5 px-1.5 text-center w-[10%]">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(prod)}
                                className="bg-white border-1.5 border-slate-900 p-1.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100 hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer text-slate-900"
                                title="Edit Produk"
                              >
                                ✏️
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenToggleConfirm(prod)}
                                className="bg-white border-1.5 border-slate-900 p-1.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] hover:bg-slate-100 hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer text-slate-900"
                                title={prod.status === "active" ? "Nonaktifkan Produk" : "Aktifkan Produk"}
                              >
                                🚫
                              </button>

                              <button
                                type="button"
                                onClick={() => setProductToDelete(prod)}
                                className="bg-white border-1.5 border-slate-900 p-1.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] hover:bg-rose-50 hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer text-rose-600"
                                title="Hapus Produk Permanen"
                              >
                                🗑️
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
              <div className="px-5 py-3.5 bg-slate-100 border-t-2 border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                {/* Information Text */}
                <div className="text-slate-600 font-bold text-center sm:text-left">
                  Menampilkan{" "}
                  <span className="font-black font-mono text-slate-900">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                  </span>{" "}
                  -{" "}
                  <span className="font-black font-mono text-slate-900">
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)}
                  </span>{" "}
                  dari{" "}
                  <span className="font-black font-mono text-slate-900">
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
                    className="px-3 py-1.5 rounded-lg border-2 border-slate-900 bg-white hover:bg-slate-50 text-slate-900 font-black text-xs shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    ← Prev
                  </button>

                  {/* Numbered Page Buttons */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      onClick={() => setCurrentPage(pg)}
                      className={`w-8 h-8 rounded-lg font-black font-mono text-xs border-2 border-slate-900 transition-all cursor-pointer ${
                        currentPage === pg
                          ? "bg-[#6366F1] text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                          : "bg-white text-slate-900 hover:bg-slate-50 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
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
                    className="px-3 py-1.5 rounded-lg border-2 border-slate-900 bg-white hover:bg-slate-50 text-slate-900 font-black text-xs shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
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
      {/* 4. MODAL FORM (TAMBAH / EDIT PRODUK DENGAN DETAIL HPP & RIWAYAT)          */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-100 border-b-2 border-slate-900 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>{editingProduct ? "Edit Master Produk & HPP" : "Tambah Produk Baru"}</span>
                  {editingProduct && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#6366F1] text-white border border-slate-900">
                      {editingProduct.sku}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-600 font-medium">
                  {editingProduct
                    ? "Kelola spesifikasi produk, kalkulasi HPP retail, markup harga, stok, dan riwayat pembelian."
                    : "Lengkapi data spesifikasi produk, perhitungan HPP retail, dan harga jual."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-900 hover:text-rose-600 text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="px-5 bg-white border-b-2 border-slate-900 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setModalTab("info")}
                className={`py-2.5 px-3 border-b-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalTab === "info"
                    ? "border-[#6366F1] text-[#6366F1]"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <span>📦</span> Informasi Produk
              </button>

              <button
                type="button"
                onClick={() => setModalTab("hpp")}
                className={`py-2.5 px-3 border-b-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalTab === "hpp"
                    ? "border-[#6366F1] text-[#6366F1]"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <span>🏷️</span> HPP & Harga
                {calculatedHpp > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-100 border border-slate-900 text-[10px] font-mono text-slate-900">
                    {formatRupiah(calculatedHpp)}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalTab("stock")}
                className={`py-2.5 px-3 border-b-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  modalTab === "stock"
                    ? "border-[#6366F1] text-[#6366F1]"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                }`}
              >
                <span>📊</span> Stok & Inventaris
              </button>

              {editingProduct && (
                <button
                  type="button"
                  onClick={() => setModalTab("purchases")}
                  className={`py-2.5 px-3 border-b-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    modalTab === "purchases"
                      ? "border-[#6366F1] text-[#6366F1]"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>📜</span> Riwayat Pembelian
                  {purchaseHistory.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#EEF2FF] border border-slate-900 text-[10px] font-mono text-[#4338CA] font-bold">
                      {purchaseHistory.length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="p-4 sm:p-5 text-xs overflow-y-auto flex-1 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium text-xs flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{formError}</span>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 1: INFORMASI PRODUK                                   */}
                {/* ========================================================= */}
                {modalTab === "info" && (
                  <div className="space-y-3.5">
                    {/* Row 1: SKU & Barcode */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        placeholder="Contoh: Indomie Goreng Spesial 85g atau Rinso Anti Noda 770g"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    {/* Row 3: Upload Foto Produk (Cloudinary) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Foto Produk (Cloudinary Upload)
                      </label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="w-14 h-14 rounded-xl border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 relative shadow-xs">
                          {imagePreviewUrl || formData.imageUrl ? (
                            <img
                              src={imagePreviewUrl || formData.imageUrl}
                              alt="Preview Foto"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>

                        <div className="flex-1 space-y-1">
                          <input
                            type="file"
                            accept="image/*"
                            id="product-photo-file-input"
                            onChange={handleImageFileChange}
                            className="hidden"
                          />
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor="product-photo-file-input"
                              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                            >
                              {isUploadingImage ? (
                                <>
                                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  <span>Mengunggah...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                  <span>{selectedImageFile ? "Ganti File" : "Pilih / Upload Foto"}</span>
                                </>
                              )}
                            </label>
                            {(imagePreviewUrl || formData.imageUrl) && (
                              <button
                                type="button"
                                onClick={handleRemoveImage}
                                className="px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer"
                              >
                                Hapus Foto
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {selectedImageFile
                              ? `File: ${selectedImageFile.name}`
                              : "Format JPG/PNG. Foto akan otomatis disimpan ke Cloudinary."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Row 4: Kategori & Satuan Jual */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          Satuan Penjualan Ritel <span className="text-red-500">*</span>
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

                    {/* Quick navigation hint */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setModalTab("hpp")}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                      >
                        Lanjut ke HPP & Harga →
                      </button>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 2: HPP & HARGA                                        */}
                {/* ========================================================= */}
                {modalTab === "hpp" && (
                  <div className="space-y-4">
                    {/* Mode Satuan Pembelian: Eceran vs Kemasan Grosir/Konversi */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <label className="block text-xs font-bold text-slate-800">
                        Skema Pembelian dari Supplier:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label
                          className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                            formData.purchaseMode === "retail"
                              ? "bg-amber-50/70 border-amber-400 text-amber-900 font-bold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="radio"
                            name="purchaseMode"
                            value="retail"
                            checked={formData.purchaseMode === "retail"}
                            onChange={() => setFormData({ ...formData, purchaseMode: "retail" })}
                            className="accent-amber-500 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs">Satuan Eceran</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Dibeli per {formData.unit || "Pcs"}
                            </div>
                          </div>
                        </label>

                        <label
                          className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                            formData.purchaseMode === "bulk"
                              ? "bg-amber-50/70 border-amber-400 text-amber-900 font-bold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="radio"
                            name="purchaseMode"
                            value="bulk"
                            checked={formData.purchaseMode === "bulk"}
                            onChange={() => setFormData({ ...formData, purchaseMode: "bulk" })}
                            className="accent-amber-500 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs">Satuan Besar / Karton</div>
                            <div className="text-[10px] text-slate-500 font-normal">
                              Konversi Dus / Karton → Unit
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Jika Mode Satuan Besar (Konversi Dus / Karton) */}
                    {formData.purchaseMode === "bulk" && (
                      <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 space-y-3">
                        <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                          <span>📦</span> Konversi Satuan Kemasan Besar (Grosir)
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Satuan Pembelian
                            </label>
                            <select
                              value={formData.purchaseUnit}
                              onChange={(e) => setFormData({ ...formData, purchaseUnit: e.target.value })}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                            >
                              <option value="" disabled>
                                Pilih Satuan
                              </option>
                              {PURCHASE_UNITS.map((pu) => (
                                <option key={pu} value={pu}>
                                  {pu}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Harga Beli per {formData.purchaseUnit || "Karton"}
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.purchaseUnitCost || ""}
                              onChange={(e) => setFormData({ ...formData, purchaseUnitCost: Number(e.target.value) })}
                              placeholder="60000"
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Isi per {formData.purchaseUnit || "Karton"} ({formData.unit})
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={formData.conversionQty || ""}
                              onChange={(e) => setFormData({ ...formData, conversionQty: Math.max(1, Number(e.target.value)) })}
                              placeholder="24"
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs font-bold text-slate-900"
                            />
                          </div>
                        </div>

                        <div className="p-2 bg-blue-100/50 rounded-lg text-[11px] text-blue-900 flex items-center justify-between font-mono">
                          <span>Kalkulasi Harga Beli Dasar per {formData.unit}:</span>
                          <strong className="text-xs">{formatRupiah(baseUnitSupplierPrice)} / {formData.unit}</strong>
                        </div>
                      </div>
                    )}

                    {/* Input Biaya Dasar HPP Retail */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {formData.purchaseMode === "retail" && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Harga Beli Supplier <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData.supplierPrice || ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                supplierPrice: Number(e.target.value),
                              })
                            }
                            placeholder="Contoh: 21500"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                          />
                        </div>
                      )}

                      <div className={formData.purchaseMode === "bulk" ? "sm:col-span-1" : ""}>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Diskon Pembelian / Unit
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.purchaseDiscount || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              purchaseDiscount: Number(e.target.value),
                            })
                          }
                          placeholder="0 (Contoh: 500)"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div className={formData.purchaseMode === "bulk" ? "sm:col-span-2" : ""}>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Biaya Tambahan / Unit (Ongkir/Handling)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.additionalCost || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              additionalCost: Number(e.target.value),
                            })
                          }
                          placeholder="0"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* ========================================================= */}
                    {/* BREAKDOWN HPP BOX                                         */}
                    {/* ========================================================= */}
                    <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-sm space-y-2.5 font-mono">
                      <div className="flex items-center justify-between text-xs font-sans text-slate-400 font-bold border-b border-slate-800 pb-2">
                        <span>BREAKDOWN HPP RETAIL</span>
                        <span className="text-[10px] text-amber-400 font-normal">Per {formData.unit}</span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Harga Beli Supplier {formData.purchaseMode === "bulk" ? `(1/${formData.conversionQty} ${formData.purchaseUnit})` : ""}:</span>
                          <span>{formatRupiah(baseUnitSupplierPrice)}</span>
                        </div>
                        <div className="flex justify-between text-amber-300">
                          <span>Diskon Pembelian:</span>
                          <span>-{formatRupiah(formData.purchaseDiscount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Biaya Tambahan:</span>
                          <span>+{formatRupiah(formData.additionalCost || 0)}</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-700 pt-2 flex items-center justify-between">
                        <span className="text-xs font-bold text-white font-sans uppercase tracking-wider">
                          TOTAL HPP PER UNIT:
                        </span>
                        <span className="text-base font-extrabold text-amber-400">
                          {formatRupiah(calculatedHpp)}
                        </span>
                      </div>
                    </div>

                    {/* ========================================================= */}
                    {/* PENENTUAN HARGA JUAL & REKOMENDASI MARKUP                 */}
                    {/* ========================================================= */}
                    <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                      <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                        <span>PENENTUAN HARGA & MARKUP</span>
                        <span className="text-[10px] text-slate-500 font-normal">Formula: HPP × (1 + Markup/100)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Input Target Markup (%)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={formData.markupPercentage || ""}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  markupPercentage: Number(e.target.value),
                                })
                              }
                              placeholder="20"
                              className="w-full px-3 py-2 pr-8 bg-white border border-amber-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Harga Jual Rekomendasi
                          </label>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-extrabold text-emerald-700">
                              {formatRupiah(calculatedRecommendedPrice)}
                            </div>
                            <button
                              type="button"
                              onClick={handleApplyRecommendedPrice}
                              title="Terapkan ke Harga Jual Saat Ini"
                              className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer shadow-xs"
                            >
                              Terapkan
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Harga Jual Aktual & Estimasi Margin Aktual */}
                      <div className="pt-2 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 mb-1">
                            Harga Jual Saat Ini / Aktual (Rp) <span className="text-red-500">*</span>
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
                            placeholder="0 (Contoh: 24900)"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs font-extrabold text-slate-900 focus:outline-none focus:border-slate-900"
                          />
                        </div>

                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between font-mono">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 text-[10px]">Laba per Unit:</span>
                            <strong className="text-emerald-700 font-bold text-xs">{formatRupiah(calculatedProfit)}</strong>
                          </div>
                          <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-slate-500 text-[10px]">Margin Aktual:</span>
                            <span
                              className={`px-1.5 py-0.5 rounded font-black text-[11px] ${
                                calculatedMargin >= 15
                                  ? "bg-emerald-50 text-emerald-700"
                                  : calculatedMargin >= 5
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {calculatedMargin}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 3: STOK & INVENTARIS                                  */}
                {/* ========================================================= */}
                {modalTab === "stock" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Dihitung dalam satuan: <strong className="text-slate-700">{formData.unit}</strong>
                        </p>
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
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs font-bold text-slate-900 focus:bg-white focus:outline-none"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                          Sistem akan memicu peringatan jika stok ≤ batas ini.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>ℹ️</span> Catatan Mutasi Stok:
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Setiap perubahan kuantitas melalui penerimaan barang (restock) atau transaksi penjualan kasir akan otomatis tercatat pada log mutasi inventaris dan tidak mengubah riwayat transaksi lampau.
                      </p>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* TAB 4: RIWAYAT PEMBELIAN (PURCHASE HISTORY)               */}
                {/* ========================================================= */}
                {modalTab === "purchases" && editingProduct && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800">
                        Riwayat Restock & Perubahan Harga Beli Supplier
                      </div>
                      <button
                        type="button"
                        onClick={() => editingProduct.id && loadProductPurchases(editingProduct.id)}
                        disabled={isLoadingPurchases}
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                      >
                        {isLoadingPurchases ? "Memuat..." : "Refresh"}
                      </button>
                    </div>

                    {isLoadingPurchases ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        <div className="animate-spin w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-2" />
                        Memuat riwayat pembelian...
                      </div>
                    ) : purchaseHistory.length === 0 ? (
                      <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500 space-y-1 text-xs">
                        <p className="font-bold text-slate-700">Belum ada catatan pembelian masuk.</p>
                        <p className="text-[10px] text-slate-400">
                          Riwayat akan otomatis terisi saat staf gudang mencatat penerimaan barang masuk (Restock).
                        </p>
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <th className="py-2 px-2.5">Tanggal</th>
                              <th className="py-2 px-2.5">Supplier / Invoice</th>
                              <th className="py-2 px-2.5 text-right">Harga Beli</th>
                              <th className="py-2 px-2.5 text-center">Qty</th>
                              <th className="py-2 px-2.5 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                            {purchaseHistory.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-slate-50">
                                <td className="py-2 px-2.5 font-mono text-[11px]">
                                  {new Date(item.date).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </td>
                                <td className="py-2 px-2.5">
                                  <div className="font-bold text-slate-900 truncate max-w-[150px]">
                                    {item.supplierName}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400">
                                    {item.invoiceNumber}
                                  </div>
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-700">
                                  {formatRupiah(item.purchasePrice)}
                                </td>
                                <td className="py-2 px-2.5 text-center font-mono font-bold">
                                  +{item.quantity}
                                </td>
                                <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                                  {formatRupiah(item.subtotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Actions (Sticky Footer) */}
              <div className="px-5 py-3 bg-slate-100 border-t-2 border-slate-900 flex items-center justify-between shrink-0">
                <div className="text-[11px] text-slate-600 font-mono font-bold">
                  HPP: <strong className="text-slate-900">{formatRupiah(calculatedHpp)}</strong> | Jual: <strong className="text-slate-900">{formatRupiah(formData.sellingPrice || 0)}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-xl border-2 border-slate-900 text-slate-900 font-bold text-xs hover:bg-slate-200 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || isUploadingImage}
                    className="px-5 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] active:bg-[#4338CA] text-white font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting || isUploadingImage
                      ? "Menyimpan..."
                      : editingProduct
                      ? "Simpan Perubahan"
                      : "+ Tambah Produk"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4.5 MODAL IMAGE EDITOR / CROPPER (REACT-EASY-CROP)                       */}
      {/* ========================================================================= */}
      {isCropModalOpen && imageToCrop && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span>✂️ Edit & Potong Foto Produk</span>
                </h3>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Atur letak, zoom, dan rotasi agar foto pas dalam rasio 1:1 (Persegi POS)
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelCrop}
                className="text-slate-400 hover:text-white text-base font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Cropper Canvas Container */}
            <div className="relative w-full h-72 sm:h-80 bg-slate-950 overflow-hidden">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={handleCropComplete}
              />
            </div>

            {/* Controls Bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
              {/* Zoom Control Slider (1x - 3x) & Rotation Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                {/* Zoom Slider */}
                <div className="flex-1 flex items-center gap-2">
                  <span className="font-semibold text-slate-600 text-[11px] whitespace-nowrap">
                    🔍 Zoom: <strong className="font-mono text-slate-900">{zoom.toFixed(1)}x</strong>
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Rotation 90° Button */}
                <button
                  type="button"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-[11px] inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Putar 90° ({rotation}°)</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleApplyCrop}
                  disabled={isCropping}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isCropping ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>✓ Terapkan & Simpan Foto</span>
                  )}
                </button>
              </div>
            </div>
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

      {/* ========================================================================= */}
      {/* 6. MODAL KONFIRMASI DESTRUKTIF: HAPUS PRODUK TUNGGAL                     */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={!!productToDelete}
        title="Hapus Produk Permanen?"
        message={`Produk "${productToDelete?.name}" (SKU: ${productToDelete?.sku}) beserta file foto di server Cloudinary akan dihapus selamanya. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Permanen"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={isDeletingProduct}
        onConfirm={handleConfirmSingleDelete}
        onClose={() => {
          if (!isDeletingProduct) setProductToDelete(null);
        }}
      />

      {/* ========================================================================= */}
      {/* 7. MODAL KONFIRMASI DESTRUKTIF: HAPUS MASAL (BULK BATCH DELETE)           */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title={`Hapus ${selectedProductIds.length} Produk Terpilih?`}
        message={`Apakah Anda yakin ingin menghapus ${selectedProductIds.length} produk yang tercentang? Seluruh dokumen di Firestore dan aset foto terkait di server Cloudinary akan dihapus permanen.`}
        confirmLabel="Ya, Hapus Permanen"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={isDeletingProduct}
        onConfirm={handleConfirmBulkDelete}
        onClose={() => {
          if (!isDeletingProduct) setIsBulkDeleteModalOpen(false);
        }}
      />
    </div>
  );
}
