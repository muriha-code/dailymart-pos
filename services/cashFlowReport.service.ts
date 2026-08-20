import {
  CashFlowReportFilterParams,
  CashFlowReportResponse,
} from '@/types/cashFlowReport.types';

export const cashFlowReportService = {
  /**
   * Mengambil data Laporan Arus Kas & Pendapatan Admin berdasarkan filter
   */
  async getCashFlowReport(
    filters?: CashFlowReportFilterParams
  ): Promise<CashFlowReportResponse> {
    const query = new URLSearchParams();

    if (filters?.period) query.append('period', filters.period);
    if (filters?.startDate) query.append('startDate', filters.startDate);
    if (filters?.endDate) query.append('endDate', filters.endDate);
    if (filters?.categoryId) query.append('categoryId', filters.categoryId);

    const res = await fetch(`/api/admin/reports/cash-flow?${query.toString()}`, {
      cache: 'no-store',
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memuat laporan arus kas.');
    }

    return json.data;
  },
};
