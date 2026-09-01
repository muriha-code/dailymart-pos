"use client";

import React, { useState, useEffect } from "react";
import { ReceiptData, ReceiptPaperSize } from "@/types/receipt";
import { CashierShift } from "@/types/shift.types";

interface PrintReceiptProps {
  receipt: ReceiptData;
  autoPrint?: boolean;
  onClose?: () => void;
  onNewTransaction?: () => void;
}

import {
  formatRupiah,
  generateThermalReceiptHtml,
  generateShiftThermalReceiptHtml,
  printHtmlInIsolatedIframe,
  printService,
} from "@/services/print.service";

export {
  formatRupiah,
  generateThermalReceiptHtml,
  generateShiftThermalReceiptHtml,
  printHtmlInIsolatedIframe,
};

/**
 * Re-export functions for backwards compatibility
 */
export const executeThermalPrint = printService.printThermalReceipt;
export const executeShiftThermalPrint = printService.printShiftThermalReceipt;

/**
 * Komponen PrintReceipt Utama (Neo-Brutalist Preview Modal + 58mm & 80mm Thermal Switcher)
 */
export default function PrintReceipt({
  receipt,
  autoPrint = false,
  onClose,
  onNewTransaction,
}: PrintReceiptProps) {
  const [paperSize, setPaperSize] = useState<ReceiptPaperSize>("58mm");
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  // Muat preferensi ukuran kertas dari localStorage
  useEffect(() => {
    try {
      const savedSize = localStorage.getItem("dailymart_pos_paper_size") as ReceiptPaperSize;
      if (savedSize === "58mm" || savedSize === "80mm") {
        setPaperSize(savedSize);
      }
    } catch {
      // Ignore localStorage error
    }
  }, []);

  const handlePaperSizeChange = (size: ReceiptPaperSize) => {
    setPaperSize(size);
    try {
      localStorage.setItem("dailymart_pos_paper_size", size);
    } catch {
      // Ignore localStorage error
    }
  };

  // Auto print saat komponen pertama kali dimuat jika diaktifkan
  useEffect(() => {
    if (autoPrint && receipt) {
      handlePrint();
    }
  }, [autoPrint]);

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      executeThermalPrint(receipt, paperSize);
    } catch (err) {
      console.error("Gagal menjalankan fungsi print thermal:", err);
    } finally {
      setIsPrinting(false);
    }
  };

  const is58mm = paperSize === "58mm";

  return (
    <div className="w-full flex flex-col items-center justify-center font-mono select-none">
      {/* Paper Size Selector Switcher */}
      <div className="w-full max-w-[340px] mb-3 flex items-center justify-between bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
        <span className="text-[11px] font-black uppercase tracking-wider px-2 text-slate-700 dark:text-slate-300">
          Kertas Thermal:
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handlePaperSizeChange("58mm")}
            className={`px-3 py-1 text-xs font-black rounded-lg border-2 border-slate-900 transition-all cursor-pointer ${
              paperSize === "58mm"
                ? "bg-[#FFB800] text-black shadow-[1.5px_1.5px_0px_0px_#000]"
                : "bg-white text-slate-600 hover:bg-slate-200 border-transparent shadow-none"
            }`}
          >
            58mm (Standar POS)
          </button>
          <button
            type="button"
            onClick={() => handlePaperSizeChange("80mm")}
            className={`px-3 py-1 text-xs font-black rounded-lg border-2 border-slate-900 transition-all cursor-pointer ${
              paperSize === "80mm"
                ? "bg-[#FFB800] text-black shadow-[1.5px_1.5px_0px_0px_#000]"
                : "bg-white text-slate-600 hover:bg-slate-200 border-transparent shadow-none"
            }`}
          >
            80mm (Lebar)
          </button>
        </div>
      </div>

      {/* Neo-Brutalist Thermal Receipt Card (Live Preview) */}
      <div
        className={`bg-white text-[#0A0A0A] border-4 border-black shadow-[8px_8px_0px_0px_#0A0A0A] rounded-xl p-4 sm:p-5 w-full mx-auto select-text animate-in fade-in zoom-in-95 duration-150 transition-all ${
          is58mm ? "max-w-[300px] text-[11px]" : "max-w-[360px] text-xs"
        }`}
      >
        {/* Header Toko */}
        <div className="text-center space-y-0.5 mb-2">
          <h1 className="font-black text-sm tracking-wider uppercase text-[#0A0A0A]">
            {receipt.storeName}
          </h1>
          {receipt.storeBranch && (
            <p className="text-[10px] text-[#3A3A3A]">{receipt.storeBranch}</p>
          )}
          {receipt.storeAddress && (
            <p className="text-[10px] text-[#3A3A3A]">{receipt.storeAddress}</p>
          )}
          {receipt.storePhone && (
            <p className="text-[10px] text-[#3A3A3A]">
              Telp: {receipt.storePhone}
            </p>
          )}
        </div>

        {/* Garis Pembatas Putus-putus */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Metadata Transaksi */}
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[#3A3A3A]">No. TRX:</span>
            <span className="font-bold text-[#0A0A0A]">
              {receipt.transactionNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#3A3A3A]">Tanggal:</span>
            <span className="text-[#0A0A0A]">
              {receipt.date} {receipt.time}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#3A3A3A]">Kasir:</span>
            <span className="text-[#0A0A0A]">{receipt.cashierName}</span>
          </div>
        </div>

        {/* Garis Pembatas Putus-putus */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Daftar Item Belanja */}
        <div className="space-y-2 my-2 max-h-[260px] overflow-y-auto pr-1">
          {receipt.items.map((item, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="font-bold text-[#0A0A0A] text-xs leading-tight break-words">
                {item.name}
              </div>
              <div className="flex justify-between text-xs text-[#3A3A3A]">
                <span>
                  {item.quantity} x {formatRupiah(item.price)}
                </span>
                <span className="font-bold text-[#0A0A0A]">
                  {formatRupiah(item.subtotal)}
                </span>
              </div>
              {item.discount && item.discount > 0 ? (
                <div className="flex justify-between text-[10px] text-rose-600 italic">
                  <span>  Diskon Item</span>
                  <span>-{formatRupiah(item.discount)}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Garis Pembatas Putus-putus */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Ringkasan Subtotal & Total */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-[#3A3A3A]">
            <span>Subtotal:</span>
            <span>{formatRupiah(receipt.subtotal)}</span>
          </div>
          {receipt.discount && receipt.discount > 0 ? (
            <div className="flex justify-between text-rose-600 font-bold">
              <span>Total Diskon:</span>
              <span>-{formatRupiah(receipt.discount)}</span>
            </div>
          ) : null}
          {receipt.tax && receipt.tax > 0 ? (
            <div className="flex justify-between text-[#3A3A3A]">
              <span>Pajak (PPN):</span>
              <span>+{formatRupiah(receipt.tax)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-black text-sm text-[#0A0A0A] pt-0.5">
            <span>TOTAL:</span>
            <span>{formatRupiah(receipt.total)}</span>
          </div>
        </div>

        {/* Garis Pembatas Putus-putus */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Pembayaran & Kembalian */}
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between">
            <span className="text-[#3A3A3A]">Metode Bayar:</span>
            <span className="font-bold text-[#0A0A0A]">
              {receipt.paymentMethod}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#3A3A3A]">Uang Diterima:</span>
            <span className="text-[#0A0A0A]">
              {formatRupiah(receipt.paidAmount)}
            </span>
          </div>
          <div className="flex justify-between font-bold text-[#059669]">
            <span>Kembalian:</span>
            <span>{formatRupiah(receipt.change)}</span>
          </div>
        </div>

        {/* Garis Pembatas Putus-putus */}
        <div className="border-b border-dashed border-gray-400 my-2"></div>

        {/* Footer Struk */}
        <div className="text-center space-y-0.5 mt-2 text-xs">
          <p className="font-bold text-[#0A0A0A]">*** TERIMA KASIH ***</p>
          <p className="text-[10px] text-[#3A3A3A] leading-tight px-1">
            {receipt.footerMessage || "Barang yang sudah dibeli tidak dapat ditukar."}
          </p>
          <p className="text-[9px] text-[#6B6B6B] mt-1.5">
            DailyMart POS {receipt.version || "v1.0"} ({paperSize})
          </p>
        </div>
      </div>

      {/* Action Buttons (Neo Brutalism Style) */}
      <div className="w-full max-w-[340px] flex items-center gap-2 mt-4">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl border-2 border-black bg-white hover:bg-slate-100 text-[#0A0A0A] font-bold text-xs shadow-[3px_3px_0px_0px_#0A0A0A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#0A0A0A] transition-all cursor-pointer text-center"
          >
            Tutup
          </button>
        )}

        <button
          type="button"
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex-1 py-2.5 px-3 rounded-xl border-2 border-black bg-[#FF8C00] hover:bg-[#E67E00] text-black font-black text-xs shadow-[3px_3px_0px_0px_#0A0A0A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#0A0A0A] transition-all cursor-pointer flex items-center justify-center gap-1.5"
        >
          <span>{isPrinting ? "Mencetak..." : `🖨️ Cetak Struk (${paperSize})`}</span>
        </button>

        {onNewTransaction && (
          <button
            type="button"
            onClick={onNewTransaction}
            className="flex-1 py-2.5 px-3 rounded-xl border-2 border-black bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs shadow-[3px_3px_0px_0px_#0A0A0A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#0A0A0A] transition-all cursor-pointer text-center"
          >
            Transaksi Baru
          </button>
        )}
      </div>
    </div>
  );
}
