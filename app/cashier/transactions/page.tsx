"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Product } from "@/types/product.types";
import { productService } from "@/services/product.service";
import { transactionService } from "@/services/transaction.service";
import { CreateTransactionPayload } from "@/types/transaction.types";

// ==========================================
// TYPES & INTERFACES
// ==========================================
export type PaymentMethod = "CASH" | "QRIS" | "DEBIT";

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  totalDiscount: number;
}

export interface TransactionSummary {
  invoiceNumber: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
  debitReference?: string;
  bankName?: string;
}

// ==========================================
// CATEGORIES CONSTANT
// ==========================================
const CATEGORIES = [
  { id: "all", name: "Semua Kategori" },
  { id: "sembako", name: "Sembako" },
  { id: "makanan", name: "Makanan" },
  { id: "minuman", name: "Minuman" },
  { id: "snack", name: "Snack & Biskuit" },
  { id: "perawatan", name: "Perawatan Diri" },
  { id: "kebersihan", name: "Kebersihan Rumah" },
  { id: "obat", name: "Obat & P3K" },
];

// Helper Mata Uang Rupiah (Tabular Monospaced Format)
const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

// Helper Fallback Icon Kategori Dinamis
const CategoryIconFallback = ({
  categoryId,
  categoryName,
  productName,
}: {
  categoryId?: string;
  categoryName?: string;
  productName: string;
}) => {
  const cat = (categoryId || categoryName || "").toLowerCase();

  if (cat.includes("makanan") || cat.includes("food")) {
    return (
      <div className="flex flex-col items-center justify-center text-amber-600 bg-amber-50/80 w-full h-full p-2 text-center">
        <svg className="w-8 h-8 mb-1 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 max-w-[90px] truncate">
          Makanan
        </span>
      </div>
    );
  }

  if (cat.includes("minuman") || cat.includes("drink")) {
    return (
      <div className="flex flex-col items-center justify-center text-blue-600 bg-blue-50/80 w-full h-full p-2 text-center">
        <svg className="w-8 h-8 mb-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.605 15.13a1 1 0 00-1.183.398l-.42.63A2 2 0 004 17.333V20a1 1 0 001 1h14a1 1 0 001-1v-2.667a2 2 0 00-.572-1.414zM8 9h8m-8-3h8m-8 6h8" />
        </svg>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 max-w-[90px] truncate">
          Minuman
        </span>
      </div>
    );
  }

  if (cat.includes("snack") || cat.includes("biskuit")) {
    return (
      <div className="flex flex-col items-center justify-center text-orange-600 bg-orange-50/80 w-full h-full p-2 text-center">
        <svg className="w-8 h-8 mb-1 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700 max-w-[90px] truncate">
          Snack
        </span>
      </div>
    );
  }

  if (cat.includes("sembako")) {
    return (
      <div className="flex flex-col items-center justify-center text-emerald-600 bg-emerald-50/80 w-full h-full p-2 text-center">
        <svg className="w-8 h-8 mb-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 max-w-[90px] truncate">
          Sembako
        </span>
      </div>
    );
  }

  if (cat.includes("perawatan") || cat.includes("care")) {
    return (
      <div className="flex flex-col items-center justify-center text-pink-600 bg-pink-50/80 w-full h-full p-2 text-center">
        <svg className="w-8 h-8 mb-1 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.684a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-700 max-w-[90px] truncate">
          Perawatan
        </span>
      </div>
    );
  }

  if (cat.includes("kebersihan") || cat.includes("clean")) {
    return (
      <div className="flex flex-col items-center justify-center text-purple-600 bg-purple-50/80 w-full h-full p-2 text-center">
        <svg className="w-8 h-8 mb-1 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 max-w-[90px] truncate">
          Kebersihan
        </span>
      </div>
    );
  }

  if (cat.includes("obat") || cat.includes("med")) {
    return (
      <div className="flex flex-col items-center justify-center text-red-600 bg-red-50/80 w-full h-full p-2 text-center">
        <svg className="w-8 h-8 mb-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 max-w-[90px] truncate">
          Obat & P3K
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-slate-500 bg-slate-100/90 w-full h-full p-2 text-center">
      <svg className="w-8 h-8 mb-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 max-w-[90px] truncate">
        {productName ? productName.substring(0, 3) : "POS"}
      </span>
    </div>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function CashierTransactionsPage() {
  // State Utama Katalog & Service Data
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const handleImageError = (productId: string) => {
    setFailedImages((prev) => ({ ...prev, [productId]: true }));
  };

  // State Kasir Aktif dari Autentikasi Sesi
  const [cashierUser, setCashierUser] = useState<{
    uid: string;
    displayName: string;
    role: string;
    initials: string;
  } | null>(null);

  // State Cart & Filter
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch session cashier user info on mount
  useEffect(() => {
    async function fetchSessionUser() {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const name = json.data.displayName || json.data.email?.split("@")[0] || "Kasir POS";
            const parts = name.trim().split(/\s+/);
            const initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
            setCashierUser({
              uid: json.data.uid,
              displayName: name,
              role: json.data.role || "CASHIER",
              initials,
            });
          }
        }
      } catch (err) {
        console.warn("Gagal memuat sesi kasir aktif:", err);
      }
    }
    fetchSessionUser();
  }, []);

  // State Modal Bayar
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [debitBank, setDebitBank] = useState<string>("BCA");
  const [debitRefNumber, setDebitRefNumber] = useState<string>("");
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);

  // State Transaksi Selesai
  const [lastTransaction, setLastTransaction] = useState<TransactionSummary | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Live Clock Kasir
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);

  // ==========================================
  // DEBOUNCE SEARCH (300ms)
  // ==========================================
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ==========================================
  // FETCH PRODUCTS VIA SERVICE LAYER
  // ==========================================
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setFetchError(null);
    try {
      const data = await productService.getProducts({
        search: debouncedSearch,
        categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
      });
      setProducts(data);
    } catch (err: any) {
      console.error("Gagal memuat produk dari API/Firestore:", err);
      setFetchError(
        err.message || "Gagal terhubung ke database server. Silakan coba lagi."
      );
    } finally {
      setIsLoadingProducts(false);
    }
  }, [debouncedSearch, selectedCategory]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Clock Update Effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      };
      setCurrentDateTime(now.toLocaleDateString("id-ID", options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Autofocus search on load
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // ==========================================
  // KALKULASI CART
  // ==========================================
  const subtotalCart = useMemo(() => {
    return cart.reduce((acc, item) => {
      const origPrice = item.product.originalPrice || item.product.sellingPrice;
      return acc + origPrice * item.quantity;
    }, 0);
  }, [cart]);

  const totalDiscountCart = useMemo(() => {
    return cart.reduce((acc, item) => {
      const itemDisc = (item.product.discountAmount || 0) * item.quantity;
      return acc + itemDisc;
    }, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotal, 0);
  }, [cart]);

  const totalItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Kalkulasi Kembalian
  const numericAmountPaid = useMemo(() => {
    const clean = amountPaidInput.replace(/\D/g, "");
    return clean ? parseInt(clean, 10) : 0;
  }, [amountPaidInput]);

  const changeAmount = useMemo(() => {
    if (paymentMethod === "CASH") {
      return numericAmountPaid - grandTotal;
    }
    return 0;
  }, [numericAmountPaid, grandTotal, paymentMethod]);

  const isCashSufficient = paymentMethod !== "CASH" || numericAmountPaid >= grandTotal;

  // ==========================================
  // CART ACTIONS & STOCK VALIDATION
  // ==========================================
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`Stok produk "${product.name}" telah habis!`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const item = prev[existingIndex];
        const newQty = item.quantity + 1;
        if (newQty > product.stock) {
          alert(
            `Stok tidak mencukupi! Produk "${product.name}" tersisa ${product.stock} ${product.unit}.`
          );
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          subtotal: item.unitPrice * newQty,
          totalDiscount: (item.product.discountAmount || 0) * newQty,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: product.sellingPrice,
            subtotal: product.sellingPrice,
            totalDiscount: product.discountAmount || 0,
          },
        ];
      }
    });
  };

  const handleUpdateQuantity = (productId: string | undefined, delta: number) => {
    if (!productId) return;

    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.stock) {
              alert(
                `Batas stok maksimum tercapai (${item.product.stock} ${item.product.unit}).`
              );
              return item;
            }
            return {
              ...item,
              quantity: nextQty,
              subtotal: item.unitPrice * nextQty,
              totalDiscount: (item.product.discountAmount || 0) * nextQty,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string | undefined) => {
    if (!productId) return;
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Kosongkan semua item di keranjang belanja?")) {
      setCart([]);
    }
  };

  // ==========================================
  // MODAL PEMBAYARAN & CHECKOUT
  // ==========================================
  const handleOpenPaymentModal = () => {
    if (cart.length === 0) {
      alert("Keranjang belanja masih kosong! Tambahkan produk terlebih dahulu.");
      return;
    }
    setPaymentMethod("CASH");
    setAmountPaidInput(grandTotal.toString());
    setDebitRefNumber("");
    setIsPaymentModalOpen(true);
    setTimeout(() => {
      cashInputRef.current?.select();
    }, 100);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    searchInputRef.current?.focus();
  };

  const handleQuickCash = (amount: number) => {
    setAmountPaidInput(amount.toString());
  };

  const handleProcessCheckout = async () => {
    if (!isCashSufficient) {
      alert("Nominal pembayaran tunai masih kurang dari total tagihan!");
      return;
    }

    if (paymentMethod === "DEBIT" && !debitRefNumber.trim()) {
      alert("Harap masukkan nomor referensi/approval kartu debit!");
      return;
    }

    setIsProcessingCheckout(true);

    try {
      // 1. Formasi payload transaksi untuk API
      const payload: CreateTransactionPayload = {
        items: cart.map((item) => ({
          productId: item.product.id || item.product.sku,
          productName: item.product.name,
          price: item.unitPrice,
          quantity: item.quantity,
          discount: (item.product.discountAmount || 0) * item.quantity,
          subtotal: item.subtotal,
        })),
        paymentMethod,
        paidAmount: paymentMethod === "CASH" ? numericAmountPaid : grandTotal,
        subtotal: subtotalCart,
        discount: totalDiscountCart,
        total: grandTotal,
        cashierId: cashierUser?.uid,
        cashierName: cashierUser?.displayName,
      };

      // 2. Eksekusi request API via transactionService
      const createdTransaction = await transactionService.createTransaction(payload);

      // 3. Format ringkasan transaksi untuk modal struk
      const summary: TransactionSummary = {
        invoiceNumber: createdTransaction.transactionNumber,
        date: new Date().toLocaleString("id-ID"),
        items: [...cart],
        subtotal: createdTransaction.subtotal,
        discountTotal: createdTransaction.discount,
        grandTotal: createdTransaction.total,
        paymentMethod: createdTransaction.paymentMethod as PaymentMethod,
        amountPaid: createdTransaction.paidAmount,
        changeAmount: createdTransaction.change,
        debitReference: paymentMethod === "DEBIT" ? debitRefNumber : undefined,
        bankName: paymentMethod === "DEBIT" ? debitBank : undefined,
      };

      setLastTransaction(summary);
      setIsPaymentModalOpen(false);
      setIsSuccessModalOpen(true);
      setCart([]);
      loadProducts(); // Refresh katalog stok produk terkini
    } catch (err: any) {
      console.error("Gagal memproses transaksi checkout:", err);
      alert(err.message || "Gagal memproses transaksi. Silakan periksa koneksi atau ketersediaan stok.");
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleNewTransaction = () => {
    setIsSuccessModalOpen(false);
    setLastTransaction(null);
    setSearchQuery("");
    loadProducts();
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // ==========================================
  // SHORTCUT KEYBOARD LISTENER (F2, F10, ESC, ENTER)
  // ==========================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 -> Focus search input
      if (e.key === "F2") {
        e.preventDefault();
        if (!isPaymentModalOpen && !isSuccessModalOpen) {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }
      }

      // F10 -> Open payment modal
      if (e.key === "F10") {
        e.preventDefault();
        if (!isPaymentModalOpen && !isSuccessModalOpen && cart.length > 0) {
          handleOpenPaymentModal();
        }
      }

      // Escape -> Close modals / clear search
      if (e.key === "Escape") {
        if (isPaymentModalOpen) {
          e.preventDefault();
          handleClosePaymentModal();
        } else if (isSuccessModalOpen) {
          e.preventDefault();
          handleNewTransaction();
        } else if (searchQuery) {
          setSearchQuery("");
        }
      }

      // Enter -> Submit payment modal or new transaction
      if (e.key === "Enter") {
        if (isPaymentModalOpen && isCashSufficient && !isProcessingCheckout) {
          e.preventDefault();
          handleProcessCheckout();
        } else if (isSuccessModalOpen) {
          e.preventDefault();
          handleNewTransaction();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isPaymentModalOpen,
    isSuccessModalOpen,
    cart,
    isCashSufficient,
    isProcessingCheckout,
    searchQuery,
    numericAmountPaid,
    grandTotal,
    paymentMethod,
    debitRefNumber,
  ]);

  // Quick cash buttons generator
  const quickCashOptions = useMemo(() => {
    const options = [grandTotal];
    const standardDenominations = [10000, 20000, 50000, 100000, 200000, 500000];

    const roundedUp50k = Math.ceil(grandTotal / 50000) * 50000;
    const roundedUp100k = Math.ceil(grandTotal / 100000) * 100000;

    standardDenominations.forEach((val) => {
      if (val >= grandTotal && !options.includes(val)) {
        options.push(val);
      }
    });

    if (roundedUp50k > grandTotal && !options.includes(roundedUp50k)) {
      options.push(roundedUp50k);
    }
    if (roundedUp100k > grandTotal && !options.includes(roundedUp100k)) {
      options.push(roundedUp100k);
    }

    return Array.from(new Set(options)).slice(0, 5);
  }, [grandTotal]);

  return (
    <div className="h-screen w-full overflow-hidden p-3 bg-slate-100 text-[#0F172A] select-none font-sans flex flex-col">
      {/* ========================================================================= */}
      {/* MAIN FULL-HEIGHT GRID LAYOUT (Col 8 Catalog | Col 4 Cart)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-12 gap-3 h-full min-h-0">
        {/* ========================================================================= */}
        {/* 1. KATALOG PRODUK (col-span-12 lg:col-span-8)                             */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full min-h-0 bg-[#F8FAFC] rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Top Search & Filter Bar */}
          <div className="p-3 bg-white border-b border-slate-200 space-y-2.5 shrink-0 shadow-xs">
            {/* Search Input Bar */}
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 pointer-events-none">
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama produk / SKU / Barcode (Shortcut: Tekan F2)..."
                className="w-full pl-10 pr-20 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent font-medium transition-all"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 px-2 py-0.5 text-xs text-slate-400 hover:text-slate-700 bg-slate-200 hover:bg-slate-300 rounded transition-colors"
                >
                  Clear ✕
                </button>
              ) : (
                <span className="absolute right-3 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-200 rounded border border-slate-300 pointer-events-none">
                  F2
                </span>
              )}
            </div>

            {/* Category Filter Pills (Horizontal Scroll) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200"
                    }`}
                  >
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Grid Area (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3">
            {isLoadingProducts ? (
              /* Loading Skeleton Grid */
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg border border-slate-200 p-3 h-36 flex flex-col justify-between animate-pulse"
                  >
                    <div className="flex justify-between">
                      <div className="w-16 h-3 bg-slate-200 rounded" />
                      <div className="w-8 h-3 bg-slate-200 rounded" />
                    </div>
                    <div className="space-y-1.5 my-2">
                      <div className="w-full h-3.5 bg-slate-200 rounded" />
                      <div className="w-2/3 h-3.5 bg-slate-200 rounded" />
                    </div>
                    <div className="flex justify-between items-end border-t border-slate-100 pt-2">
                      <div className="w-16 h-4 bg-slate-200 rounded" />
                      <div className="w-12 h-3 bg-slate-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : fetchError ? (
              /* Error State */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-600">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3 font-bold text-lg">
                  !
                </div>
                <p className="font-bold text-slate-900 text-sm">{fetchError}</p>
                <button
                  onClick={loadProducts}
                  className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                >
                  Coba Lagi
                </button>
              </div>
            ) : products.length === 0 ? (
              /* Empty State */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
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
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-slate-800 text-sm">
                  Tidak ada produk yang ditemukan
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Coba kata kunci lain atau pilih kategori &quot;Semua Kategori&quot;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    searchInputRef.current?.focus();
                  }}
                  className="mt-4 px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {products.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const minStockLimit = product.minimumStock ?? 5;
                  const isLowStock = product.stock > 0 && product.stock <= minStockLimit;
                  const hasDiscount =
                    !!product.discountAmount && product.discountAmount > 0;

                  return (
                    <div
                      key={product.id || product.sku}
                      onClick={() => !isOutOfStock && handleAddToCart(product)}
                      className={`group relative bg-white rounded-xl border p-2.5 flex flex-col justify-between transition-all duration-150 text-left ${
                        isOutOfStock
                          ? "opacity-60 border-red-200 cursor-not-allowed bg-red-50/20"
                          : "border-slate-200 hover:border-amber-400 hover:shadow-md cursor-pointer active:scale-[0.98]"
                      }`}
                    >
                      {/* Product Thumbnail Container */}
                      <div className="h-28 w-full rounded-lg overflow-hidden bg-slate-100 mb-2 relative flex items-center justify-center border border-slate-100 shrink-0">
                        {product.imageUrl && !failedImages[product.id || product.sku] ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            onError={() => handleImageError(product.id || product.sku)}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <CategoryIconFallback
                            categoryId={product.categoryId}
                            categoryName={product.categoryName}
                            productName={product.name}
                          />
                        )}

                        {/* Overlaid SKU Badge */}
                        <span className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold text-slate-700 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded shadow-xs uppercase">
                          {product.sku}
                        </span>

                        {/* Overlaid Discount Badge */}
                        {hasDiscount && (
                          <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded shadow-xs">
                            -{product.discountPercentage || 10}%
                          </span>
                        )}
                      </div>

                      {/* Product Name & Category */}
                      <div className="mb-2">
                        <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">
                          {product.categoryName || product.categoryId}
                        </p>
                      </div>

                      {/* Footer: Price & Stock Badge */}
                      <div className="pt-2 border-t border-slate-100 flex items-end justify-between gap-1 mt-auto">
                        <div>
                          {hasDiscount && product.originalPrice && (
                            <span className="block text-[9px] font-mono text-slate-400 line-through">
                              {formatRupiah(product.originalPrice)}
                            </span>
                          )}
                          <span className="text-xs sm:text-sm font-extrabold font-mono text-slate-900 tabular-nums">
                            {formatRupiah(product.sellingPrice)}
                          </span>
                        </div>

                        {/* Stock Status Badge */}
                        <div className="text-right">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block ${
                              isOutOfStock
                                ? "text-red-700 bg-red-100"
                                : isLowStock
                                ? "text-amber-800 bg-amber-100"
                                : "text-slate-600 bg-slate-100"
                            }`}
                          >
                            {isOutOfStock
                              ? "Habis"
                              : isLowStock
                              ? `Stok: ${product.stock}`
                              : `Stok: ${product.stock}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Info Strip */}
          <div className="px-4 py-2 bg-white border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between shrink-0">
            <span>
              Menampilkan <strong>{products.length}</strong> produk aktif dari Firestore
            </span>
            <span className="text-[11px] text-slate-400">
              Klik card untuk tambah ke keranjang
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. KERANJANG BELANJA (col-span-12 lg:col-span-4)                           */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-4 flex flex-col h-full min-h-0 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Cart Header */}
          <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-slate-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <h2 className="font-bold text-sm text-slate-900">
                Keranjang Belanja
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 text-slate-800">
                {totalItemCount} item
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Cart Item List (Scrollable) */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300 mb-3">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <p className="font-semibold text-slate-700 text-sm">
                  Keranjang Kosong
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                  Pilih produk dari katalog di sebelah kiri atau cari dengan shortcut [F2].
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const hasDiscount =
                  !!item.product.discountAmount && item.product.discountAmount > 0;

                return (
                  <div
                    key={item.product.id || item.product.sku}
                    className="py-2.5 px-2 hover:bg-slate-50/80 rounded-md transition-colors flex items-center justify-between gap-3"
                  >
                    {/* Item Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-medium text-slate-600 bg-slate-100 px-1 py-0.2 rounded">
                          {item.product.sku}
                        </span>
                        {hasDiscount && (
                          <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1 py-0.2 rounded">
                            Hemat {formatRupiah(item.totalDiscount)}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-semibold text-slate-900 truncate mt-0.5">
                        {item.product.name}
                      </h4>

                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {formatRupiah(item.unitPrice)} / {item.product.unit}
                      </div>
                    </div>

                    {/* Quantity Stepper */}
                    <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, -1)}
                        className="w-6 h-6 rounded bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-xs shadow-2xs transition-colors"
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-mono font-bold text-xs text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, 1)}
                        className="w-6 h-6 rounded bg-white hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold flex items-center justify-center text-xs shadow-2xs transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Subtotal & Delete */}
                    <div className="text-right min-w-[76px] shrink-0">
                      <div className="font-mono font-bold text-xs text-slate-900 tabular-nums">
                        {formatRupiah(item.subtotal)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-[10px] text-red-600 hover:text-red-800 hover:underline mt-0.5 font-medium"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Summary & Total Bayar Box */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-3">
            {/* Breakdown Rincian */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal ({totalItemCount} item)</span>
                <span className="font-mono font-medium text-slate-800">
                  {formatRupiah(subtotalCart)}
                </span>
              </div>
              {totalDiscountCart > 0 && (
                <div className="flex justify-between text-red-600 font-medium">
                  <span>Total Diskon Promo</span>
                  <span className="font-mono">
                    -{formatRupiah(totalDiscountCart)}
                  </span>
                </div>
              )}
            </div>

            {/* Box TOTAL BAYAR Dominan */}
            <div className="p-3.5 bg-white border-2 border-slate-900 rounded-xl shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Bayar
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Termasuk PPN jika berlaku
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 tabular-nums">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            {/* Tombol Utama Bayar (Warm Amber) */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleOpenPaymentModal}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide shadow-sm flex items-center justify-center gap-2 transition-all ${
                cart.length === 0
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                  : "bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 hover:shadow cursor-pointer"
              }`}
            >
              <span>PROSES BAYAR</span>
              <span className="px-2 py-0.5 rounded bg-amber-400/80 border border-amber-600/30 text-slate-950 font-mono text-xs font-extrabold">
                F10
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL / POP-UP PEMBAYARAN INTERAKTIF                                    */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Pembayaran Transaksi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih metode bayar dan input nominal
                </p>
              </div>
              <button
                type="button"
                onClick={handleClosePaymentModal}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
              {/* Grand Total Display */}
              <div className="p-4 bg-slate-900 text-white rounded-xl text-center shadow-inner">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">
                  Total Tagihan
                </span>
                <span className="text-3xl font-black font-mono tracking-tight text-white tabular-nums">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {/* Payment Method Tabs */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["CASH", "QRIS", "DEBIT"] as PaymentMethod[]).map((method) => {
                    const isSelected = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2.5 px-3 rounded-lg font-bold text-xs border transition-all flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                            : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span>{method === "CASH" ? "TUNAI / CASH" : method}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* METHOD: CASH */}
              {paymentMethod === "CASH" && (
                <div className="space-y-4">
                  {/* Input Uang Diterima */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Uang Diterima
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Input manual atau pilih pecahan
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-slate-400">
                        Rp
                      </span>
                      <input
                        ref={cashInputRef}
                        type="text"
                        value={amountPaidInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setAmountPaidInput(val);
                        }}
                        placeholder="0"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-300 focus:border-slate-900 rounded-xl font-mono text-xl font-bold text-slate-900 focus:bg-white focus:outline-none transition-all tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Quick Cash Buttons */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                      Pecahan Uang Cepat (Quick Cash):
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleQuickCash(grandTotal)}
                        className="py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold font-mono transition-colors"
                      >
                        Uang Pas
                      </button>
                      {quickCashOptions
                        .filter((val) => val !== grandTotal)
                        .map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handleQuickCash(amt)}
                            className="py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold font-mono transition-colors tabular-nums"
                          >
                            {formatRupiah(amt)}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Kembalian Display Box */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      numericAmountPaid < grandTotal
                        ? "bg-red-50 border-red-200 text-red-700"
                        : "bg-emerald-50 border-emerald-200 text-emerald-800"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block">
                        {numericAmountPaid < grandTotal ? "Kurang Bayar" : "Kembalian"}
                      </span>
                      <span className="text-[11px] opacity-80">
                        {numericAmountPaid < grandTotal
                          ? "Uang tunai belum mencukupi"
                          : "Uang kembalian ke pelanggan"}
                      </span>
                    </div>
                    <div className="text-right font-mono text-xl font-black tabular-nums">
                      {numericAmountPaid < grandTotal
                        ? `- ${formatRupiah(grandTotal - numericAmountPaid)}`
                        : formatRupiah(changeAmount)}
                    </div>
                  </div>
                </div>
              )}

              {/* METHOD: QRIS */}
              {paymentMethod === "QRIS" && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center text-center space-y-3">
                  <div className="p-3 bg-white border border-slate-300 rounded-lg shadow-2xs">
                    {/* Simulated QR Code SVG */}
                    <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                      <rect width="100" height="100" fill="white" />
                      <rect x="10" y="10" width="24" height="24" fill="#0F172A" />
                      <rect x="14" y="14" width="16" height="16" fill="white" />
                      <rect x="18" y="18" width="8" height="8" fill="#0F172A" />
                      <rect x="66" y="10" width="24" height="24" fill="#0F172A" />
                      <rect x="70" y="14" width="16" height="16" fill="white" />
                      <rect x="74" y="18" width="8" height="8" fill="#0F172A" />
                      <rect x="10" y="66" width="24" height="24" fill="#0F172A" />
                      <rect x="14" y="70" width="16" height="16" fill="white" />
                      <rect x="18" y="74" width="8" height="8" fill="#0F172A" />
                      <rect x="42" y="12" width="6" height="6" fill="#0F172A" />
                      <rect x="52" y="12" width="6" height="6" fill="#0F172A" />
                      <rect x="42" y="24" width="16" height="6" fill="#0F172A" />
                      <rect x="12" y="42" width="6" height="16" fill="#0F172A" />
                      <rect x="24" y="42" width="12" height="6" fill="#0F172A" />
                      <rect x="42" y="42" width="16" height="16" fill="#0F172A" />
                      <rect x="66" y="42" width="6" height="24" fill="#0F172A" />
                      <rect x="78" y="42" width="12" height="6" fill="#0F172A" />
                      <rect x="42" y="66" width="6" height="24" fill="#0F172A" />
                      <rect x="54" y="66" width="16" height="8" fill="#0F172A" />
                      <rect x="78" y="66" width="12" height="12" fill="#0F172A" />
                      <rect x="54" y="82" width="8" height="8" fill="#0F172A" />
                      <rect x="70" y="86" width="20" height="4" fill="#0F172A" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
                      Arahkan Pembeli untuk Scan QRIS
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Mendukung GoPay, OVO, Dana, ShopeePay, BCA Mobile, dll.
                    </span>
                  </div>
                </div>
              )}

              {/* METHOD: DEBIT */}
              {paymentMethod === "DEBIT" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Pilih Mesin EDC / Bank
                    </label>
                    <select
                      value={debitBank}
                      onChange={(e) => setDebitBank(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="BCA">EDC BCA Debit / Prima</option>
                      <option value="Mandiri">EDC Bank Mandiri</option>
                      <option value="BRI">EDC Bank BRI / Link</option>
                      <option value="BNI">EDC Bank BNI</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      No. Referensi / Kode Approval Kartu
                    </label>
                    <input
                      type="text"
                      value={debitRefNumber}
                      onChange={(e) => setDebitRefNumber(e.target.value)}
                      placeholder="Contoh: 839201948"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClosePaymentModal}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition-colors"
              >
                Batal [ESC]
              </button>

              <button
                type="button"
                disabled={!isCashSufficient || isProcessingCheckout}
                onClick={handleProcessCheckout}
                className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all ${
                  !isCashSufficient || isProcessingCheckout
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow"
                }`}
              >
                {isProcessingCheckout ? (
                  <span>Memproses Transaksi...</span>
                ) : (
                  <>
                    <span>SELESAIKAN TRANSAKSI</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-700/80 font-mono text-[10px]">
                      [Enter]
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL / STRUK TRANSAKSI BERHASIL & THERMAL PRINT RECEIPT                 */}
      {/* ========================================================================= */}
      {isSuccessModalOpen && lastTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
          {/* Style Khusus @media print untuk Printer Thermal (58mm/80mm) */}
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #thermal-receipt,
              #thermal-receipt * {
                visibility: visible !important;
              }
              #thermal-receipt {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 80mm !important;
                margin: 0 !important;
                padding: 10px !important;
                background: white !important;
                color: black !important;
                font-family: monospace !important;
                font-size: 11px !important;
                line-height: 1.2 !important;
              }
            }
          `}</style>

          {/* Thermal Receipt Print Area (Hanya Muncul Saat Print / window.print()) */}
          <div
            id="thermal-receipt"
            className="hidden print:block font-mono text-black text-xs leading-tight w-[80mm] p-2 bg-white"
          >
            <div className="text-center font-bold text-sm uppercase">DAILYMART POS</div>
            <div className="text-center text-[10px]">Minimarket & Retail POS System</div>
            <div className="text-center text-[10px]">Jl. Sudirman No. 123, Jakarta</div>
            <div className="text-center text-[10px]">Telp: (021) 555-0199</div>
            <div className="my-1 text-center overflow-hidden">----------------------------------------</div>
            <div className="text-[10px] space-y-0.5">
              <div>No. Invoice : {lastTransaction.invoiceNumber}</div>
              <div>Tanggal     : {lastTransaction.date}</div>
              <div>Kasir       : Ahmad Pratama (Ksr-01)</div>
              <div>Metode      : {lastTransaction.paymentMethod}</div>
            </div>
            <div className="my-1 text-center overflow-hidden">----------------------------------------</div>

            {/* Daftar Produk */}
            <div className="space-y-1 my-1">
              {lastTransaction.items.map((it) => (
                <div key={it.product.id || it.product.sku} className="text-[10px]">
                  <div className="font-bold truncate">{it.product.name}</div>
                  <div className="flex justify-between pl-2">
                    <span>
                      {it.quantity} x {formatRupiah(it.unitPrice)}
                    </span>
                    <span>{formatRupiah(it.subtotal)}</span>
                  </div>
                  {it.totalDiscount > 0 && (
                    <div className="flex justify-between pl-2 text-[9px] italic">
                      <span>  Diskon Item</span>
                      <span>- {formatRupiah(it.totalDiscount)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="my-1 text-center overflow-hidden">----------------------------------------</div>

            {/* Ringkasan Pembayaran */}
            <div className="space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(lastTransaction.subtotal)}</span>
              </div>
              {lastTransaction.discountTotal > 0 && (
                <div className="flex justify-between">
                  <span>Total Diskon</span>
                  <span>- {formatRupiah(lastTransaction.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-black">
                <span>TOTAL BAYAR</span>
                <span>{formatRupiah(lastTransaction.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Dibayar ({lastTransaction.paymentMethod})</span>
                <span>{formatRupiah(lastTransaction.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Kembalian</span>
                <span>{formatRupiah(lastTransaction.changeAmount)}</span>
              </div>
            </div>

            <div className="my-2 text-center overflow-hidden">----------------------------------------</div>
            <div className="text-center text-[10px] space-y-0.5">
              <div>*** TERIMA KASIH ***</div>
              <div>Selamat Berbelanja Kembali</div>
              <div className="text-[8px] mt-1 text-gray-500">DailyMart POS System v1.0</div>
            </div>
          </div>

          {/* On-screen UI Modal (Disembunyikan Otomatis Saat Print) */}
          <div className="print:hidden bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Header Sukses */}
            <div className="p-6 bg-emerald-600 text-white text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white mb-2">
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-black tracking-tight">
                Transaksi Berhasil!
              </h3>
              <p className="text-xs text-emerald-100 font-mono mt-0.5">
                {lastTransaction.invoiceNumber}
              </p>
            </div>

            {/* Receipt Summary Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-mono">
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Waktu:</span>
                  <span>{lastTransaction.date}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Metode:</span>
                  <span className="font-bold text-slate-800">
                    {lastTransaction.paymentMethod}
                  </span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Tagihan:</span>
                  <span>{formatRupiah(lastTransaction.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-xs">
                  <span>Dibayar ({lastTransaction.paymentMethod}):</span>
                  <span>{formatRupiah(lastTransaction.amountPaid)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-700 text-sm bg-emerald-50/80 p-1.5 rounded">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(lastTransaction.changeAmount)}</span>
                </div>
              </div>

              {/* Rincian Barang */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                  Rincian Barang ({lastTransaction.items.length} jenis)
                </span>
                <div className="max-h-32 overflow-y-auto space-y-1 text-slate-700 pr-1">
                  {lastTransaction.items.map((it) => (
                    <div
                      key={it.product.id || it.product.sku}
                      className="flex justify-between text-[11px] py-0.5 border-b border-slate-100"
                    >
                      <span className="truncate pr-2">
                        {it.product.name} (x{it.quantity})
                      </span>
                      <span className="font-mono font-medium shrink-0">
                        {formatRupiah(it.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <svg
                  className="w-4 h-4 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>Cetak Struk</span>
              </button>

              <button
                type="button"
                onClick={handleNewTransaction}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <span>Transaksi Baru</span>
                <span className="px-1 py-0.2 rounded bg-slate-700 font-mono text-[10px]">
                  [Enter]
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
