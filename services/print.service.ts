import { ReceiptData, ReceiptPaperSize } from "@/types/receipt";
import { CashierShift } from "@/types/shift.types";

/**
 * Format mata uang Rupiah standar Indonesia
 */
export const formatRupiah = (amount: number): string => {
  return "Rp " + Math.round(amount || 0).toLocaleString("id-ID");
};

/**
 * Generate isolated HTML + CSS string untuk Struk Kasir Thermal (58mm / 80mm)
 * Menggunakan @page scoped khusus di dalam iframe tanpa merusak window global
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
  const dividerChar = is58mm
    ? "--------------------------------"
    : "------------------------------------------------";

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
            margin: 3px 0;
            color: #000;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: ${is58mm ? "8.5px" : "10px"};
          }
          .item-block {
            margin: 3px 0;
          }
          .item-name {
            font-weight: bold;
            word-wrap: break-word;
          }
          .flex-row {
            display: flex;
            justify-content: space-between;
          }
          .text-muted {
            font-size: ${is58mm ? "8px" : "9px"};
            color: #444;
          }
          .total-section {
            margin-top: 4px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            font-size: ${totalFontSize};
            font-weight: 900;
            margin: 3px 0;
          }
          .footer-section {
            margin-top: 6px;
            text-align: center;
            font-size: ${is58mm ? "8px" : "9.5px"};
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="text-center">
            <div class="store-name">${receipt.storeName}</div>
            ${receipt.storeBranch ? `<div class="store-sub">${receipt.storeBranch}</div>` : ""}
            ${receipt.storeAddress ? `<div class="store-sub">${receipt.storeAddress}</div>` : ""}
            ${receipt.storePhone ? `<div class="store-sub">Telp: ${receipt.storePhone}</div>` : ""}
          </div>

          <div class="divider"></div>

          <div class="meta-row" style="white-space: nowrap;">
            <span>No. TRX:</span>
            <span class="font-bold">${receipt.transactionNumber}</span>
          </div>
          <div class="text-right" style="margin-bottom: 2px; font-size: ${is58mm ? "8.5px" : "10px"};">
            ${receipt.date} ${receipt.time}
          </div>
          <div class="meta-row">
            <span>Kasir: ${receipt.cashierName}</span>
            <span>Bayar: ${receipt.paymentMethod}</span>
          </div>

          <div class="divider"></div>

          <div class="items-section">
            ${itemsHtml}
          </div>

          <div class="divider"></div>

          <div class="total-section">
            <div class="flex-row">
              <span>Subtotal</span>
              <span>${formatRupiah(receipt.subtotal)}</span>
            </div>
            ${discountTotalRow}
            ${taxRow}
            <div class="total-row">
              <span>TOTAL</span>
              <span>${formatRupiah(receipt.total)}</span>
            </div>
            <div class="flex-row">
              <span>Bayar (${receipt.paymentMethod})</span>
              <span>${formatRupiah(receipt.paidAmount)}</span>
            </div>
            <div class="flex-row font-bold">
              <span>Kembali</span>
              <span>${formatRupiah(receipt.change)}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="footer-section">
            <div>*** TERIMA KASIH ***</div>
            <div>${receipt.footerMessage || "Barang yang sudah dibeli tidak dapat ditukar."}</div>
            <div style="font-size: 7.5px; margin-top: 4px; color: #666;">DailyMart POS ${receipt.version || "v1.0"}</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate isolated HTML + CSS string untuk Struk Tutup Shift Kasir (58mm / 80mm)
 */
