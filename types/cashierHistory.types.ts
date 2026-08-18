import { Transaction, PaymentMethod } from './transaction.types';

export interface CashierSummary {
  totalTransactions: number;
  totalRevenue: number;
  averageBasketSize: number;
  cashTotal: number;
  nonCashTotal: number;
}

export interface CashierHistoryData {
  summary: CashierSummary;
  transactions: Transaction[];
  cashierInfo?: {
    uid: string;
    displayName: string;
    email: string;
  };
}

export interface CashierHistoryResponse {
  success: boolean;
  message?: string;
  data?: CashierHistoryData;
}

export interface CashierHistoryQueryParams {
  date?: string; // YYYY-MM-DD
  method?: PaymentMethod | 'ALL';
  search?: string;
  cashierId?: string; // Used by ADMIN to filter specific cashier
}
