import ExcelJS from 'exceljs';
import { InventoryReportItem } from '@/types/inventoryReport.types';

/**
 * Utility untuk mengekspor Laporan Inventaris & Rekap Mutasi Stok ke file Excel (.xlsx)
 * berformat Executive Dashboard modern menggunakan ExcelJS.
 */
export const exportInventoryExcel = async (
  data: InventoryReportItem[],
  periodLabel?: string
) => {
  if (!data || data.length === 0) {
    alert('Tidak ada data inventaris untuk diekspor!');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DailyMart POS System';
  workbook.lastModifiedBy = 'DailyMart POS Gudang & Logistik';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Laporan Inventaris', {
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
  titleCell.value = 'DAILYMART POS — LAPORAN INVENTARIS & REKAP MUTASI STOK';
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
  const totalStockIn = data.reduce((acc, item) => acc + (item.stockIn || 0), 0);
  const totalStockOut = data.reduce((acc, item) => acc + (item.stockOut || 0), 0);
  const netOpnameDiff = data.reduce((acc, item) => acc + (item.opnameDiff || 0), 0);
  const totalStockReturn = data.reduce((acc, item) => acc + (item.stockReturn || 0), 0);

  // Merge Card Cells (Row 4 for Titles, Row 5 for Values)
  worksheet.mergeCells('A4:C4');
  worksheet.mergeCells('D4:F4');
  worksheet.mergeCells('G4:I4');
  worksheet.mergeCells('J4:K4');

  const cardHeaders = [
    { cell: 'A4', text: 'TOTAL UNIT MASUK', fill: 'DCFCE7', fontColor: '15803D' },
    { cell: 'D4', text: 'TOTAL UNIT KELUAR', fill: 'DBEAFE', fontColor: '1E40AF' },
    { cell: 'G4', text: 'NET SELISIH OPNAME', fill: 'FEF3C7', fontColor: 'B45309' },
    { cell: 'J4', text: 'BARANG RUSAK / RETUR', fill: 'FEE2E2', fontColor: 'B91C1C' },
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

  const opnameDiffPrefix = netOpnameDiff >= 0 ? '+' : '';
  const cardValues = [
    { cell: 'A5', val: `+${totalStockIn} unit`, fill: 'F0FDF4', fontColor: '16A34A' },
    { cell: 'D5', val: `-${totalStockOut} unit`, fill: 'EFF6FF', fontColor: '2563EB' },
    { cell: 'G5', val: `${opnameDiffPrefix}${netOpnameDiff} unit`, fill: 'FEF3C7', fontColor: 'D97706' },
    { cell: 'J5', val: `-${totalStockReturn} unit`, fill: 'FEF2F2', fontColor: 'DC2626' },
  ];

  cardValues.forEach(({ cell, val, fill, fontColor }) => {
    const c = worksheet.getCell(cell);
    c.value = val;
    c.font = { name: 'Arial', size: 12, bold: true, color: { argb: fontColor } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  worksheet.getRow(5).height = 25;

  // Apply Card Borders
  const cardBorders: Record<string, Partial<ExcelJS.Borders>> = {
    A_C: {
      top: { style: 'thin', color: { argb: '86EFAC' } },
      left: { style: 'thin', color: { argb: '86EFAC' } },
      bottom: { style: 'thin', color: { argb: '86EFAC' } },
      right: { style: 'thin', color: { argb: '86EFAC' } },
    },
    D_F: {
      top: { style: 'thin', color: { argb: 'BFDBFE' } },
      left: { style: 'thin', color: { argb: 'BFDBFE' } },
      bottom: { style: 'thin', color: { argb: 'BFDBFE' } },
      right: { style: 'thin', color: { argb: 'BFDBFE' } },
    },
    G_I: {
      top: { style: 'thin', color: { argb: 'FDE68A' } },
      left: { style: 'thin', color: { argb: 'FDE68A' } },
      bottom: { style: 'thin', color: { argb: 'FDE68A' } },
      right: { style: 'thin', color: { argb: 'FDE68A' } },
    },
    J_K: {
      top: { style: 'thin', color: { argb: 'FCA5A5' } },
      left: { style: 'thin', color: { argb: 'FCA5A5' } },
      bottom: { style: 'thin', color: { argb: 'FCA5A5' } },
      right: { style: 'thin', color: { argb: 'FCA5A5' } },
    },
  };

  ['A', 'B', 'C'].forEach((col) => {
    [4, 5].forEach((row) => (worksheet.getCell(`${col}${row}`).border = cardBorders.A_C));
  });
  ['D', 'E', 'F'].forEach((col) => {
    [4, 5].forEach((row) => (worksheet.getCell(`${col}${row}`).border = cardBorders.D_F));
  });
  ['G', 'H', 'I'].forEach((col) => {
    [4, 5].forEach((row) => (worksheet.getCell(`${col}${row}`).border = cardBorders.G_I));
  });
  ['J', 'K'].forEach((col) => {
    [4, 5].forEach((row) => (worksheet.getCell(`${col}${row}`).border = cardBorders.J_K));
  });

  // Row 6: Separator Blank
  worksheet.getRow(6).height = 12;

  // 3. Table Header (Row 7)
  const headers = [
    'No',
    'Kode SKU',
    'Nama Produk',
    'Kategori',
    'Satuan',
    'Stok Awal',
    'Masuk (+)',
    'Keluar (-)',
    'Opname (+/-)',
    'Retur/Rusak (-)',
    'Stok Akhir',
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
    const isZeroStock = (item.finalStock ?? 0) === 0;
    const rowBgColor = isZeroStock ? 'FEF2F2' : isEvenRow ? 'FFFFFF' : 'F8FAFC';

    row.getCell(1).value = index + 1;
    row.getCell(2).value = item.sku || '-';
    row.getCell(3).value = item.productName || '-';
    row.getCell(4).value = item.categoryName || 'Umum';
    row.getCell(5).value = item.unit || 'Pcs';
    row.getCell(6).value = item.initialStock ?? 0;
    row.getCell(7).value = item.stockIn ?? 0;
    row.getCell(8).value = item.stockOut ?? 0;
    row.getCell(9).value = item.opnameDiff ?? 0;
    row.getCell(10).value = item.stockReturn ?? 0;
    row.getCell(11).value = item.finalStock ?? 0;

    // Alignment Setup: Center (Col 1, 2, 5, 6-11), Left (Col 3, 4)
    [1, 2, 5, 6, 7, 8, 9, 10, 11].forEach((colIdx) => {
      row.getCell(colIdx).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    [3, 4].forEach((colIdx) => {
      row.getCell(colIdx).alignment = { horizontal: 'left', vertical: 'middle' };
    });

    // Number Formats
    row.getCell(6).numFmt = '#,##0';
    row.getCell(7).numFmt = '+#,##0;-#,##0;0';
    row.getCell(8).numFmt = '-#,##0;-#,##0;0';
    row.getCell(9).numFmt = '+#,##0;-#,##0;0';
    row.getCell(10).numFmt = '-#,##0;-#,##0;0';
    row.getCell(11).numFmt = '#,##0';

    // Font Colors mapping per column
    // Col 7: Green (#16A34A), Col 8: Blue (#2563EB), Col 9: Orange (#D97706), Col 10: Red (#DC2626)
    const fontColors: Record<number, string> = {
      7: '16A34A',
      8: '2563EB',
      9: 'D97706',
      10: 'DC2626',
    };

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

      if (c in fontColors) {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: fontColors[c] } };
      } else if (c === 11 && isZeroStock) {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DC2626' } };
      } else if (c === 11) {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
      } else {
        cell.font = { name: 'Arial', size: 10, color: { argb: '0F172A' } };
      }
    }
  });

  // 5. Total / Summary Row (Bottom Row)
  const totalRowIndex = startRow + data.length;
  const totalRow = worksheet.getRow(totalRowIndex);
  totalRow.height = 25;

  worksheet.mergeCells(`A${totalRowIndex}:E${totalRowIndex}`);
  const totalLabelCell = worksheet.getCell(`A${totalRowIndex}`);
  totalLabelCell.value = 'TOTAL';
  totalLabelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
  totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const lastDataRow = totalRowIndex - 1;

  totalRow.getCell(6).value = { formula: `SUM(F${startRow}:F${lastDataRow})` };
  totalRow.getCell(7).value = { formula: `SUM(G${startRow}:G${lastDataRow})` };
  totalRow.getCell(8).value = { formula: `SUM(H${startRow}:H${lastDataRow})` };
  totalRow.getCell(9).value = { formula: `SUM(I${startRow}:I${lastDataRow})` };
  totalRow.getCell(10).value = { formula: `SUM(J${startRow}:J${lastDataRow})` };
  totalRow.getCell(11).value = { formula: `SUM(K${startRow}:K${lastDataRow})` };

  totalRow.getCell(6).numFmt = '#,##0';
  totalRow.getCell(7).numFmt = '+#,##0;-#,##0;0';
  totalRow.getCell(8).numFmt = '-#,##0;-#,##0;0';
  totalRow.getCell(9).numFmt = '+#,##0;-#,##0;0';
  totalRow.getCell(10).numFmt = '-#,##0;-#,##0;0';
  totalRow.getCell(11).numFmt = '#,##0';

  for (let colIdx = 1; colIdx <= 11; colIdx++) {
    const c = totalRow.getCell(colIdx);
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E2E8F0' }, // Slate Gray
    };

    // Keep font color encoding for summary totals if applicable
    const fontColors: Record<number, string> = {
      7: '16A34A',
      8: '2563EB',
      9: 'D97706',
      10: 'DC2626',
    };

    c.font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: fontColors[colIdx] || '0F172A' },
    };

    c.border = {
      top: { style: 'medium', color: { argb: '0F172A' } },
      bottom: { style: 'double', color: { argb: '0F172A' } }, // Accounting double line
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  }

  // 6. Set Fixed Column Widths
  // No: 6 | Kode SKU: 16 | Nama Produk: 32 | Kategori: 22 | Satuan: 12 | Stok Awal: 14 | Masuk (+): 14 | Keluar (-): 14 | Opname (+/-): 14 | Retur/Rusak (-): 16 | Stok Akhir: 14
  const fixedWidths = [6, 16, 32, 22, 12, 14, 14, 14, 14, 16, 14];

  worksheet.columns.forEach((col, idx) => {
    if (!col) return;
    col.width = fixedWidths[idx] || 16;
  });

  // 7. Trigger Browser File Download (.xlsx)
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const dateSlug = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Inventaris_DailyMart_${dateSlug}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
