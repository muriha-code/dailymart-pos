export interface Product {
  id?: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  supplierId: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minimumStock: number;
  unit: string;
  imageUrl?: string;
  status: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}