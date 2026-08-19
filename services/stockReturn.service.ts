import {
  CreateReturnPayload,
  StockReturnQueryParams,
  StockReturnRecord,
  StockReturnResponse,
} from "@/types/stockReturn.types";

/**
 * Frontend Service Layer for Stock Returns & Damaged Items
 * Connects UI components to Next.js API Routes (/api/warehouse/returns)
 */
export const stockReturnService = {
  /**
   * Fetch historical stock returns & damaged records
   */
  async getStockReturns(
    params?: StockReturnQueryParams
  ): Promise<StockReturnRecord[]> {
    const searchParams = new URLSearchParams();

    if (params?.search && params.search.trim() !== "") {
      searchParams.append("search", params.search.trim());
    }
    if (params?.type && params.type !== "ALL") {
      searchParams.append("type", params.type);
    }
    if (params?.reason && params.reason !== "ALL") {
      searchParams.append("reason", params.reason);
    }
    if (params?.date && params.date.trim() !== "") {
      searchParams.append("date", params.date.trim());
    }

    const queryString = searchParams.toString();
    const url = `/api/warehouse/returns${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let result: StockReturnResponse;

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
          `Gagal mengambil riwayat retur & barang rusak (Status: ${response.status}).`
      );
    }

    return (result.data as StockReturnRecord[]) || [];
  },

  /**
   * Submit a new stock return or disposal record
   * Executes atomic inventory deduction and stock returns creation
   */
  async createStockReturn(
    payload: CreateReturnPayload
  ): Promise<StockReturnRecord> {
    const response = await fetch("/api/warehouse/returns", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let result: StockReturnResponse;

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
          `Gagal memproses pencatatan retur (Status: ${response.status}).`
      );
    }

    if (!result.data) {
      throw new Error("Data transaksi retur tidak ditemukan pada respon server.");
    }

    return result.data as StockReturnRecord;
  },
};
