"use client";

import React, { useState, useEffect } from "react";
import { settingsService } from "@/services/settings.service";
import { StoreSettings } from "@/types/settings.types";

export interface ReceiptItemData {
  productName?: string;
  name?: string;
  quantity?: number;
  qty?: number;
  unitPrice?: number;
  price?: number;
  subtotal?: number;
  discount?: number;
}

export interface ReceiptTransactionData {
  invoiceNumber?: string;
  id?: string;
  transactionId?: string;
  date?: string | Date;
  createdAt?: string | Date;
  items?: ReceiptItemData[];
  details?: ReceiptItemData[];
  subtotal?: number;
  discountTotal?: number;
  total?: number;
  grandTotal?: number;
  paymentMethod?: string;
  amountPaid?: number;
  paidAmount?: number;
  cashReceived?: number;
  changeAmount?: number;
  change?: number;
  cashierName?: string;
  cashier?: {
    displayName?: string;
    name?: string;
  };
}

export interface StoreInfo {
  name?: string;
  subTitle?: string;
  address?: string;
  phone?: string;
  footerNote?: string;
}

interface ReceiptPrintProps {
  transaction: ReceiptTransactionData | any | null;
  cashierName?: string;
  storeInfo?: StoreInfo;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// Helper Format Date (misal: 15 Agu 2026, 13.43)
export const formatReceiptDate = (dateStr?: string | Date): string => {
  if (!dateStr) return "-";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return String(dateStr);

  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year}, ${hours}.${minutes}`;
};

// Helper Format Currency Rupiah
export const formatRupiah = (amount: number): string => {
  return "Rp " + Math.round(amount || 0).toLocaleString("id-ID");
};

/**
 * Hook untuk memuat konfigurasi toko Firestore secara aman
 */
export function useStoreConfig(storeInfoProp?: StoreInfo) {
  const [storeConfig, setStoreConfig] = useState<StoreSettings | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSettings() {
      try {
        const settings = await settingsService.getSettings();
        if (isMounted && settings) {
          setStoreConfig(settings);
        }
      } catch (err) {
        // Fallback silent
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    name: storeInfoProp?.name || storeConfig?.storeName || "DAILYMART POS",
    subTitle:
      storeInfoProp?.subTitle ||
      (storeConfig?.storeBranch ? `Cabang ${storeConfig.storeBranch}` : "Minimarket & Retail System"),
    address:
      storeInfoProp?.address ||
      storeConfig?.storeAddress ||
      "Jl. Raya Pajajaran No. 128, Bogor",
    phone:
      storeInfoProp?.phone ||
      (storeConfig?.storePhone ? `Telp: ${storeConfig.storePhone}` : "Telp: (0251) 833-9988"),
    footerNote:
      storeInfoProp?.footerNote ||
      storeConfig?.receiptFooterNote ||
      "Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.",
  };
}

/**
 * Komponen On-Screen Preview Struk bergaya Neo-Brutalism (Industrial Cyber Punch)
 */
export function ReceiptPreviewCard({
  transaction,
  cashierName,
  storeInfo,
}: ReceiptPrintProps) {
  const store = useStoreConfig(storeInfo);

  if (!transaction) return null;

  const invoiceNo =
    transaction.invoiceNumber ||
    transaction.id ||
    transaction.transactionId ||
    "-";
  const trxDate = transaction.date || transaction.createdAt;
  const cashier =
    cashierName ||
    transaction.cashierName ||
    transaction.cashier?.displayName ||
    transaction.cashier?.name ||
    "Ksr-01";
  const items = transaction.items || transaction.details || [];

  const subtotalVal = Number(transaction.subtotal || 0);
  const totalVal = Number(
    transaction.grandTotal || transaction.total || subtotalVal
  );
  const paidVal = Number(
    transaction.amountPaid ||
      transaction.paidAmount ||
      transaction.cashReceived ||
      totalVal
  );
  const changeVal = Number(
    transaction.changeAmount ??
      transaction.change ??
      Math.max(0, paidVal - totalVal)
  );
  const payMethod = transaction.paymentMethod || "CASH";

  return (
    <div className="w-full bg-white text-[#0A0A0A] font-mono text-xs select-text leading-tight">
      {/* Header Toko */}
      <div className="text-center space-y-0.5 mb-2.5">
        <h2 className="font-bold text-sm tracking-wider uppercase text-[#0A0A0A]">
          {store.name}
        </h2>
        {store.subTitle && (
          <p className="text-[11px] text-[#3A3A3A]">{store.subTitle}</p>
        )}
        {store.address && (
          <p className="text-[11px] text-[#3A3A3A]">{store.address}</p>
        )}
        {store.phone && (
          <p className="text-[11px] text-[#3A3A3A]">Telp: {store.phone}</p>
        )}
      </div>

      {/* Garis Pembatas Putus-putus */}
      <div className="border-b border-dashed border-gray-400 my-2.5"></div>

      {/* Metadata Transaksi */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">No. TRX:</span>
          <span className="font-bold text-[#0A0A0A]">{invoiceNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">Tanggal:</span>
          <span className="text-[#0A0A0A]">{formatReceiptDate(trxDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">Kasir:</span>
          <span className="text-[#0A0A0A]">{cashier}</span>
        </div>
      </div>

      {/* Garis Pembatas Putus-putus */}
      <div className="border-b border-dashed border-gray-400 my-2.5"></div>

      {/* Daftar Item Belanja (Semua item tampil rapi) */}
      <div className="space-y-2.5 my-2">
        {items.map((item: any, idx: number) => {
          const name =
            item.productName || item.name || item.product?.name || "Produk";
          const qty = Number(item.quantity || item.qty || 1);
          const price = Number(item.unitPrice || item.price || 0);
          const itemSubtotal = Number(item.subtotal || qty * price);

          return (
            <div key={idx} className="space-y-0.5">
              <div className="font-bold text-[#0A0A0A] text-xs leading-tight break-words">
                {name}
              </div>
              <div className="flex justify-between text-xs text-[#3A3A3A]">
                <span>
                  {qty} x {formatRupiah(price)}
                </span>
                <span className="font-bold text-[#0A0A0A]">
                  {formatRupiah(itemSubtotal)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Garis Pembatas Putus-putus */}
      <div className="border-b border-dashed border-gray-400 my-2.5"></div>

      {/* Ringkasan Subtotal & Total */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between text-[#3A3A3A]">
          <span>Subtotal:</span>
          <span>{formatRupiah(subtotalVal)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm text-[#0A0A0A] pt-0.5">
          <span>TOTAL:</span>
          <span>{formatRupiah(totalVal)}</span>
        </div>
      </div>

      {/* Garis Pembatas Putus-putus */}
      <div className="border-b border-dashed border-gray-400 my-2.5"></div>

      {/* Pembayaran & Kembalian */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">Metode Bayar:</span>
          <span className="font-bold text-[#0A0A0A]">{payMethod}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#3A3A3A]">Uang Diterima:</span>
          <span className="text-[#0A0A0A]">{formatRupiah(paidVal)}</span>
        </div>
        <div className="flex justify-between font-bold text-[#059669]">
          <span>Kembalian:</span>
          <span>{formatRupiah(changeVal)}</span>
        </div>
      </div>

      {/* Garis Pembatas Putus-putus */}
      <div className="border-b border-dashed border-gray-400 my-2.5"></div>

      {/* Footer Struk */}
      <div className="text-center space-y-1 mt-3 mb-1 text-xs">
        <p className="font-bold text-[#0A0A0A]">*** TERIMA KASIH ***</p>
        <p className="text-[11px] text-[#3A3A3A] leading-tight px-1">
          {store.footerNote}
        </p>
        <p className="text-[10px] text-[#6B6B6B] mt-2">DailyMart POS v1.0</p>
      </div>
    </div>
  );
}

/**
 * Komponen Cetak Thermal 80mm Resmi (Hidden on screen, full-width block on print)
 */
export default function ReceiptPrint({
  transaction,
  cashierName,
  storeInfo,
}: ReceiptPrintProps) {
  const store = useStoreConfig(storeInfo);

  if (!transaction) return null;

  const invoiceNo =
    transaction.invoiceNumber ||
    transaction.id ||
    transaction.transactionId ||
    "-";
  const trxDate = transaction.date || transaction.createdAt;
  const cashier =
    cashierName ||
    transaction.cashierName ||
    transaction.cashier?.displayName ||
    transaction.cashier?.name ||
    "Ksr-01";
  const items = transaction.items || transaction.details || [];

  const subtotalVal = Number(transaction.subtotal || 0);
  const totalVal = Number(
    transaction.grandTotal || transaction.total || subtotalVal
  );
  const paidVal = Number(
    transaction.amountPaid ||
      transaction.paidAmount ||
      transaction.cashReceived ||
      totalVal
  );
  const changeVal = Number(
    transaction.changeAmount ??
      transaction.change ??
      Math.max(0, paidVal - totalVal)
  );
  const payMethod = transaction.paymentMethod || "CASH";

  return (
    <div
      id="receipt-print-area"
      className="hidden print:block font-mono text-xs text-black bg-white w-full"
    >
      <div className="w-full mx-auto p-0 font-mono text-xs text-black leading-tight">
        {/* Header Toko */}
        <div className="text-center space-y-0.5 mb-2">
          <h1 className="font-bold text-sm tracking-wider uppercase text-black">
            {store.name}
          </h1>
          <p className="text-[11px] text-black">{store.subTitle}</p>
          <p className="text-[11px] text-black">{store.address}</p>
          <p className="text-[11px] text-black">{store.phone}</p>
        </div>

        {/* Garis Pembatas Putus-putus */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Metadata Transaksi */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>No. TRX:</span>
            <span className="font-bold text-black">{invoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span>Tanggal:</span>
            <span>{formatReceiptDate(trxDate)}</span>
          </div>
          <div className="flex justify-between">
            <span>Kasir:</span>
            <span>{cashier}</span>
          </div>
        </div>

        {/* Garis Pembatas Putus-putus */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Daftar Item Belanja */}
        <div className="space-y-2 my-2">
          {items.map((item: any, idx: number) => {
            const name =
              item.productName || item.name || item.product?.name || "Produk";
            const qty = Number(item.quantity || item.qty || 1);
            const price = Number(item.unitPrice || item.price || 0);
            const itemSubtotal = Number(item.subtotal || qty * price);

            return (
              <div key={idx} className="space-y-0.5">
                <div className="font-bold text-black text-xs leading-tight">
                  {name}
                </div>
                <div className="flex justify-between text-xs">
                  <span>
                    {qty} x {formatRupiah(price)}
                  </span>
                  <span className="font-bold text-black">
                    {formatRupiah(itemSubtotal)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Garis Pembatas Putus-putus */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Ringkasan Subtotal & Total */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatRupiah(subtotalVal)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm text-black pt-1">
            <span>TOTAL:</span>
            <span>{formatRupiah(totalVal)}</span>
          </div>
        </div>

        {/* Garis Pembatas Putus-putus */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Pembayaran & Kembalian */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span>Metode Bayar:</span>
            <span className="font-bold text-black">{payMethod}</span>
          </div>
          <div className="flex justify-between">
            <span>Uang Diterima:</span>
            <span>{formatRupiah(paidVal)}</span>
          </div>
          <div className="flex justify-between font-bold text-emerald-700">
            <span>Kembalian:</span>
            <span>{formatRupiah(changeVal)}</span>
          </div>
        </div>

        {/* Garis Pembatas Putus-putus */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Footer Receipt */}
        <div className="text-center space-y-1 mt-3 text-xs">
          <p className="font-bold text-black">*** TERIMA KASIH ***</p>
          <p className="text-[11px] text-black leading-tight px-1">
            {store.footerNote}
          </p>
          <p className="text-[10px] text-gray-600 mt-2">DailyMart POS v1.0</p>
        </div>
      </div>
    </div>
  );
}


