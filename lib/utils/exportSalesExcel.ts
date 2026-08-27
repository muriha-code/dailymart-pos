import ExcelJS from 'exceljs';
import { TransactionReportItem } from '@/types/salesReport.types';

/**
 * Utility untuk mengekspor Laporan Penjualan & Transaksi Retail ke file Excel (.xlsx)
 * berformat Executive Dashboard modern menggunakan ExcelJS.
 */
export const exportSalesExcel = async (
  data: TransactionReportItem[],
  periodLabel: string
) => {
  if (!data || data.length === 0) {
    alert('Tidak ada data transaksi untuk diekspor!');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DailyMart POS System';
  workbook.lastModifiedBy = 'DailyMart POS Admin';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Laporan Penjualan', {
    views: [{ showGridLines: true }],
  });

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // 1. Title & Subtitle Section (Row 1 & 2)
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'DAILYMART POS — LAPORAN PENJUALAN & TRANSAKSI RETAIL';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E3A8A' }, // Dark Royal Blue
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  worksheet.mergeCells('A2:I2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `Tanggal Ekspor: ${todayStr} | Periode: ${periodLabel || 'Filter Aktif'}`;
  subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: '475569' } };
  subCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F1F5F9' },
  };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  // Row 3: Blank Separator
  worksheet.getRow(3).height = 10;

  // 2. Summary Cards Block (Row 4 - 5)
  const totalRevenue = data.reduce((acc, item) => acc + (item.grandTotal || 0), 0);
  const totalTransactions = data.length;
  const totalItemsSold = data.reduce((acc, item) => acc + (item.itemsCount || 0), 0);
  const avgAov = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  // Merge Card Cells
  worksheet.mergeCells('A4:B4');
  worksheet.mergeCells('C4:D4');
  worksheet.mergeCells('E4:F4');
  worksheet.mergeCells('G4:I4');

  const cardHeaders = [
    { cell: 'A4', text: 'TOTAL OMSET PENJUALAN', fill: 'DBEAFE', fontColor: '1E40AF' },
    { cell: 'C4', text: 'TOTAL TRANSAKSI', fill: 'F1F5F9' },
    { cell: 'E4', text: 'TOTAL UNIT TERJUAL', fill: 'F1F5F9' },
    { cell: 'G4', text: 'RATA-RATA TRANSAKSI (AOV)', fill: 'F1F5F9' },
  ];

  cardHeaders.forEach(({ cell, text, fill, fontColor }) => {
    const c = worksheet.getCell(cell);
    c.value = text;
    c.font = { name: 'Arial', size: 8, bold: true, color: { argb: fontColor || '64748B' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  worksheet.getRow(4).height = 20;

  worksheet.mergeCells('A5:B5');
  worksheet.mergeCells('C5:D5');
  worksheet.mergeCells('E5:F5');
  worksheet.mergeCells('G5:I5');

  const currencyFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
  const cardValues = [
    { cell: 'A5', val: totalRevenue, numFmt: currencyFmt, fill: 'EFF6FF', fontColor: '1D4ED8' },
    { cell: 'C5', val: `${totalTransactions.toLocaleString('id-ID')} tx`, numFmt: undefined, fill: 'F8FAFC', fontColor: '0F172A' },
    { cell: 'E5', val: `${totalItemsSold.toLocaleString('id-ID')} unit`, numFmt: undefined, fill: 'F8FAFC', fontColor: '0F172A' },
    { cell: 'G5', val: avgAov, numFmt: currencyFmt, fill: 'F8FAFC', fontColor: '0F172A' },
  ];

  cardValues.forEach(({ cell, val, numFmt, fill, fontColor }) => {
    const c = worksheet.getCell(cell);
    c.value = val;
    if (numFmt) c.numFmt = numFmt;
    c.font = { name: 'Arial', size: 12, bold: true, color: { argb: fontColor } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  worksheet.getRow(5).height = 25;

  // Apply Card Borders
  const standardBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } },
  };

  const highlightBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: '93C5FD' } },
    left: { style: 'thin', color: { argb: '93C5FD' } },
    bottom: { style: 'thin', color: { argb: '93C5FD' } },
    right: { style: 'thin', color: { argb: '93C5FD' } },
  };

  ['A', 'B'].forEach((col) => {
    [4, 5].forEach((row) => {
      worksheet.getCell(`${col}${row}`).border = highlightBorder;
    });
  });

  ['C', 'D', 'E', 'F', 'G', 'H', 'I'].forEach((col) => {
    [4, 5].forEach((row) => {
      worksheet.getCell(`${col}${row}`).border = standardBorder;
    });
  });

  // Row 6: Blank Separator
  worksheet.getRow(6).height = 12;

  // 3. Table Header (Row 7)
  const headers = [
    'No',
    'No. Invoice',
    'Tanggal & Waktu',
    'Kasir',
    'Metode Pembayaran',
    'Jumlah Item',
    'Subtotal (Rp)',
    'Diskon (Rp)',
    'Grand Total (Rp)',
  ];

  const headerRow = worksheet.getRow(7);
  headerRow.height = 28;

  headers.forEach((headerText, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = headerText;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '0F172A' }, // Dark Slate
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: '020617' } },
      left: { style: 'thin', color: { argb: '334155' } },
      bottom: { style: 'medium', color: { argb: '020617' } },
      right: { style: 'thin', color: { argb: '334155' } },
    };
  });

  // 4. Data Rows & Zebra Striping (Rows 8+)
  const startRow = 8;
  data.forEach((item, index) => {
    const currentRowIndex = startRow + index;
    const row = worksheet.getRow(currentRowIndex);
    row.height = 22;

    const isEvenRow = index % 2 === 0;
    const rowBgColor = isEvenRow ? 'FFFFFF' : 'F8FAFC';

    row.getCell(1).value = index + 1;
    row.getCell(2).value = item.invoiceNumber || '-';
    row.getCell(3).value = item.date || '-';
    row.getCell(4).value = item.cashierName || 'Kasir';
    row.getCell(5).value = item.paymentMethod || 'TUNAI';
    row.getCell(6).value = item.itemsCount || 0;
    row.getCell(7).value = item.subtotal || 0;
    row.getCell(8).value = item.discountTotal || 0;
    row.getCell(9).value = item.grandTotal || 0;

    // Alignments (Text/Code Center for cols 1-6, Right for cols 7-9)
    for (let colIdx = 1; colIdx <= 6; colIdx++) {
      row.getCell(colIdx).alignment = { horizontal: 'center', vertical: 'middle' };
    }
    row.getCell(6).numFmt = '#,##0';

    [7, 8, 9].forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      cell.numFmt = currencyFmt;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    // Apply Zebra Background & Grid Border
    for (let c = 1; c <= 9; c++) {
      const cell = row.getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBgColor },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };
      if (!cell.font) {
        cell.font = { name: 'Arial', size: 10, color: { argb: '0F172A' } };
      }
    }
  });

  // 5. Total / Summary Row (Bottom Row)
  const totalRowIndex = startRow + data.length;
  const totalRow = worksheet.getRow(totalRowIndex);
  totalRow.height = 25;

  worksheet.mergeCells(`A${totalRowIndex}:B${totalRowIndex}`);
  const totalLabelCell = worksheet.getCell(`A${totalRowIndex}`);
  totalLabelCell.value = 'TOTAL';
  totalLabelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
  totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const lastDataRow = totalRowIndex - 1;

  totalRow.getCell(6).value = { formula: `SUM(F${startRow}:F${lastDataRow})` };
  totalRow.getCell(7).value = { formula: `SUM(G${startRow}:G${lastDataRow})` };
  totalRow.getCell(8).value = { formula: `SUM(H${startRow}:H${lastDataRow})` };
  totalRow.getCell(9).value = { formula: `SUM(I${startRow}:I${lastDataRow})` };

  totalRow.getCell(6).numFmt = '#,##0';
  totalRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

  [7, 8, 9].forEach((colIdx) => {
    const c = totalRow.getCell(colIdx);
    c.numFmt = currencyFmt;
    c.alignment = { horizontal: 'right', vertical: 'middle' };
  });

  for (let colIdx = 1; colIdx <= 9; colIdx++) {
    const c = totalRow.getCell(colIdx);
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E2E8F0' }, // Slate Gray
    };
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
    c.border = {
      top: { style: 'medium', color: { argb: '0F172A' } },
      bottom: { style: 'double', color: { argb: '0F172A' } }, // Double Line Accounting Border
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  }

  // 6. Proportional Fixed & Auto Widths
  // No: 6 | No. Invoice: 24 | Tanggal & Waktu: 20 | Kasir: 20 | Metode Pembayaran: 18 | Jumlah Item: 14 | Subtotal: 18 | Diskon: 16 | Grand Total: 20
  const defaultWidths = [6, 24, 20, 20, 18, 14, 18, 16, 20];

  worksheet.columns.forEach((col, idx) => {
    if (!col) return;
    let targetWidth = defaultWidths[idx] || 18;

    if (typeof col.eachCell === 'function') {
      col.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
        if (rowNumber >= 7 && cell.value) {
          const valStr =
            typeof cell.value === 'object' && 'formula' in cell.value
              ? cell.value.result?.toString() || '123,456,789'
              : cell.value.toString();
          targetWidth = Math.max(targetWidth, valStr.length + 3);
        }
      });
    }

    col.width = Math.min(targetWidth, 26);
  });

  // 7. Trigger Browser Download (.xlsx)
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const dateSlug = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Penjualan_DailyMart_${dateSlug}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
