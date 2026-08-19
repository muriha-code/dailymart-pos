import { StockAlertItem, StockAlertSummary } from "@/app/api/warehouse/stock-alerts/route";

export interface GetStockAlertsParams {
  search?: string;
  urgency?: string;
  categoryId?: string;
}

export interface StockAlertsResponseData {
  items: StockAlertItem[];
  summary: StockAlertSummary;
}

export const stockAlertService = {
  /**
   * Fetch low stock items and KPI summary metrics from API
   */
  async getStockAlerts(params?: GetStockAlertsParams): Promise<StockAlertsResponseData> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set("search", params.search);
    if (params?.urgency) queryParams.set("urgency", params.urgency);
    if (params?.categoryId) queryParams.set("categoryId", params.categoryId);

    const queryString = queryParams.toString();
    const url = `/api/warehouse/stock-alerts${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let result: {
      success: boolean;
      data?: StockAlertsResponseData;
      message?: string;
    };

    try {
      result = await response.json();
    } catch {
      throw new Error(`HTTP Error ${response.status}: gagal memproses respon server.`);
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || `Gagal mengambil data peringatan stok (Status: ${response.status}).`
      );
    }

    if (!result.data) {
      throw new Error("Data peringatan stok tidak ditemukan.");
    }

    return result.data;
  },
};
