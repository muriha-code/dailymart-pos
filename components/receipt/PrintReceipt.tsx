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

// Helper Format Mata Uang Rupiah
export const formatRupiah = (amount: number): string => {
  return "Rp " + Math.round(amount || 0).toLocaleString("id-ID");
};

/**
 * Generate string HTML + CSS murni untuk Struk Kasir Thermal (58mm / 80mm)
 */
export function generateThermalReceiptHtml(
  receipt: ReceiptData,
  paperSize: ReceiptPaperSize = "58mm"
): string {
  const is58mm = paperSize === "58mm";
  const containerMaxWidth = is58mm ? "48mm" : "72mm";
  const baseFontSize = is58mm ? "9.5px" : "11px";
  const storeTitleSize = is58mm ? "12px" : "14px";
  const totalFontSize = is58mm ? "13px" : "15px";
  const dividerChar = is58mm ? "--------------------------------" : "------------------------------------------------";

  const itemsHtml = receipt.items
    .map((item) => {
      const discountRow =
        item.discount && item.discount > 0
          ? `<div class="flex-row text-muted"><span>  (Diskon)</span><span>-${formatRupiah(
              item.discount
            )}</span></div>`
          : "";

      return `
        <div class="item-block">
          <div class="item-name">${item.name}</div>
          <div class="flex-row">
            <span>${item.quantity} x ${formatRupiah(item.price)}</span>
            <span class="font-bold">${formatRupiah(item.subtotal)}</span>
          </div>
          ${discountRow}
        </div>
      `;
    })
    .join("");

  const discountTotalRow =
    receipt.discount && receipt.discount > 0
      ? `<div class="flex-row text-bold"><span>Total Diskon</span><span>-${formatRupiah(
          receipt.discount
        )}</span></div>`
      : "";

  const taxRow =
    receipt.tax && receipt.tax > 0
      ? `<div class="flex-row"><span>PPN / Tax</span><span>+${formatRupiah(
          receipt.tax
        )}</span></div>`
      : "";

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Struk - ${receipt.transactionNumber}</title>
        <style>
          @page {
            size: ${paperSize} auto;
            margin: ${is58mm ? "0mm 1mm" : "2mm 3mm"};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: 'Courier New', Courier, 'JetBrains Mono', Monaco, monospace;
            font-size: ${baseFontSize};
            line-height: 1.25;
            width: 100%;
          }
          .receipt-container {
            width: 100%;
            max-width: ${containerMaxWidth};
            margin: 0 auto;
            padding: ${is58mm ? "2mm 0 6mm 0" : "3mm 0 8mm 0"};
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .store-name {
            font-size: ${storeTitleSize};
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .store-sub { font-size: ${is58mm ? "8.5px" : "9.5px"}; margin-bottom: 1px; color: #111; }
          .divider {
            border-bottom: 1px dashed #000000;
            margin: 4px 0;
            width: 100%;
          }
          .divider-text {
            text-align: center;
            overflow: hidden;
            letter-spacing: -1px;
            font-weight: bold;
            margin: 3px 0;
            font-size: 8px;
          }
          .flex-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .meta-row { margin: 1px 0; font-size: ${is58mm ? "9px" : "10px"}; }
          .item-block {
            margin-bottom: 4px;
            page-break-inside: avoid;
          }
          .item-name {
            font-weight: bold;
            word-wrap: break-word;
            overflow-wrap: break-word;
            line-height: 1.2;
            margin-bottom: 1px;
          }
          .total-section {
            margin-top: 2px;
          }
          .total-row {
            font-size: ${totalFontSize};
            font-weight: 900;
            margin: 3px 0;
            padding-top: 2px;
          }
          .footer {
            margin-top: 6px;
            text-align: center;
            font-size: ${is58mm ? "8.5px" : "9.5px"};
            line-height: 1.25;
          }
          .footer-title {
            font-weight: bold;
            margin-bottom: 2px;
          }
          .version-text {
            font-size: ${is58mm ? "7.5px" : "8.5px"};
            color: #444444;
            margin-top: 4px;
          }
          .text-muted {
            font-size: ${is58mm ? "8.5px" : "9px"};
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header Toko -->
          <div class="text-center">
            <div class="store-name">${receipt.storeName}</div>
            ${receipt.storeBranch ? `<div class="store-sub">${receipt.storeBranch}</div>` : ""}
            ${receipt.storeAddress ? `<div class="store-sub">${receipt.storeAddress}</div>` : ""}
            ${receipt.storePhone ? `<div class="store-sub">Telp: ${receipt.storePhone}</div>` : ""}
          </div>

          <div class="divider"></div>

          <!-- Metadata Transaksi -->
          <div class="meta-row flex-row">
            <span>No. TRX:</span>
            <span class="font-bold">${receipt.transactionNumber}</span>
          </div>
          <div class="meta-row flex-row">
            <span>Tanggal:</span>
            <span>${receipt.date} ${receipt.time}</span>
          </div>
          <div class="meta-row flex-row">
            <span>Kasir:</span>
            <span>${receipt.cashierName}</span>
          </div>

          <div class="divider"></div>

          <!-- Daftar Item Belanja -->
          <div class="items-list">
            ${itemsHtml}
          </div>

          <div class="divider"></div>

          <!-- Ringkasan Pembayaran -->
          <div class="total-section">
            <div class="flex-row">
              <span>Subtotal:</span>
              <span>${formatRupiah(receipt.subtotal)}</span>
            </div>
            ${discountTotalRow}
            ${taxRow}
            <div class="flex-row total-row">
              <span>TOTAL:</span>
              <span>${formatRupiah(receipt.total)}</span>
            </div>
          </div>

          <div class="divider"></div>

          <!-- Rincian Bayar & Kembalian -->
          <div class="flex-row meta-row">
            <span>Metode:</span>
            <span class="font-bold">${receipt.paymentMethod}</span>
          </div>
          <div class="flex-row meta-row">
            <span>Bayar:</span>
            <span>${formatRupiah(receipt.paidAmount)}</span>
          </div>
          <div class="flex-row meta-row font-bold">
            <span>Kembali:</span>
            <span>${formatRupiah(receipt.change)}</span>
          </div>

          <div class="divider"></div>

          <!-- Footer Struk -->
          <div class="footer">
            <div class="footer-title">*** TERIMA KASIH ***</div>
            <div>${receipt.footerMessage || "Barang yang sudah dibeli tidak dapat ditukar/dikembalikan."}</div>
            <div class="version-text">DailyMart POS ${receipt.version || "v1.0"}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate string HTML + CSS murni untuk Struk Penutupan Shift Kasir (58mm / 80mm)
 */
export function generateShiftThermalReceiptHtml(
  shift: CashierShift,
  paperSize: ReceiptPaperSize = "58mm"
): string {
  const is58mm = paperSize === "58mm";
  const containerMaxWidth = is58mm ? "48mm" : "72mm";
  const baseFontSize = is58mm ? "9.5px" : "11px";

  const cashierName = shift.userName || (shift as any).cashierName || "Kasir";
  const totalTransactions = shift.totalTransactionsCount || 0;
  const cashSales = shift.totalCashTransactions || 0;
  const nonCashSales = shift.totalNonCashTransactions || 0;
  const totalSales = cashSales + nonCashSales;
  const initialCash = shift.startingCash || 0;
  const expectedCash = shift.expectedCash || initialCash + cashSales;
  const actualCash = shift.actualCash || 0;
  const difference = shift.cashVariance ?? (actualCash - expectedCash);

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Struk Tutup Shift - ${cashierName}</title>
        <style>
          @page {
            size: ${paperSize} auto;
            margin: ${is58mm ? "0mm 1mm" : "2mm 3mm"};
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: 'Courier New', Courier, 'JetBrains Mono', Monaco, monospace;
            font-size: ${baseFontSize};
            line-height: 1.25;
            width: 100%;
          }
          .receipt-container {
            width: 100%;
            max-width: ${containerMaxWidth};
            margin: 0 auto;
            padding: ${is58mm ? "2mm 0 6mm 0" : "3mm 0 8mm 0"};
          }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .store-name {
            font-size: ${is58mm ? "12px" : "14px"};
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .report-title {
            font-size: ${is58mm ? "9px" : "10.5px"};
            font-weight: bold;
            margin-bottom: 2px;
          }
          .divider {
            border-bottom: 1px dashed #000000;
            margin: 4px 0;
            width: 100%;
          }
          .flex-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin: 1px 0;
          }
          .footer {
            margin-top: 8px;
            text-align: center;
            font-size: ${is58mm ? "8px" : "9px"};
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="text-center">
            <div class="store-name">DAILYMART POS</div>
            <div class="report-title">LAPORAN PENUTUPAN SHIFT</div>
          </div>

          <div class="divider"></div>

          <div class="flex-row"><span>Kasir:</span><span class="font-bold">${cashierName}</span></div>
          <div class="flex-row"><span>Tanggal:</span><span>${shift.date}</span></div>
          <div class="flex-row"><span>Jam Buka:</span><span>${shift.openedAt ? new Date(shift.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</span></div>
          <div class="flex-row"><span>Jam Tutup:</span><span>${shift.closedAt ? new Date(shift.closedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-"}</span></div>

          <div class="divider"></div>

          <div class="flex-row"><span>Total Transaksi:</span><span class="font-bold">${totalTransactions} TRX</span></div>
          <div class="flex-row"><span>Penjualan Tunai:</span><span>${formatRupiah(cashSales)}</span></div>
          <div class="flex-row"><span>Penjualan Non-Tunai:</span><span>${formatRupiah(nonCashSales)}</span></div>
          <div class="flex-row font-bold"><span>Total Penjualan:</span><span>${formatRupiah(totalSales)}</span></div>

          <div class="divider"></div>

          <div class="flex-row"><span>Modal Awal (Kas):</span><span>${formatRupiah(initialCash)}</span></div>
          <div class="flex-row"><span>Ekspektasi Kas Fisik:</span><span>${formatRupiah(expectedCash)}</span></div>
          <div class="flex-row font-bold"><span>Kas Fisik Aktual:</span><span>${formatRupiah(actualCash)}</span></div>
          <div class="flex-row font-bold">
            <span>Selisih Kas:</span>
            <span>${difference === 0 ? "PAS (Rp 0)" : (difference > 0 ? "+" : "") + formatRupiah(difference)}</span>
          </div>

          <div class="divider"></div>

          <div class="footer">
            <div>Dokumen Resmi Penutupan Shift Kasir</div>
            <div>DailyMart POS • Dicetak otomatis</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Eksekusi Cetak Thermal Terisolasi via Hidden Iframe (Tanpa Merusak Window & Tanpa Terblokir Popup)
 */
export function executeThermalPrint(
  receipt: ReceiptData,
  paperSize: ReceiptPaperSize = "58mm"
): void {
  const htmlContent = generateThermalReceiptHtml(receipt, paperSize);
  printHtmlInIsolatedIframe(htmlContent);
}

/**
 * Eksekusi Cetak Struk Tutup Shift Kasir via Hidden Iframe
 */
export function executeShiftThermalPrint(
  shift: CashierShift,
  paperSize: ReceiptPaperSize = "58mm"
): void {
  const htmlContent = generateShiftThermalReceiptHtml(shift, paperSize);
  printHtmlInIsolatedIframe(htmlContent);
}

/**
 * Helper internal untuk menulis HTML ke iframe tersembunyi dan memicu cetak
 */
function printHtmlInIsolatedIframe(htmlContent: string): void {
  const iframeId = "dailymart-thermal-print-iframe";
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;

  if (iframe) {
    iframe.remove();
  }

  iframe = document.createElement("iframe");
  iframe.id = iframeId;
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback jika iframe tidak bisa diakses
    const printWin = window.open("", "_blank", "width=380,height=600");
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
        printWin.close();
      }, 250);
    }
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    try {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    } catch (err) {
      console.error("Gagal memanggil print pada iframe:", err);
    } finally {
      setTimeout(() => {
        iframe?.remove();
      }, 2000);
    }
  }, 300);
}

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
