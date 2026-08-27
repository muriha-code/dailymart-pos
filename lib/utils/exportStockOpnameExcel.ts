import ExcelJS from 'exceljs';
import { StockOpnameAuditItem } from '@/types/stockOpnameReport.types';

/**
 * Utility untuk mengekspor Laporan Stock Opname / Audit Stok ke file Excel (.xlsx)
 * berformat Executive Dashboard modern menggunakan ExcelJS.
 */
export const exportStockOpnameExcel = async (
  data: StockOpnameAuditItem[],
  periodLabel?: string
) => {
  if (!data || data.length === 0) {
    alert('Tidak ada data audit stock opname untuk diekspor!');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DailyMart POS System';
  workbook.lastModifiedBy = 'DailyMart POS Logistik & Gudang';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Audit Stock Opname', {
    views: [{ showGridLines: true }],
  });

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // 1. Header Dokumen (Row 1 - 2)
  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'DAILYMART POS — LAPORAN AUDIT STOCK OPNAME';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E3A8A' }, // Dark Royal Blue
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  worksheet.mergeCells('A2:K2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `Tanggal Ekspor: ${todayStr} | Periode: ${periodLabel || 'Semua Waktu'}`;
  subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: '475569' } };
  subCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F1F5F9' }, // Slate Light
  };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  // Row 3: Separator Blank
  worksheet.getRow(3).height = 10;

  // 2. Summary Cards Block (Row 4 - 5)
  const totalAudited = data.length;
  const matchedCount = data.filter((item) => item.diff === 0).length;
  const accuracyRate = totalAudited > 0 ? matchedCount / totalAudited : 0;
  
  const totalLoss = data.reduce((acc, item) => (item.diff < 0 ? acc + Math.abs(item.impactValueRp || 0) : acc), 0);
  const totalSurplus = data.reduce((acc, item) => (item.diff > 0 ? acc + (item.impactValueRp || 0) : acc), 0);

  // Merge Card Cells (Row 4 for Titles, Row 5 for Values)
  worksheet.mergeCells('A4:C4');
  worksheet.mergeCells('D4:F4');
  worksheet.mergeCells('G4:I4');
  worksheet.mergeCells('J4:K4');

  const cardHeaders = [
    { cell: 'A4', text: 'TOTAL ITEM DIVERIFIKASI', fill: 'F1F5F9', fontColor: '64748B' },
    { cell: 'D4', text: 'TINGKAT AKURASI STOK', fill: 'F1F5F9', fontColor: '64748B' },
    { cell: 'G4', text: 'TOTAL KERUGIAN (LOSS)', fill: 'FEE2E2', fontColor: 'B91C1C' },
    { cell: 'J4', text: 'TOTAL SURPLUS', fill: 'DCFCE7', fontColor: '15803D' },
  ];

  cardHeaders.forEach(({ cell, text, fill, fontColor }) => {
    const c = worksheet.getCell(cell);
    c.value = text;
    c.font = { name: 'Arial', size: 8, bold: true, color: { argb: fontColor } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  worksheet.getRow(4).height = 20;

  worksheet.mergeCells('A5:C5');
  worksheet.mergeCells('D5:F5');
  worksheet.mergeCells('G5:I5');
  worksheet.mergeCells('J5:K5');

  const currencyFmt = '"Rp "#,##0;("Rp "#,##0);"-"';
  const cardValues = [
    { cell: 'A5', val: `${totalAudited} item`, numFmt: undefined, fill: 'F8FAFC', fontColor: '0F172A' },
    { cell: 'D5', val: accuracyRate, numFmt: '0.0%', fill: 'F8FAFC', fontColor: '0F172A' },
    { cell: 'G5', val: totalLoss, numFmt: currencyFmt, fill: 'FEF2F2', fontColor: 'DC2626' },
    { cell: 'J5', val: totalSurplus, numFmt: currencyFmt, fill: 'F0FDF4', fontColor: '16A34A' },
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
  const stdCardBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } },
  };

  const lossCardBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FCA5A5' } },
    left: { style: 'thin', color: { argb: 'FCA5A5' } },
    bottom: { style: 'thin', color: { argb: 'FCA5A5' } },
    right: { style: 'thin', color: { argb: 'FCA5A5' } },
  };

  const surplusCardBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: '86EFAC' } },
    left: { style: 'thin', color: { argb: '86EFAC' } },
    bottom: { style: 'thin', color: { argb: '86EFAC' } },
    right: { style: 'thin', color: { argb: '86EFAC' } },
  };

  ['A', 'B', 'C', 'D', 'E', 'F'].forEach((col) => {
    [4, 5].forEach((row) => {
      worksheet.getCell(`${col}${row}`).border = stdCardBorder;
    });
  });

  ['G', 'H', 'I'].forEach((col) => {
    [4, 5].forEach((row) => {
      worksheet.getCell(`${col}${row}`).border = lossCardBorder;
    });
  });

  ['J', 'K'].forEach((col) => {
    [4, 5].forEach((row) => {
      worksheet.getCell(`${col}${row}`).border = surplusCardBorder;
    });
  });

  // Row 6: Separator Blank
  worksheet.getRow(6).height = 12;

  // 3. Table Header (Row 7)
  const headers = [
    'No',
    'Kode Audit',
    'Tanggal & Waktu',
    'Kode SKU',
    'Nama Produk',
    'Auditor',
    'Stok Sistem',
    'Stok Fisik',
    'Selisih Unit',
    'Dampak Nilai (Rp)',
    'Catatan Alasan',
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

  // 4. Data Rows & Formatting (Row 8+)
  const startRow = 8;
  data.forEach((item, index) => {
    const currentRowIndex = startRow + index;
    const row = worksheet.getRow(currentRowIndex);
    row.height = 22;

    const isEvenRow = index % 2 === 0;
    const rowBgColor = isEvenRow ? 'FFFFFF' : 'F8FAFC';

    const isLoss = item.diff < 0;
    const isSurplus = item.diff > 0;
    const fontColor = isLoss ? 'DC2626' : isSurplus ? '16A34A' : '0F172A';

    row.getCell(1).value = index + 1;
    row.getCell(2).value = item.auditCode || '-';
    row.getCell(3).value = item.date || '-';
    row.getCell(4).value = item.sku || '-';
    row.getCell(5).value = item.productName || '-';
    row.getCell(6).value = item.auditorName || '-';
    row.getCell(7).value = item.systemStock ?? 0;
    row.getCell(8).value = item.physicalStock ?? 0;
    row.getCell(9).value = item.diff ?? 0;
    row.getCell(10).value = item.impactValueRp ?? 0;
    row.getCell(11).value = item.notes || item.reason || '-';

    // Alignment Setup: Center (Col 1-4, 7-9), Left (Col 5, 6, 11), Right (Col 10)
    [1, 2, 3, 4, 7, 8, 9].forEach((colIdx) => {
      row.getCell(colIdx).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    [5, 6, 11].forEach((colIdx) => {
      row.getCell(colIdx).alignment = { horizontal: 'left', vertical: 'middle' };
    });

    row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };

    // Number Formatting
    row.getCell(7).numFmt = '#,##0';
    row.getCell(8).numFmt = '#,##0';
    row.getCell(9).numFmt = '+#,##0;-#,##0;0';
    row.getCell(10).numFmt = currencyFmt;

    // Apply Fonts, Zebra Fill & Borders
    for (let c = 1; c <= 11; c++) {
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

      // Conditional formatting for diff (col 9) & impact value (col 10)
      if (c === 9 || c === 10) {
        cell.font = { name: 'Arial', size: 10, bold: isLoss || isSurplus, color: { argb: fontColor } };
      } else {
        cell.font = { name: 'Arial', size: 10, color: { argb: '0F172A' } };
      }
    }
  });

  // 5. Total / Summary Row (Bottom Row)
  const totalRowIndex = startRow + data.length;
  const totalRow = worksheet.getRow(totalRowIndex);
  totalRow.height = 25;

  worksheet.mergeCells(`A${totalRowIndex}:F${totalRowIndex}`);
  const totalLabelCell = worksheet.getCell(`A${totalRowIndex}`);
  totalLabelCell.value = 'TOTAL';
  totalLabelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
  totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const lastDataRow = totalRowIndex - 1;

  totalRow.getCell(7).value = { formula: `SUM(G${startRow}:G${lastDataRow})` };
  totalRow.getCell(8).value = { formula: `SUM(H${startRow}:H${lastDataRow})` };
  totalRow.getCell(9).value = { formula: `SUM(I${startRow}:I${lastDataRow})` };
  totalRow.getCell(10).value = { formula: `SUM(J${startRow}:J${lastDataRow})` };
  totalRow.getCell(11).value = '';

  totalRow.getCell(7).numFmt = '#,##0';
  totalRow.getCell(8).numFmt = '#,##0';
  totalRow.getCell(9).numFmt = '+#,##0;-#,##0;0';
  totalRow.getCell(10).numFmt = currencyFmt;

  [7, 8, 9].forEach((colIdx) => {
    totalRow.getCell(colIdx).alignment = { horizontal: 'center', vertical: 'middle' };
  });
  totalRow.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };

  for (let colIdx = 1; colIdx <= 11; colIdx++) {
    const c = totalRow.getCell(colIdx);
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E2E8F0' }, // Slate Gray
    };
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
    c.border = {
      top: { style: 'medium', color: { argb: '0F172A' } },
      bottom: { style: 'double', color: { argb: '0F172A' } }, // Accounting double line
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  }

  // 6. Set Fixed Column Widths
  // No: 6 | Kode Audit: 16 | Tanggal & Waktu: 20 | Kode SKU: 16 | Nama Produk: 32 | Auditor: 22 | Stok Sistem: 14 | Stok Fisik: 14 | Selisih Unit: 14 | Dampak Nilai: 20 | Catatan Alasan: 40
  const fixedWidths = [6, 16, 20, 16, 32, 22, 14, 14, 14, 20, 40];

  worksheet.columns.forEach((col, idx) => {
    if (!col) return;
    col.width = fixedWidths[idx] || 20;
  });

  // 7. Trigger Browser File Download (.xlsx)
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const dateSlug = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Stock_Opname_DailyMart_${dateSlug}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
