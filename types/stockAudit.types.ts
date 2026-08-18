export type AuditReason =
  | 'Stok Cocok'
  | 'Barang Rusak'
  | 'Kadaluarsa'
  | 'Hilang'
  | 'Selisih Input'
  | 'Lainnya';

export interface StockAuditRecord {
  id?: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName?: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  reason: AuditReason | string;
  notes?: string;
  auditorId: string;
  auditorName: string;
  createdAt: string | Date;
}

export interface AuditSubmissionPayload {
  productId: string;
  physicalStock: number;
  reason: AuditReason | string;
  notes?: string;
  auditorId?: string;
  auditorName?: string;
}

export interface StockAuditQueryParams {
  search?: string;
  date?: string; // YYYY-MM-DD
}

export interface StockAuditResponse {
  success: boolean;
  message?: string;
  data?: StockAuditRecord | StockAuditRecord[];
}
