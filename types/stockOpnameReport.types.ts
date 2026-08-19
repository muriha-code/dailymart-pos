export interface StockOpnameSummary {
  totalAudited: number;
  accuracyRate: number;
  totalLossRp: number;
  totalSurplusRp: number;
}

export interface StatusDistributionItem {
  name: string;
  value: number;
  color: string;
}

export interface TopDiscrepancyProduct {
  productName: string;
  discrepancyValue: number;
}

export interface StockOpnameAuditItem {
  id: string;
  auditCode: string;
  date: string;
  sku: string;
  productName: string;
  auditorName: string;
  systemStock: number;
  physicalStock: number;
  diff: number;
  impactValueRp: number;
  notes: string;
  reason?: string;
  categoryName?: string;
}

export interface StockOpnameReportFilterParams {
  period?: 'today' | '7days' | 'thisMonth' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  statusFilter?: 'ALL' | 'MATCHED' | 'DEFICIT' | 'SURPLUS';
  search?: string;
}

export interface StockOpnameReportResponse {
  summary: StockOpnameSummary;
  statusDistribution: StatusDistributionItem[];
  topDiscrepancies: TopDiscrepancyProduct[];
  audits: StockOpnameAuditItem[];
}
