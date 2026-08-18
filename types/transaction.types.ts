export type PaymentMethod = 'CASH' | 'QRIS' | 'DEBIT' | 'CREDIT' | 'TRANSFER';

export type TransactionStatus = 'COMPLETED' | 'CANCELLED';

export interface TransactionItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

export interface Transaction {
  id?: string;
  transactionNumber: string;
  cashierId: string;
  cashierName?: string;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  change: number;
  status: TransactionStatus;
  createdAt: Date | string;
}

export interface CreateTransactionPayload {
  items: TransactionItem[];
  paymentMethod: PaymentMethod;
  paidAmount: number;
  subtotal: number;
  discount: number;
  total: number;
  cashierId?: string;
  cashierName?: string;
}

export interface TransactionApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
