import {
  SalesReportFilterParams,
  SalesReportResponse,
} from '@/types/salesReport.types';
import { safeParseDate } from '@/lib/utils/date';

export const salesReportService = {
  /**
   * Mengambil data Laporan Penjualan & Analitik berdasarkan filter
   */
  async getSalesReport(filters?: SalesReportFilterParams): Promise<SalesReportResponse> {
    const query = new URLSearchParams();

    if (filters?.period && (filters.period as any) !== 'undefined') {
      query.append('period', String(filters.period));
    }

    if (filters?.startDate && filters.startDate !== 'undefined' && String(filters.startDate).trim() !== '') {
      const parsedStart = safeParseDate(filters.startDate);
      query.append('startDate', parsedStart.toISOString());
    }

    if (filters?.endDate && filters.endDate !== 'undefined' && String(filters.endDate).trim() !== '') {
      const parsedEnd = safeParseDate(filters.endDate);
      query.append('endDate', parsedEnd.toISOString());
    }

    if (filters?.cashierId && filters.cashierId !== 'undefined' && filters.cashierId !== 'ALL') {
      query.append('cashierId', String(filters.cashierId));
    }

    if (filters?.paymentMethod && filters.paymentMethod !== 'undefined' && filters.paymentMethod !== 'ALL') {
      query.append('paymentMethod', String(filters.paymentMethod));
    }

    const queryString = query.toString();
    const url = `/api/admin/reports/sales${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
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
