import {
  SalesReportFilterParams,
  SalesReportResponse,
} from '@/types/salesReport.types';

export const salesReportService = {
  /**
   * Mengambil data Laporan Penjualan & Analitik berdasarkan filter
   */
  async getSalesReport(filters?: SalesReportFilterParams): Promise<SalesReportResponse> {
    const query = new URLSearchParams();

    if (filters?.period) query.append('period', filters.period);
    if (filters?.startDate) query.append('startDate', filters.startDate);
    if (filters?.endDate) query.append('endDate', filters.endDate);
    if (filters?.cashierId) query.append('cashierId', filters.cashierId);
    if (filters?.paymentMethod) query.append('paymentMethod', filters.paymentMethod);

    const res = await fetch(`/api/admin/reports/sales?${query.toString()}`, {
      cache: 'no-store',
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memuat laporan penjualan.');
    }

    return json.data;
  },

  /**
   * Menjalankan seeder sampel transaksi
   */
  async seedTransactions(): Promise<void> {
    const res = await fetch('/api/seed/transactions', {
      method: 'POST',
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal membuat data transaksi sampel.');
    }
  },
};
