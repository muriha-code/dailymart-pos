import {
  StockInPayload,
  StockInLog,
  InventoryApiResponse,
} from "@/types/inventory.types";

/**
 * Service Abstraction Layer for Inventory Operations
 * Frontend -> /api/inventory Route Handlers -> Cloud Firestore
 */
export const inventoryService = {
  /**
   * Submit inbound restock / penerimaan barang masuk
   */
  async submitStockIn(payload: StockInPayload): Promise<StockInLog> {
    const response = await fetch("/api/inventory/stock-in", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let result: InventoryApiResponse<StockInLog>;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        `HTTP Error ${response.status}: Failed to parse server response.`
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || `Gagal mencatat penerimaan barang (Status: ${response.status}).`
      );
    }

    if (!result.data) {
      throw new Error("Data hasil restock tidak dikembalikan dari server.");
    }

    return result.data;
  },
};
