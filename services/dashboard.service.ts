import { DashboardData, DashboardApiResponse } from '@/types/dashboard.types';

export const dashboardService = {
  /**
   * Fetch analytics summary data for the Admin Dashboard.
   * Uses cache: 'no-store' to guarantee fresh realtime data on each call.
   */
  async getSummary(): Promise<DashboardData> {
    const response = await fetch('/api/admin/dashboard', {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Gagal mengambil data dashboard analytics (Status: ${response.status})`);
    }

    const result: DashboardApiResponse = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.message || 'Terjadi kesalahan saat memproses data dashboard.');
    }

    return result.data;
  },
};
