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
  quantity: number; // Angka negatif saat SALE (misal: -5)
  referenceId: string; // ID transaksi atau referensi dokumen
  performedBy: string; // ID kasir / pengguna
  createdAt: Date | string;
}
