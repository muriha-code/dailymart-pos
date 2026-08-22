export interface Product {
  id?: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  supplierId?: string;
  // HPP & Retail Cost Breakdown Fields
  purchasePrice: number; // Base purchase price per selling unit (HPP dasar)
  supplierPrice?: number; // Raw supplier price before discount/additional cost
  purchaseDiscount?: number; // Discount per unit from supplier
  additionalCost?: number; // Shipping, handling, or other per-unit direct costs
  purchaseUnit?: string; // e.g. "Karton", "Dus", "Pack", "Pcs"
  conversionQty?: number; // e.g. 24 bottles per karton (default 1)
  purchaseUnitCost?: number; // e.g. Rp 60.000 / karton
  costPrice?: number; // Calculated net HPP per unit = (purchasePrice/conversionQty) - discount + additionalCost
  markupPercentage?: number; // Markup % set by admin (e.g. 20%)
  recommendedPrice?: number; // Recommended selling price based on markup
  sellingPrice: number; // Actual retail selling price
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
  status?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}