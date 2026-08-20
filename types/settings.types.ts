export interface StoreSettings {
  storeName: string;
  storeBranch: string;
  storeAddress: string;
  storePhone: string;
  storeEmail: string;
  enableTax: boolean;
  taxRate: number;
  currencySymbol: string;
  defaultMinStockAlert: number;
  autoHideOutOfStock: boolean;
  receiptPaperWidth: '58mm' | '80mm';
  receiptHeaderNote: string;
  receiptFooterNote: string;
  showCashierName: boolean;
  showTaxDetails: boolean;
  updatedAt?: string | Date;
}

export interface SettingsApiResponse {
  success: boolean;
  message?: string;
  data?: StoreSettings;
}
