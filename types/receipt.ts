export type ReceiptPaperSize = "58mm" | "80mm";

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  discount?: number;
}

export interface ReceiptData {
  storeName: string;
  storeBranch?: string;
  storeAddress?: string;
  storePhone?: string;
  transactionNumber: string;
  date: string;
  time: string;
  cashierName: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  change: number;
  footerMessage?: string;
  version?: string;
  paperSize?: ReceiptPaperSize;
}

