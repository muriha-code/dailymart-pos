import {
  RestockRequestRecord,
  CreateRestockRequestPayload,
  RestockRequestSummary,
  GetRestockRequestsParams,
} from "@/types/restockRequest.types";

export interface RestockRequestsResponseData {
  data: RestockRequestRecord[];
  summary: RestockRequestSummary;
}

export const restockRequestService = {
  /**
   * Fetch list of restock request tickets and summary metrics
   */
  async getRestockRequests(params?: GetRestockRequestsParams): Promise<RestockRequestsResponseData> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set("search", params.search);
    if (params?.status) queryParams.set("status", params.status);
    if (params?.urgency) queryParams.set("urgency", params.urgency);

    const queryString = queryParams.toString();
    const url = `/api/warehouse/restock-requests${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let result: {
      success: boolean;
      data?: RestockRequestRecord[];
      summary?: RestockRequestSummary;
      message?: string;
    };

    try {
      result = await response.json();
    } catch {
      throw new Error(`HTTP Error ${response.status}: Gagal memproses respon server.`);
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || `Gagal mengambil daftar pengajuan restok (Status: ${response.status}).`
      );
    }

    return {
      data: result.data || [],
      summary: result.summary || {
        total: 0,
        pending: 0,
        approved: 0,
        completed: 0,
        rejected: 0,
      },
    };
  },

  /**
   * Submit new restock request ticket
   */
  async createRestockRequest(payload: CreateRestockRequestPayload): Promise<RestockRequestRecord> {
    const response = await fetch("/api/warehouse/restock-requests", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let result: {
      success: boolean;
      data?: RestockRequestRecord;
      message?: string;
    };

    try {
      result = await response.json();
    } catch {
      throw new Error(`HTTP Error ${response.status}: Gagal memproses respon server.`);
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || `Gagal membuat pengajuan restok (Status: ${response.status}).`
      );
    }

    if (!result.data) {
      throw new Error("Data pengajuan tidak dikembalikan dari server.");
    }

    return result.data;
  },

  /**
   * Trigger seeder data dummy restock request
   */
  async seedRestockRequests(): Promise<void> {
    const response = await fetch("/api/seed/restock-requests", {
      method: "POST",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Seeding gagal dengan HTTP Status: ${response.status}`);
    }
  },
};
