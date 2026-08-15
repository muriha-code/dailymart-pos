export interface Product {
  id?: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  supplierId?: string;
  purchasePrice: number;
  sellingPrice: number;
  originalPrice?: number;
  discountAmount?: number;
  discountPercentage?: number;
  stock: number;
  minimumStock: number;
  unit: string;
  imageUrl?: string;
  status: 'active' | 'inactive';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface GetProductsParams {
  search?: string;
  categoryId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}