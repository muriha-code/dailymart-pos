export interface CashFlowSummary {
  grossRevenue: number;
  totalCogs: number;
  grossProfit: number;
  totalOperatingExpenses?: number;
  totalPurchases?: number;
  netProfit?: number;
  marginPercentage: number;
}

export interface CashFlowChartItem {
  date: string;
  revenue: number;
  cogs: number;
  profit: number;
  operatingExpenses?: number;
  purchases?: number;
  netProfit?: number;
}

export interface CategoryProfitItem {
  name: string;
  value: number;
}

export interface DailyCashFlowBreakdown {
  date: string;
  formattedDate: string;
  transactionCount: number;
  grossRevenue: number;
  totalCogs: number;
  grossProfit: number;
  operatingExpenses?: number;
  purchases?: number;
  netProfit?: number;
  margin: number;
}

export interface CategoryFilterOption {
  id: string;
  name: string;
}

export interface CashFlowReportResponse {
  summary: CashFlowSummary;
  chartData: CashFlowChartItem[];
  categoryProfit: CategoryProfitItem[];
  dailyBreakdown: DailyCashFlowBreakdown[];
  categories: CategoryFilterOption[];
}

export interface CashFlowReportFilterParams {
  period?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
}
