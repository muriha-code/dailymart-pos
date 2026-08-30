"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Product } from "@/types/product.types";
import { productService } from "@/services/product.service";
import { transactionService } from "@/services/transaction.service";
import { CreateTransactionPayload } from "@/types/transaction.types";
import { useAuth } from "@/components/providers/AuthProvider";
import { shiftService } from "@/services/shift.service";
import { CashierShift, ShiftValidationResult } from "@/types/shift.types";
import { ShiftType } from "@/types/schedule.types";
import {
  OpenShiftModal,
  CloseShiftModal,
  BlockedShiftScreen,
  ShiftReceiptModal,
} from "@/components/cashier/CashierShiftModal";
import { ReceiptPreviewCard } from "@/components/pos/ReceiptPrint";
import { executeThermalPrint } from "@/components/receipt/PrintReceipt";
import { ReceiptData, ReceiptPaperSize } from "@/types/receipt";
import { settingsService } from "@/services/settings.service";

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

// Helper Fallback Icon Kategori Netral (Minimalist Cube / Box Package)
const CategoryIconFallback = () => {
  return (
    <div className="flex items-center justify-center bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/70 rounded-xl w-full h-full p-2 text-center select-none">
      {/* Box Package 3D Cube Icon */}
      <svg
        className="w-8 h-8 text-slate-400 dark:text-slate-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth="1.75"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
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
  const { user: authUser, logout } = useAuth();
  const [cashierUser, setCashierUser] = useState<{
    uid: string;
    displayName: string;
    role: string;
    initials: string;
  } | null>(null);

  // Shift Management States
  const [shiftValidation, setShiftValidation] = useState<ShiftValidationResult | null>(null);
  const [isCheckingShift, setIsCheckingShift] = useState<boolean>(true);
  const [activeShift, setActiveShift] = useState<CashierShift | null>(null);
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState<boolean>(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState<boolean>(false);
  const [completedShiftForReceipt, setCompletedShiftForReceipt] = useState<CashierShift | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // Check shift status from server
  const checkCashierShift = useCallback(async () => {
    setIsCheckingShift(true);
    try {
      const result = await shiftService.checkShiftStatus();
      setShiftValidation(result);

      if (result.hasActiveShift && result.activeShift) {
        setActiveShift(result.activeShift);
        setIsOpenShiftModalOpen(false);
      } else {
        setActiveShift(null);
        if (result.hasScheduleToday && result.isWithinShiftTolerance) {
          setIsOpenShiftModalOpen(true);
        }
      }
    } catch (err: any) {
      console.warn("Gagal mengecek status shift kasir:", err);
    } finally {
      setIsCheckingShift(false);
    }
  }, []);

  useEffect(() => {
    checkCashierShift();
  }, [checkCashierShift]);

  const handleOpenShift = async (startingCash: number, shiftType: ShiftType) => {
    try {
      const newShift = await shiftService.openShift({
        startingCash,
        shiftType,
        scheduleId: shiftValidation?.todaySchedule?.id,
        userId: cashierUser?.uid,
        userName: cashierUser?.displayName,
      });
      setActiveShift(newShift);
      setIsOpenShiftModalOpen(false);
      toast.success(`Shift ${shiftType === 'SHIFT_PAGI' ? 'Pagi' : 'Sore'} berhasil dibuka! Selamat bertugas.`);
    } catch (err: any) {
      toast.error(err.message || "Gagal membuka shift kasir.");
      throw err;
    }
  };

  const handleCloseShift = async (actualCash: number, notes: string) => {
    if (!activeShift) return;
    try {
      const closedShift = await shiftService.closeShift({
        shiftId: activeShift.id,
        actualCash,
        reconciliationNotes: notes,
      });
      setIsCloseShiftModalOpen(false);
      setCompletedShiftForReceipt(closedShift);
      setIsReceiptModalOpen(true);
      toast.success("Shift kasir berhasil ditutup dan direkonsiliasi.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menutup shift.");
      throw err;
    }
  };

  const handleDoneReceipt = async () => {
    setIsReceiptModalOpen(false);
    if (logout) {
      await logout("shift_completed");
    } else {
      window.location.href = "/login?reason=shift_completed";
    }
  };

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
  const [isClearCartModalOpen, setIsClearCartModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [debitBank, setDebitBank] = useState<string>("BCA");
  const [debitRefNumber, setDebitRefNumber] = useState<string>("");
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);

  // Struk / Thermal Print State
  const [lastTransaction, setLastTransaction] = useState<TransactionSummary | null>(null);
  const [receiptPaperSize, setReceiptPaperSize] = useState<ReceiptPaperSize>("58mm");

  // Load saved paper size preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dailymart_pos_paper_size") as ReceiptPaperSize;
      if (saved === "58mm" || saved === "80mm") {
        setReceiptPaperSize(saved);
      }
    } catch {}
  }, []);

  const handlePaperSizeChange = (size: ReceiptPaperSize) => {
    setReceiptPaperSize(size);
    try {
      localStorage.setItem("dailymart_pos_paper_size", size);
    } catch {}
  };
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
      toast.error(`Stok produk "${product.name}" telah habis!`);
      return;
    }

    const existingIndex = cart.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      const item = cart[existingIndex];
      const newQty = item.quantity + 1;
      if (newQty > product.stock) {
        toast.error(
          `Stok tidak mencukupi! Produk "${product.name}" tersisa ${product.stock} ${product.unit}.`
        );
        return;
      }
      setCart((prev) => {
        const updated = [...prev];
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          subtotal: item.unitPrice * newQty,
          totalDiscount: (item.product.discountAmount || 0) * newQty,
        };
        return updated;
      });
      toast.success(`Jumlah "${product.name}" (+1) diperbarui`);
    } else {
      setCart((prev) => [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.sellingPrice,
          subtotal: product.sellingPrice,
          totalDiscount: product.discountAmount || 0,
        },
      ]);
      toast.success(`"${product.name}" ditambahkan ke keranjang`);
    }
  };

  const handleUpdateQuantity = (productId: string | undefined, delta: number) => {
    if (!productId) return;

    const existingItem = cart.find((item) => item.product.id === productId);
    if (!existingItem) return;

    const nextQty = existingItem.quantity + delta;
    if (nextQty > existingItem.product.stock) {
      toast.error(
        `Batas stok maksimum tercapai (${existingItem.product.stock} ${existingItem.product.unit}).`
      );
      return;
    }

    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            if (nextQty <= 0) return null;
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
    const itemToRemove = cart.find((item) => item.product.id === productId);
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
    if (itemToRemove) {
      toast(`"${itemToRemove.product.name}" dihapus dari keranjang`, { icon: "🗑️" });
    }
  };

  const handleClearCart = () => {
    if (cart.length === 0) return;
    setIsClearCartModalOpen(true);
  };

  const confirmClearCart = () => {
    setCart([]);
    setIsClearCartModalOpen(false);
    toast("Keranjang belanja dibersihkan", { icon: "🧹" });
  };

  // ==========================================
  // MODAL PEMBAYARAN & CHECKOUT
  // ==========================================
  const handleOpenPaymentModal = () => {
    if (cart.length === 0) {
      toast.error("Keranjang belanja masih kosong! Tambahkan produk terlebih dahulu.");
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
      toast.error("Nominal pembayaran tunai masih kurang dari total tagihan!");
      return;
    }

    if (paymentMethod === "DEBIT" && !debitRefNumber.trim()) {
      toast.error("Harap masukkan nomor referensi/approval kartu debit!");
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

      toast.success(`Transaksi ${createdTransaction.transactionNumber} berhasil dibayar`);
      setLastTransaction(summary);
      setIsPaymentModalOpen(false);
      setIsSuccessModalOpen(true);
      setCart([]);
      loadProducts(); // Refresh katalog stok produk terkini
      checkCashierShift(); // Sinkronisasi target kas shift kasir
    } catch (err: any) {
      console.error("Gagal memproses transaksi checkout:", err);
      toast.error(err.message || "Gagal memproses transaksi. Silakan periksa stok.");
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

  const handlePrintReceipt = async () => {
    if (!lastTransaction) return;
    try {
      const storeSettings = await settingsService.getSettings().catch(() => null);
      const now = new Date();
      const dateStr = now.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
      const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

      const receiptData: ReceiptData = {
        storeName: storeSettings?.storeName || "DAILYMART POS",
        storeBranch: storeSettings?.storeBranch ? `Cabang ${storeSettings.storeBranch}` : "Cabang Utama",
        storeAddress: storeSettings?.storeAddress || "Jl. Retail Utama No. 88, Bogor",
        storePhone: storeSettings?.storePhone || "0251-8339988",
        transactionNumber: lastTransaction.invoiceNumber,
        date: dateStr,
        time: timeStr,
        cashierName: cashierUser?.displayName || "Kasir",
        items: lastTransaction.items.map((it: CartItem) => ({
          name: it.product.name,
          quantity: it.quantity,
          price: it.unitPrice,
          subtotal: it.subtotal,
          discount: it.totalDiscount || 0,
        })),
        subtotal: lastTransaction.subtotal,
        discount: lastTransaction.discountTotal,
        tax: 0,
        total: lastTransaction.grandTotal,
        paymentMethod: lastTransaction.paymentMethod,
        paidAmount: lastTransaction.amountPaid,
        change: lastTransaction.changeAmount,
        footerMessage: storeSettings?.receiptFooterNote || "Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.",
        version: "v1.0",
      };

      executeThermalPrint(receiptData, receiptPaperSize);
    } catch (err) {
      console.error("Gagal mencetak struk thermal:", err);
      toast.error("Gagal mencetak struk");
    }
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

  const userRoleNormalized = (cashierUser?.role || authUser?.role || "").toUpperCase();
  const isRoleAdmin = userRoleNormalized === "ADMIN" || userRoleNormalized === "SUPER_ADMIN";

  // Blocked shift view HANYA untuk role CASHIER yang tidak memiliki jadwal atau di luar toleransi
  if (
    !isCheckingShift &&
    !activeShift &&
    !isRoleAdmin &&
    shiftValidation &&
    (!shiftValidation.hasScheduleToday || !shiftValidation.isWithinShiftTolerance)
  ) {
    return (
      <BlockedShiftScreen
        cashierName={cashierUser?.displayName || "Kasir"}
        validationResult={shiftValidation}
        onRefresh={checkCashierShift}
        onLogout={logout}
      />
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden p-3 bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 select-none font-sans flex flex-col gap-2.5 transition-colors duration-200">
      {/* ========================================================================= */}
      {/* TOP SHIFT STATUS BAR & QUICK CONTROLS                                     */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3 py-2 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between gap-2 shrink-0 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeShift ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              {activeShift
                ? activeShift.shiftType === "SHIFT_PAGI"
                  ? "SHIFT PAGI"
                  : "SHIFT SORE"
                : "SHIFT POS"}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 truncate">
              Kasir: <strong>{cashierUser?.displayName || "Kasir POS"}</strong>
            </span>
          </div>

          {activeShift && (
            <div className="hidden md:flex items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-400">
              <span>
                Clock In:{" "}
                <strong className="font-mono text-slate-900 dark:text-slate-100">
                  {new Date(activeShift.openedAt).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
              </span>
              <span>
                Modal Awal:{" "}
                <strong className="font-mono text-slate-900 dark:text-slate-100">
                  {formatRupiah(activeShift.startingCash)}
                </strong>
              </span>
              <span>
                Est. Kas di Laci:{" "}
                <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                  {formatRupiah(
                    activeShift.expectedCash ||
                      activeShift.startingCash +
                        (activeShift.totalCashTransactions || 0)
                  )}
                </strong>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 hidden lg:inline">
            {currentDateTime}
          </span>
          {activeShift ? (
            <button
              type="button"
              onClick={() => setIsCloseShiftModalOpen(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg border-2 border-slate-900 dark:border-slate-100 text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span>🚪 Tutup Kasir / End Shift</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsOpenShiftModalOpen(true)}
              className="px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg border-2 border-slate-900 dark:border-slate-100 text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span>⏱️ Buka Shift Kasir</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN FULL-HEIGHT GRID LAYOUT (Col 8 Catalog | Col 4 Cart)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        {/* ========================================================================= */}
        {/* 1. KATALOG PRODUK (col-span-12 lg:col-span-8)                             */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-8 flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden transition-colors">
          {/* Top Search & Filter Bar */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b-2 border-slate-900 dark:border-slate-100 space-y-2.5 shrink-0 transition-colors">
            {/* Search Input Bar */}
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-700 dark:text-slate-300 pointer-events-none">
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama produk / SKU / Barcode... [F2]"
                className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl pl-10 pr-16 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] focus:outline-none focus:ring-0 placeholder:text-slate-400 dark:placeholder:text-slate-500 w-full"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-3 px-2 py-0.5 text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 border border-slate-900 dark:border-slate-100 rounded transition-colors cursor-pointer"
                >
                  Clear ✕
                </button>
              )}
            </div>

            {/* Category Filter Pills (Horizontal Scroll) */}
            <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={
                      isActive
                        ? "bg-[#6366F1] text-white font-black text-xs px-3.5 py-1.5 rounded-lg border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] shrink-0 cursor-pointer"
                        : "bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs px-3.5 py-1.5 rounded-lg border-2 border-slate-900 dark:border-slate-100 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] shrink-0 transition-all cursor-pointer"
                    }
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
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-800/80 rounded-xl border-2 border-slate-900 dark:border-slate-100 p-3 h-36 flex flex-col justify-between shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] animate-pulse"
                  >
                    <div className="flex justify-between">
                      <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="w-8 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                    <div className="space-y-1.5 my-2">
                      <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="w-2/3 h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                    <div className="flex justify-between items-end border-t border-slate-200 dark:border-slate-700 pt-2">
                      <div className="w-16 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                      <div className="w-12 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : fetchError ? (
              /* Error State */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-600 dark:text-slate-400">
                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-red-600 dark:text-red-400 flex items-center justify-center mb-3 font-black text-lg">
                  !
                </div>
                <p className="font-black text-slate-900 dark:text-slate-100 text-sm">{fetchError}</p>
                <button
                  onClick={loadProducts}
                  className="mt-3 px-4 py-2 bg-[#6366F1] text-white border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] rounded-xl text-xs font-black hover:bg-[#4F46E5] cursor-pointer transition-all"
                >
                  Coba Lagi
                </button>
              </div>
            ) : products.length === 0 ? (
              /* Empty State */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 dark:text-slate-400">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center text-slate-600 dark:text-slate-400 mb-3">
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
                <p className="font-black text-slate-900 dark:text-slate-100 text-sm">
                  Tidak ada produk yang ditemukan
                </p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
                  Coba kata kunci lain atau pilih kategori &quot;Semua Kategori&quot;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    searchInputRef.current?.focus();
                  }}
                  className="mt-4 px-3.5 py-2 text-xs font-black bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] rounded-xl cursor-pointer transition-all"
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
                      className={
                        isOutOfStock
                          ? "bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-400 dark:border-slate-600 rounded-xl p-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.3)] opacity-60 cursor-not-allowed flex flex-col justify-between relative overflow-hidden text-left"
                          : "bg-white dark:bg-slate-800/90 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:hover:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden text-left"
                      }
                    >
                      {/* Product Thumbnail Container */}
                      <div className="w-full h-24 bg-slate-100 dark:bg-slate-900 border-[1.5px] border-slate-900 dark:border-slate-100 rounded-lg overflow-hidden flex items-center justify-center mb-2 relative shrink-0 p-1.5">
                        {product.imageUrl && !failedImages[product.id || product.sku] ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            onError={() => handleImageError(product.id || product.sku)}
                            className="w-full h-full object-contain rounded-md group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <CategoryIconFallback />
                        )}

                        {/* Overlaid SKU Badge */}
                        <span className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 self-start mb-1 shadow-2xs z-10">
                          {product.sku}
                        </span>

                        {/* Overlaid Discount Badge */}
                        {hasDiscount && (
                          <span className="absolute top-1.5 right-1.5 text-[9px] font-black bg-rose-500 text-white border border-slate-900 dark:border-slate-100 px-1.5 py-0.5 rounded shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] z-10">
                            -{product.discountPercentage || 10}%
                          </span>
                        )}
                      </div>

                      {/* Product Name & Category */}
                      <div className="mb-2">
                        <h3 className="text-xs font-black text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                          {product.name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {product.categoryName || product.categoryId}
                        </p>
                      </div>

                      {/* Footer: Price & Stock Badge */}
                      <div className="pt-2 border-t-2 border-slate-900/10 dark:border-slate-100/10 flex items-end justify-between gap-1 mt-auto">
                        <div>
                          {hasDiscount && product.originalPrice && (
                            <span className="block text-[9px] font-mono text-slate-400 dark:text-slate-500 line-through">
                              {formatRupiah(product.originalPrice)}
                            </span>
                          )}
                          <span className="font-mono font-black text-xs text-[#065F46] dark:text-emerald-400 tabular-nums">
                            {formatRupiah(product.sellingPrice)}
                          </span>
                        </div>

                        {/* Stock Status Badge */}
                        <div className="text-right">
                          <span
                            className={
                              isOutOfStock
                                ? "font-mono font-bold text-[10px] text-white bg-rose-600 px-1.5 py-0.5 rounded border border-slate-900 dark:border-slate-100 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                                : isLowStock
                                ? "font-mono font-bold text-[10px] text-slate-900 bg-[#FFB800] px-1.5 py-0.5 rounded border border-slate-900 dark:border-slate-100 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                                : "font-mono font-bold text-[10px] text-slate-700 dark:text-slate-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-slate-900 dark:border-slate-100 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                            }
                          >
                            {isOutOfStock
                              ? "Habis"
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
          <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-900 dark:border-slate-100 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between shrink-0 transition-colors">
            <span>
              Menampilkan <strong className="text-slate-950 dark:text-slate-50 font-black">{products.length}</strong> produk aktif
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              Tekan [F2] Cari • [F10] Bayar
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. KERANJANG BELANJA (col-span-12 lg:col-span-4)                           */}
        {/* ========================================================================= */}
        <div className="col-span-12 lg:col-span-4 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex flex-col h-full overflow-hidden transition-colors">
          {/* Cart Header */}
          <div className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 p-3.5 font-black text-xs text-slate-900 dark:text-slate-50 flex items-center justify-between shrink-0 gap-2 transition-colors">
            <div className="flex items-center gap-2 min-w-0">
              <svg
                className="w-4 h-4 text-slate-900 dark:text-slate-100 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              <h2 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-50 truncate whitespace-nowrap">
                Keranjang Belanja
              </h2>
              <span className="bg-[#FFB800] text-slate-950 border-[1.5px] border-slate-900 font-mono font-black text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                {totalItemCount} item
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs font-black text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-white dark:bg-slate-800 border-1.5 border-slate-900 dark:border-slate-100 px-2 py-1 rounded-lg shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* Cart Item List (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
                <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center text-slate-500 dark:text-slate-400 mb-3">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <p className="font-black text-slate-900 dark:text-slate-100 text-sm">
                  Keranjang Kosong
                </p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 max-w-[220px]">
                  Pilih produk dari katalog di sebelah kiri untuk memulai transaksi.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const productId = item.product.id || item.product.sku;
                const imageUrl = item.product.imageUrl;

                return (
                  <div
                    key={productId}
                    className="bg-slate-50 dark:bg-slate-800 border-[1.5px] border-slate-900 dark:border-slate-100 rounded-xl p-2.5 mb-2 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between gap-2 transition-colors"
                  >
                    {/* Thumbnail Mini */}
                    <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border-[1.5px] border-slate-900 dark:border-slate-100 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                      {imageUrl && !failedImages[productId] ? (
                        <img
                          src={imageUrl}
                          alt={item.product.name}
                          onError={() => handleImageError(productId)}
                          className="w-full h-full object-contain rounded"
                        />
                      ) : (
                        <svg
                          className="w-4 h-4 text-slate-500 dark:text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Area Informasi Nama */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-black text-slate-900 dark:text-slate-100 truncate leading-tight">
                        {item.product.name}
                      </h4>
                      <div className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-bold leading-none mt-0.5">
                        {formatRupiah(item.unitPrice)} / {item.product.unit}
                      </div>
                    </div>

                    {/* Kontrol Qty */}
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border-[1.5px] border-slate-900 dark:border-slate-100 rounded-lg p-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, -1)}
                        className="bg-white dark:bg-slate-800 border-[1.5px] border-slate-900 dark:border-slate-100 w-6 h-6 rounded-md font-black text-xs text-slate-900 dark:text-slate-100 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 active:translate-y-[1px] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-5 text-center text-[11px] font-black font-mono text-slate-900 dark:text-slate-100">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.product.id, 1)}
                        className="bg-white dark:bg-slate-800 border-[1.5px] border-slate-900 dark:border-slate-100 w-6 h-6 rounded-md font-black text-xs text-slate-900 dark:text-slate-100 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 active:translate-y-[1px] cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Total & Action */}
                    <div className="text-right shrink-0">
                      <div className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 leading-tight">
                        {formatRupiah(item.subtotal)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-[9px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 block ml-auto mt-0.5 hover:underline cursor-pointer"
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
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t-2 border-slate-900 dark:border-slate-100 shrink-0 space-y-3 transition-colors">
            {/* Breakdown Rincian */}
            <div className="space-y-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal ({totalItemCount} item)</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {formatRupiah(subtotalCart)}
                </span>
              </div>
              {totalDiscountCart > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-bold">
                  <span>Total Diskon Promo</span>
                  <span className="font-mono">
                    -{formatRupiah(totalDiscountCart)}
                  </span>
                </div>
              )}
            </div>

            {/* Box TOTAL BAYAR Dominan */}
            <div className="bg-[#FEF3C7] dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 mb-3 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between transition-colors">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-amber-200 block">
                  Total Bayar
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-amber-300/80">
                  Termasuk PPN jika berlaku
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-xl sm:text-2xl text-slate-950 dark:text-amber-300 tabular-nums">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            {/* Tombol Utama Bayar */}
            <button
              type="button"
              disabled={cart.length === 0}
              onClick={handleOpenPaymentModal}
              className={
                cart.length === 0
                  ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 font-black text-sm py-3.5 rounded-xl border-2 border-slate-400 dark:border-slate-700 cursor-not-allowed w-full uppercase tracking-wider"
                  : "bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-sm py-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all w-full uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
              }
            >
              <span>PROSES BAYAR</span>
              {cart.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] border border-slate-900">
                  [F10]
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL / POP-UP PEMBAYARAN INTERAKTIF                                    */}
      {/* ========================================================================= */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 transition-colors">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b-2 border-slate-900 dark:border-slate-100 flex items-center justify-between bg-slate-100 dark:bg-slate-800 transition-colors">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-slate-50">
                  Pembayaran Transaksi
                </h3>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
                  Pilih metode bayar dan input nominal
                </p>
              </div>
              <button
                type="button"
                onClick={handleClosePaymentModal}
                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 flex items-center justify-center font-black text-sm transition-colors cursor-pointer shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)]"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
              {/* Grand Total Display */}
              <div className="p-4 bg-[#FEF3C7] dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-center shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] transition-colors">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-amber-200 block mb-1">
                  Total Tagihan
                </span>
                <span className="text-3xl font-black font-mono tracking-tight text-slate-950 dark:text-amber-300 tabular-nums">
                  {formatRupiah(grandTotal)}
                </span>
              </div>

              {/* Payment Method Tabs */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-2">
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
                        className={
                          isSelected
                            ? "py-2.5 px-3 rounded-xl font-black text-xs border-2 border-slate-900 dark:border-slate-100 bg-[#6366F1] text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex flex-col items-center justify-center gap-1 cursor-pointer"
                            : "py-2.5 px-3 rounded-xl font-bold text-xs border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                        }
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
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Uang Diterima
                      </label>
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Input manual atau pilih pecahan
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-black text-sm text-slate-600 dark:text-slate-400">
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
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none rounded-xl font-mono text-xl font-black text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Quick Cash Buttons */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                      Pecahan Uang Cepat (Quick Cash):
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickCash(grandTotal)}
                        className="py-2 px-2 bg-[#FFB800] hover:bg-amber-400 text-slate-950 border-2 border-slate-900 dark:border-slate-100 rounded-lg text-xs font-black font-mono shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer"
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
                            className="py-2 px-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-2 border-slate-900 dark:border-slate-100 rounded-lg text-xs font-black font-mono shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer tabular-nums"
                          >
                            {formatRupiah(amt)}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Kembalian Display Box */}
                  <div
                    className={
                      numericAmountPaid < grandTotal
                        ? "p-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-rose-100 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between"
                        : "p-3.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between"
                    }
                  >
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block">
                        {numericAmountPaid < grandTotal ? "Kurang Bayar" : "Kembalian"}
                      </span>
                      <span className="text-[11px] font-bold opacity-90">
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
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex flex-col items-center text-center space-y-3 transition-colors">
                  <div className="p-3 bg-white border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
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
                    <span className="font-black text-xs text-slate-900 dark:text-slate-100 block">
                      Arahkan Pembeli untuk Scan QRIS
                    </span>
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-0.5 block">
                      Mendukung GoPay, OVO, Dana, ShopeePay, BCA Mobile, dll.
                    </span>
                  </div>
                </div>
              )}

              {/* METHOD: DEBIT */}
              {paymentMethod === "DEBIT" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                      Pilih Mesin EDC / Bank
                    </label>
                    <select
                      value={debitBank}
                      onChange={(e) => setDebitBank(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                    >
                      <option value="BCA">EDC BCA Debit / Prima</option>
                      <option value="Mandiri">EDC Bank Mandiri</option>
                      <option value="BRI">EDC Bank BRI / Link</option>
                      <option value="BNI">EDC Bank BNI</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 block mb-1">
                      No. Referensi / Kode Approval Kartu
                    </label>
                    <input
                      type="text"
                      value={debitRefNumber}
                      onChange={(e) => setDebitRefNumber(e.target.value)}
                      placeholder="Contoh: 839201948"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="px-6 py-4 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-900 dark:border-slate-100 flex items-center justify-between gap-3 transition-colors">
              <button
                type="button"
                onClick={handleClosePaymentModal}
                className="px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-colors cursor-pointer"
              >
                Batal [ESC]
              </button>

              <button
                type="button"
                disabled={!isCashSufficient || isProcessingCheckout}
                onClick={handleProcessCheckout}
                className={
                  !isCashSufficient || isProcessingCheckout
                    ? "flex-1 py-2.5 px-4 rounded-xl font-black text-xs bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-2 border-slate-400 dark:border-slate-600 cursor-not-allowed uppercase tracking-wider"
                    : "flex-1 py-2.5 px-4 rounded-xl font-black text-xs bg-[#6366F1] hover:bg-[#4F46E5] text-white border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                }
              >
                {isProcessingCheckout ? (
                  <span>Memproses Transaksi...</span>
                ) : (
                  <>
                    <span>SELESAIKAN TRANSAKSI</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          {/* On-screen UI Modal (Neo-Brutalism Industrial Cyber Punch) */}
          <div className="print:hidden bg-white dark:bg-slate-900 rounded-2xl border-4 border-[#0A0A0A] dark:border-slate-100 shadow-[8px_8px_0px_0px_rgba(10,10,10,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] w-full max-w-sm max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 transition-colors">
            {/* Header Sukses (Sticky Top) */}
            <div className="shrink-0 p-3.5 bg-[#00FF41] dark:bg-emerald-600 text-[#0A0A0A] dark:text-white border-b-4 border-[#0A0A0A] dark:border-slate-100 text-center flex items-center justify-center gap-2">
              <div className="w-6 h-6 rounded-md bg-white border-2 border-[#0A0A0A] shadow-[1.5px_1.5px_0px_0px_#0A0A0A] text-[#0A0A0A] flex items-center justify-center font-black text-xs">
                ✓
              </div>
              <h3 className="text-xs font-black tracking-tight uppercase">
                Transaksi Berhasil Diproses!
              </h3>
            </div>

            {/* Receipt Preview Card Body (Full Pure White Thermal Paper) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 bg-white dark:bg-slate-900">
              {/* Paper Size Switcher */}
              <div className="mb-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 text-slate-600 dark:text-slate-400">
                  Ukuran:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handlePaperSizeChange("58mm")}
                    className={`px-2.5 py-0.5 text-[11px] font-black rounded-lg border transition-all cursor-pointer ${
                      receiptPaperSize === "58mm"
                        ? "bg-[#FFB800] text-black border-slate-900 shadow-[1px_1px_0px_0px_#000]"
                        : "bg-transparent text-slate-600 dark:text-slate-400 border-transparent"
                    }`}
                  >
                    58mm (Standar)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePaperSizeChange("80mm")}
                    className={`px-2.5 py-0.5 text-[11px] font-black rounded-lg border transition-all cursor-pointer ${
                      receiptPaperSize === "80mm"
                        ? "bg-[#FFB800] text-black border-slate-900 shadow-[1px_1px_0px_0px_#000]"
                        : "bg-transparent text-slate-600 dark:text-slate-400 border-transparent"
                    }`}
                  >
                    80mm (Lebar)
                  </button>
                </div>
              </div>

              <ReceiptPreviewCard
                transaction={lastTransaction}
                cashierName={cashierUser?.displayName}
              />
            </div>

            {/* Footer Buttons (Sticky / Fixed at Bottom, Always Visible) */}
            <div className="shrink-0 p-3.5 bg-white dark:bg-slate-900 border-t-4 border-[#0A0A0A] dark:border-slate-100 flex items-center gap-2.5 z-20 transition-colors">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 px-3 rounded-xl border-2 border-[#0A0A0A] dark:border-slate-100 bg-[#FF8C00] hover:bg-[#E67E00] text-black font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-[3px_3px_0px_0px_#0A0A0A] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                <span>🖨️ Cetak Struk ({receiptPaperSize})</span>
              </button>

              <button
                type="button"
                onClick={handleNewTransaction}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white border-2 border-[#0A0A0A] dark:border-slate-100 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-[3px_3px_0px_0px_#0A0A0A] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
              >
                <span>Transaksi Baru</span>
                <span className="px-1 py-0.2 rounded bg-slate-900 text-white font-mono text-[10px]">
                  [Enter]
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL KONFIRMASI KOSONGKAN KERANJANG (TANPA BROWSER DIALOG)            */}
      {/* ========================================================================= */}
      {isClearCartModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] max-w-sm w-full p-6 text-center space-y-4 transition-colors">
            <div className="w-12 h-12 mx-auto rounded-xl bg-[#FFB800] border-2 border-slate-900 dark:border-slate-100 text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-slate-50 tracking-tight">
                Kosongkan Keranjang Belanja?
              </h3>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                Seluruh item ({totalItemCount} produk) yang ada di keranjang akan dihapus dari daftar transaksi ini.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearCartModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmClearCart}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer"
              >
                Ya, Kosongkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SHIFT MANAGEMENT MODALS (OPEN SHIFT, CLOSE SHIFT, THERMAL RECEIPT)      */}
      {/* ========================================================================= */}
      {/* A. Open Shift Modal (Clock In) */}
      <OpenShiftModal
        isOpen={isOpenShiftModalOpen}
        cashierName={cashierUser?.displayName || "Kasir"}
        todaySchedule={shiftValidation?.todaySchedule}
        lastCompletedShift={shiftValidation?.lastCompletedShift}
        onOpenShift={handleOpenShift}
        onLogout={logout}
      />

      {/* B. Close Shift Modal (Reconciliation & Clock Out) */}
      {activeShift && (
        <CloseShiftModal
          isOpen={isCloseShiftModalOpen}
          shift={activeShift}
          onCloseShift={handleCloseShift}
          onCancel={() => setIsCloseShiftModalOpen(false)}
        />
      )}

      {/* C. Thermal Receipt Modal for Closed Shift */}
      {completedShiftForReceipt && (
        <ShiftReceiptModal
          isOpen={isReceiptModalOpen}
          shift={completedShiftForReceipt}
          onDone={handleDoneReceipt}
        />
      )}
    </div>
  );
}
