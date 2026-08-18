export interface DashboardMetrics {
  todayRevenue: number;
  todayOrders: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockCount: number;
}

export interface ChartDataPoint {
  date: string;
  dayName: string;
  revenue: number;
  orders: number;
}

export interface TopProductItem {
  id: string;
  name: string;
  sku: string;
  categoryName?: string;
  quantity: number;
  revenue: number;
}

export interface LowStockProductItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minimumStock: number;
  unit: string;
  categoryName?: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  chartData: ChartDataPoint[];
  topProducts: TopProductItem[];
  lowStockProducts: LowStockProductItem[];
}

export interface DashboardApiResponse {
  success: boolean;
  data?: DashboardData;
  message?: string;
  warning?: string;
}
