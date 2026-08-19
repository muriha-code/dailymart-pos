import {
  StockOpnameReportFilterParams,
  StockOpnameReportResponse,
} from '@/types/stockOpnameReport.types';

export const stockOpnameReportService = {
  /**
   * Mengambil data Laporan Stock Opname berdasarkan filter
   */
  async getStockOpnameReport(filters?: StockOpnameReportFilterParams): Promise<StockOpnameReportResponse> {
    const query = new URLSearchParams();

    if (filters?.period) query.append('period', filters.period);
    if (filters?.startDate) query.append('startDate', filters.startDate);
    if (filters?.endDate) query.append('endDate', filters.endDate);
    if (filters?.statusFilter) query.append('statusFilter', filters.statusFilter);
    if (filters?.search) query.append('search', filters.search);

    const res = await fetch(`/api/admin/reports/stock-opname?${query.toString()}`, {
      cache: 'no-store',
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memuat laporan stock opname.');
    }

    return json.data;
  },

  /**
   * Menjalankan seeder sampel audit stok
   */
  async seedStockAudits(): Promise<void> {
    const res = await fetch('/api/seed/stock-audits', {
      method: 'POST',
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal melakukan seeding data audit stok.');
    }
  },
};
