import {
  InventoryReportItem,
  InventoryReportSummary,
  InventoryReportParams,
} from '@/types/inventoryReport.types';

export const inventoryReportService = {
  /**
   * Fetch Laporan Inventaris & Rekap Mutasi Stok
   */
  async getInventoryReport(params?: InventoryReportParams): Promise<{
    data: InventoryReportItem[];
    summary: InventoryReportSummary;
    totalCount: number;
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.category) query.append('category', params.category);
    if (params?.period) query.append('period', params.period);

    const res = await fetch(`/api/warehouse/inventory-report?${query.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Gagal memuat laporan inventaris.');
    }

    return res.json();
  },

  /**
   * Trigger Seeder Data Dummy Inventaris
   */
  async seedInventoryReport(): Promise<void> {
    const res = await fetch('/api/seed/inventory-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Gagal melakukan seeding data inventaris.');
    }
  },
};