export function generateShiftThermalReceiptHtml(
  shift: CashierShift,
  paperSize: ReceiptPaperSize = "58mm"
): string {
  const is58mm = paperSize === "58mm";
  const containerMaxWidth = is58mm ? "48mm" : "72mm";
  const baseFontSize = is58mm ? "9.5px" : "11px";
  const storeTitleSize = is58mm ? "12px" : "14px";
  const totalFontSize = is58mm ? "12px" : "13.5px";

  const openedDateStr = shift.openedAt ? new Date(shift.openedAt).toLocaleString("id-ID") : "-";
  const closedDateStr = shift.closedAt ? new Date(shift.closedAt).toLocaleString("id-ID") : "-";

  return `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Struk Tutup Shift - ${shift.userName}</title>
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
            font-size: ${storeTitleSize};
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .divider {
            border-bottom: 1px dashed #000000;
            margin: 4px 0;
            width: 100%;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: ${is58mm ? "8.5px" : "10px"};
          }
          .flex-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .footer-section {
            margin-top: 6px;
            text-align: center;
            font-size: ${is58mm ? "8px" : "9.5px"};
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="text-center">
            <div class="store-name">DAILYMART POS</div>
            <div style="font-size: ${is58mm ? "9px" : "10px"}; font-weight: bold;">LAPORAN REKONSILIASI SHIFT</div>
          </div>

          <div class="divider"></div>

          <div class="meta-row">
            <span>Kasir: ${shift.userName}</span>
            <span>Shift: ${shift.shiftType}</span>
          </div>
          <div class="meta-row">
            <span>Buka: ${openedDateStr}</span>
          </div>
          <div class="meta-row">
            <span>Tutup: ${closedDateStr}</span>
          </div>

          <div class="divider"></div>

          <div class="flex-row">
            <span>Modal Awal Kas</span>
            <span>${formatRupiah(shift.startingCash)}</span>
          </div>
          <div class="flex-row">
            <span>Total Transaksi</span>
            <span>${shift.totalTransactionsCount || 0} Trx</span>
          </div>
          <div class="flex-row">
            <span>Trx Tunai (Cash)</span>
            <span>${shift.totalCashTransactions || 0} Trx</span>
          </div>
          <div class="flex-row">
            <span>Trx Non-Tunai</span>
            <span>${shift.totalNonCashTransactions || 0} Trx</span>
          </div>

          <div class="divider"></div>

          <div class="flex-row font-bold">
            <span>Target Kas Sistem</span>
            <span>${formatRupiah(shift.expectedCash)}</span>
          </div>
          <div class="flex-row font-bold">
            <span>Fisik Kas Dihitung</span>
            <span>${formatRupiah(shift.actualCash)}</span>
          </div>
          <div class="flex-row font-bold">
            <span>Selisih (Variance)</span>
            <span>${shift.cashVariance >= 0 ? "+" : ""}${formatRupiah(shift.cashVariance)}</span>
          </div>

          ${
            shift.reconciliationNotes
              ? `
            <div class="divider"></div>
            <div style="font-size: ${is58mm ? "8px" : "9px"}; font-style: italic;">
              Catatan: ${shift.reconciliationNotes}
            </div>
          `
              : ""
          }

          <div class="divider"></div>

          <div class="footer-section">
            <div>Dokumen Resmi Shift Kasir</div>
            <div style="font-size: 7.5px; margin-top: 4px; color: #666;">DailyMart POS System</div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Eksekusi pencetakan HTML ke hidden isolated iframe
 * Mencegah styling thermal mencemari CSS @media print halaman utama laporan
 */
export function printHtmlInIsolatedIframe(htmlContent: string): void {
  if (typeof window === "undefined") return;

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
    // Fallback jika iframe diblokir browser
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
      console.error("Gagal memanggil print pada isolated iframe:", err);
    } finally {
      setTimeout(() => {
        iframe?.remove();
      }, 2000);
    }
  }, 300);
}

/**
 * Service API Singleton untuk Operasi Pencetakan DailyMart POS
 */
export const printService = {
  /**
   * Cetak struk transaksi thermal kasir (58mm / 80mm) secara terisolasi
   */
  printThermalReceipt(receipt: ReceiptData, paperSize: ReceiptPaperSize = "58mm"): void {
    const html = generateThermalReceiptHtml(receipt, paperSize);
    printHtmlInIsolatedIframe(html);
  },

  /**
   * Cetak struk tutup shift thermal kasir (58mm / 80mm) secara terisolasi
   */
  printShiftThermalReceipt(shift: CashierShift, paperSize: ReceiptPaperSize = "58mm"): void {
    const html = generateShiftThermalReceiptHtml(shift, paperSize);
    printHtmlInIsolatedIframe(html);
  },

  /**
   * Cetak laporan standar (A4 / Portrait / Landscape) pada halaman utama
   */
  printStandardReport(): void {
    if (typeof window !== "undefined") {
      window.print();
    }
  },

  generateThermalReceiptHtml,
  generateShiftThermalReceiptHtml,
  printHtmlInIsolatedIframe,
};
