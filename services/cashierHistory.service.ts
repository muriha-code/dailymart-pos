import {
  CashierHistoryQueryParams,
  CashierHistoryResponse,
  CashierHistoryData,
} from "@/types/cashierHistory.types";

/**
 * Service Layer untuk Riwayat Transaksi & Ringkasan Kasir
 * Menghubungkan UI Kasir (/cashier/history) ke Backend API (/api/cashier/history)
 */
export const cashierHistoryService = {
  /**
   * Mengambil data ringkasan penjualan kasir dan daftar transaksi
   */
  async getCashierHistory(
    params?: CashierHistoryQueryParams
  ): Promise<CashierHistoryData> {
    const queryParams = new URLSearchParams();

    if (params?.date) {
      queryParams.append("date", params.date);
    }
    if (params?.method && params.method !== "ALL") {
      queryParams.append("method", params.method);
    }
    if (params?.search && params.search.trim() !== "") {
      queryParams.append("search", params.search.trim());
    }
    if (params?.cashierId && params.cashierId !== "ALL") {
      queryParams.append("cashierId", params.cashierId);
    }

    const queryString = queryParams.toString();
    const url = `/api/cashier/history${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let result: CashierHistoryResponse;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        `HTTP Error ${response.status}: Failed to parse server response.`
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          `Gagal mengambil data riwayat kasir (Status: ${response.status}).`
      );
    }

    if (!result.data) {
      throw new Error("Data riwayat kasir tidak ditemukan pada respon server.");
    }

    return result.data;
  },
};
