import {
  AuditSubmissionPayload,
  StockAuditQueryParams,
  StockAuditRecord,
  StockAuditResponse,
} from "@/types/stockAudit.types";

/**
 * Frontend Service Layer for Stock Audit & Verification
 * Connects UI components to Next.js API Routes (/api/warehouse/stock-audit)
 */
export const stockAuditService = {
  /**
   * Fetch historical stock audit records
   */
  async getStockAuditHistory(
    params?: StockAuditQueryParams
  ): Promise<StockAuditRecord[]> {
    const searchParams = new URLSearchParams();

    if (params?.search && params.search.trim() !== "") {
      searchParams.append("search", params.search.trim());
    }
    if (params?.date && params.date.trim() !== "") {
      searchParams.append("date", params.date.trim());
    }

    const queryString = searchParams.toString();
    const url = `/api/warehouse/stock-audit${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let result: StockAuditResponse;

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
          `Gagal mengambil riwayat verifikasi stok (Status: ${response.status}).`
      );
    }

    return (result.data as StockAuditRecord[]) || [];
  },

  /**
   * Submit physical stock audit verification (Stock Opname)
   * Executes atomic inventory adjustment and stock updates
   */
  async submitStockAudit(
    payload: AuditSubmissionPayload
  ): Promise<StockAuditRecord> {
    const response = await fetch("/api/warehouse/stock-audit", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let result: StockAuditResponse;

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
          `Gagal memproses verifikasi stok (Status: ${response.status}).`
      );
    }

    if (!result.data) {
      throw new Error("Data verifikasi stok tidak ditemukan pada respon server.");
    }

    return result.data as StockAuditRecord;
  },
};
