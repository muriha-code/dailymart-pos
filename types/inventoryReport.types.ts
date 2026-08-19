export interface InventoryReportItem {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  unit: string;
  initialStock: number;  // Stok Awal
  stockIn: number;       // Masuk (+)
  stockOut: number;      // Keluar (-)
  opnameDiff: number;    // Selisih Opname (+ / -)
  stockReturn: number;   // Retur / Rusak (-)
  finalStock: number;    // Stok Akhir = initialStock + stockIn - stockOut + opnameDiff - stockReturn
  lastUpdated?: string | Date;
}

export interface InventoryReportSummary {
  totalStockIn: number;
  totalStockOut: number;
  netOpnameDiff: number;
  totalStockReturn: number;
}

export interface InventoryReportParams {
  search?: string;
  category?: string;
  period?: 'today' | '7days' | 'thisMonth' | 'all';
}
