import { PaymentMethod } from '@/types/transaction.types';

export interface SalesReportSummary {
  totalRevenue: number;
  totalTransactions: number;
  totalItemsSold: number;
  averageTransactionValue: number;
}

export interface PaymentMethodBreakdown {
  method: PaymentMethod;
  amount: number;
  count: number;
  percentage: number;
}

export interface TopSellingProduct {
  productId: string;
  sku: string;
  productName: string;
  categoryName?: string;
  quantitySold: number;
  totalRevenue: number;
}

export interface DailySalesChartData {
  date: string;
  revenue: number;
  transactions: number;
}

export interface TransactionReportItemDetail {
  productId: string;
  sku: string;
  productName: string;
  categoryName?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface TransactionReportItem {
  id: string;
  invoiceNumber: string;
  date: string;
  createdAt?: string;
  cashierName: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountTotal: number;
  grandTotal: number;
  itemsCount: number;
  items?: TransactionReportItemDetail[];
}

export interface SalesReportFilterParams {
  period?: 'all' | 'today' | '7days' | '30days' | 'thisMonth' | 'thisYear' | 'custom';
  startDate?: string;
  endDate?: string;
  cashierId?: string;
  paymentMethod?: string;
}

export interface SalesReportResponse {
  summary: SalesReportSummary;
  dailyChart: DailySalesChartData[];
  paymentBreakdown: PaymentMethodBreakdown[];
  topProducts: TopSellingProduct[];
  transactions: TransactionReportItem[];
}
