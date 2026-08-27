import ExcelJS from 'exceljs';
import { DailyCashFlowBreakdown } from '@/types/cashFlowReport.types';

/**
 * Utility untuk mengekspor Laporan Arus Kas ke file Excel (.xlsx)
 * berdesain Executive Dashboard modern dengan styling ExcelJS,
 * zebra striping, summary cards ter-highlight, dan rumus SUM & AVERAGE.
 */
export const exportCashFlowExcel = async (
  data: DailyCashFlowBreakdown[],
  periodLabel: string
) => {
  if (!data || data.length === 0) {
    alert('Tidak ada data arus kas untuk diekspor!');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DailyMart POS System';
  workbook.lastModifiedBy = 'DailyMart POS Admin';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Laporan Arus Kas', {
    views: [{ showGridLines: true }],
  });

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // 1. Title & Subtitle Section (Row 1 & 2)
  // Row 1: Main Header (Dark Royal Blue #1E3A8A)
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'DAILYMART POS — LAPORAN ARUS KAS';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E3A8A' }, // Dark Royal Blue
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 35;

  // Row 2: Subtitle (Slate Light #F1F5F9)
  worksheet.mergeCells('A2:I2');
  const subCell = worksheet.getCell('A2');
  subCell.value = `Tanggal Ekspor: ${todayStr} | Periode: ${periodLabel || 'Semua'}`;
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
  const totalRevenue = data.reduce((acc, item) => acc + (item.grossRevenue || 0), 0);
  const totalCogs = data.reduce((acc, item) => acc + (item.totalCogs || 0), 0);
  const totalNetProfit = data.reduce((acc, item) => acc + (item.netProfit ?? item.grossProfit ?? 0), 0);
  const avgMargin =
    data.length > 0
      ? data.reduce((acc, item) => acc + (item.margin || 0), 0) / data.length / 100
      : 0;

  // Merge Card Cells
  worksheet.mergeCells('A4:B4');
  worksheet.mergeCells('C4:D4');
  worksheet.mergeCells('E4:F4');
  worksheet.mergeCells('G4:I4');

  const cardHeaders = [
    { cell: 'A4', text: 'TOTAL PENDAPATAN', fill: 'F1F5F9' },
    { cell: 'C4', text: 'TOTAL HPP / MODAL', fill: 'F1F5F9' },
    { cell: 'E4', text: 'TOTAL LABA BERSIH', fill: 'DBEAFE', fontColor: '1E40AF' }, // Blue Highlight
    { cell: 'G4', text: 'RATA-RATA MARGIN', fill: 'F1F5F9' },
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
    { cell: 'A5', val: totalRevenue, numFmt: currencyFmt, fill: 'F8FAFC', fontColor: '0F172A' },
    { cell: 'C5', val: totalCogs, numFmt: currencyFmt, fill: 'F8FAFC', fontColor: '0F172A' },
    { cell: 'E5', val: totalNetProfit, numFmt: currencyFmt, fill: 'EFF6FF', fontColor: totalNetProfit < 0 ? 'DC2626' : '1D4ED8', isHighlight: true },
    { cell: 'G5', val: avgMargin, numFmt: '0.00%', fill: 'F8FAFC', fontColor: avgMargin < 0 ? 'DC2626' : '0F172A' },
  ];

  cardValues.forEach(({ cell, val, numFmt, fill, fontColor }) => {
    const c = worksheet.getCell(cell);
    c.value = val;
    c.numFmt = numFmt;
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

  ['A', 'B', 'C', 'D', 'G', 'H', 'I'].forEach((col) => {
    [4, 5].forEach((row) => {
      worksheet.getCell(`${col}${row}`).border = standardBorder;
    });
  });

  ['E', 'F'].forEach((col) => {
    [4, 5].forEach((row) => {
      worksheet.getCell(`${col}${row}`).border = highlightBorder;
    });
  });

  // Row 6: Blank Separator
  worksheet.getRow(6).height = 12;

  // 3. Table Header (Row 7) - Solid Slate #0F172A, Height 28pt
  const headers = [
    'No',
    'Tanggal / Periode',
    'Total Transaksi',
    'Pendapatan Kotor (Rp)',
    'HPP / Modal Pokok (Rp)',
    'Laba Kotor (Rp)',
    'Biaya Operasional (Rp)',
    'Laba Bersih (Rp)',
    'Profit Margin (%)',
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
      fgColor: { argb: '0F172A' }, // Solid Slate Dark
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: '020617' } },
      left: { style: 'thin', color: { argb: '334155' } },
      bottom: { style: 'medium', color: { argb: '020617' } },
      right: { style: 'thin', color: { argb: '334155' } },
    };
  });

  // 4. Data Rows & Zebra Striping (Rows 8+) - Height 22pt
  const startRow = 8;
  data.forEach((item, index) => {
    const currentRowIndex = startRow + index;
    const row = worksheet.getRow(currentRowIndex);
    row.height = 22;

    const isEvenRow = index % 2 === 0;
    const rowBgColor = isEvenRow ? 'FFFFFF' : 'F8FAFC'; // White vs Soft Gray Zebra Striping

    const netProfitVal = item.netProfit ?? item.grossProfit ?? 0;
    const marginVal = (item.margin || 0) / 100;

    row.getCell(1).value = index + 1;
    row.getCell(2).value = item.formattedDate || item.date;
    row.getCell(3).value = item.transactionCount || 0;
    row.getCell(4).value = item.grossRevenue || 0;
    row.getCell(5).value = item.totalCogs || 0;
    row.getCell(6).value = item.grossProfit || 0;
    row.getCell(7).value = item.operatingExpenses || 0;
    row.getCell(8).value = netProfitVal;
    row.getCell(9).value = marginVal;

    // Alignments
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).numFmt = '#,##0';

    [4, 5, 6, 7].forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      cell.numFmt = currencyFmt;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    // Laba Bersih (Col 8) with Conditional Formatting
    const netProfitCell = row.getCell(8);
    netProfitCell.numFmt = currencyFmt;
    netProfitCell.alignment = { horizontal: 'right', vertical: 'middle' };
    if (netProfitVal < 0) {
      netProfitCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DC2626' } };
    }

    // Profit Margin (Col 9) with Conditional Formatting
    const marginCell = row.getCell(9);
    marginCell.numFmt = '0.00%';
    marginCell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (marginVal < 0) {
      marginCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'DC2626' } };
    }

    // Apply Zebra Background & Thin Data Borders
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

  // 5. Summary / Total Row (Bottom Row) - Height 25pt, Slate Gray #E2E8F0
  const totalRowIndex = startRow + data.length;
  const totalRow = worksheet.getRow(totalRowIndex);
  totalRow.height = 25;

  worksheet.mergeCells(`A${totalRowIndex}:B${totalRowIndex}`);
  const totalLabelCell = worksheet.getCell(`A${totalRowIndex}`);
  totalLabelCell.value = 'TOTAL';
  totalLabelCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
  totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };

  const lastDataRow = totalRowIndex - 1;

  totalRow.getCell(3).value = { formula: `SUM(C${startRow}:C${lastDataRow})` };
  totalRow.getCell(4).value = { formula: `SUM(D${startRow}:D${lastDataRow})` };
  totalRow.getCell(5).value = { formula: `SUM(E${startRow}:E${lastDataRow})` };
  totalRow.getCell(6).value = { formula: `SUM(F${startRow}:F${lastDataRow})` };
  totalRow.getCell(7).value = { formula: `SUM(G${startRow}:G${lastDataRow})` };
  totalRow.getCell(8).value = { formula: `SUM(H${startRow}:H${lastDataRow})` };
  totalRow.getCell(9).value = { formula: `AVERAGE(I${startRow}:I${lastDataRow})` };

  totalRow.getCell(3).numFmt = '#,##0';
  totalRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

  [4, 5, 6, 7, 8].forEach((colIdx) => {
    const c = totalRow.getCell(colIdx);
    c.numFmt = currencyFmt;
    c.alignment = { horizontal: 'right', vertical: 'middle' };
  });

  const totalMarginCell = totalRow.getCell(9);
  totalMarginCell.numFmt = '0.00%';
  totalMarginCell.alignment = { horizontal: 'center', vertical: 'middle' };

  // Total Row Styling with Accounting Double Line Bottom Border
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

  // 6. Proportional Fixed & Auto Widths (Row 1-6 ignored)
  const defaultWidths = [6, 20, 16, 22, 22, 20, 22, 20, 16];

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

    col.width = Math.min(targetWidth, 24);
  });

  // 7. Trigger Browser Download (.xlsx)
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const dateSlug = new Date().toISOString().slice(0, 10);
  const fileName = `Laporan_Arus_Kas_DailyMart_${dateSlug}.xlsx`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
