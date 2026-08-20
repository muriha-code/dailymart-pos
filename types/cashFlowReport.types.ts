export interface CashFlowSummary {
  grossRevenue: number;
  totalCogs: number;
  grossProfit: number;
  marginPercentage: number;
}

export interface CashFlowChartItem {
  date: string;
  revenue: number;
  cogs: number;
  profit: number;
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
