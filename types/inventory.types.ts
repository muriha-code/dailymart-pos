export type MovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'DAMAGED'
  | 'STOCK_ADJUSTMENT'
  | 'STOCK_OPNAME';

export interface InventoryMovement {
  id?: string;
  productId: string;
  type: MovementType;
  quantity: number; // Angka negatif saat SALE (misal: -5), positif saat PURCHASE (misal: +10)
  purchasePrice?: number;
  referenceId: string; // ID transaksi atau referensi dokumen
  performedBy: string; // ID kasir / staf gudang
  createdAt: Date | string;
}

export interface StockInItem {
  productId: string;
  productName?: string;
  sku?: string;
  quantity: number;
  purchasePrice: number;
}

export interface StockInPayload {
  supplierId: string;
  supplierName?: string;
  invoiceNumber?: string;
  notes?: string;
  receivedBy: string;
  items: StockInItem[];
}

export interface StockInLog {
  id?: string;
  supplierId: string;
  supplierName?: string;
  invoiceNumber: string;
  notes?: string;
  receivedBy: string;
  totalItems: number;
  totalQuantity: number;
  totalCost: number;
  items: StockInItem[];
  createdAt: Date | string;
}

export interface InventoryApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
