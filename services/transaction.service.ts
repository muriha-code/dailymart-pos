import {
  Transaction,
  CreateTransactionPayload,
  TransactionApiResponse,
} from "@/types/transaction.types";

/**
 * Frontend Service Layer for Transactions
 * Connects UI components to Next.js API Routes (/api/transactions)
 */
export const transactionService = {
  /**
   * Fetch transaction history
   */
  async getTransactions(params?: { search?: string }): Promise<Transaction[]> {
    const searchParams = new URLSearchParams();
    if (params?.search && params.search.trim() !== "") {
      searchParams.append("search", params.search.trim());
    }

    const queryString = searchParams.toString();
    const url = `/api/transactions${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let result: TransactionApiResponse<Transaction[]>;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        `HTTP Error ${response.status}: Failed to parse server response.`
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || `Gagal mengambil riwayat transaksi (Status: ${response.status}).`
      );
    }

    return result.data || [];
  },

  /**
   * Submit a new sale transaction (Checkout Flow)
   * Executes atomic inventory deduction and transaction creation
   */
  async createTransaction(
    payload: CreateTransactionPayload
  ): Promise<Transaction> {
    const response = await fetch("/api/transactions", {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    let result: TransactionApiResponse<Transaction>;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        `HTTP Error ${response.status}: Failed to parse server response.`
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || `Gagal memproses transaksi (Status: ${response.status}).`
      );
    }

    if (!result.data) {
      throw new Error("Data transaksi tidak ditemukan pada respon server.");
    }

    return result.data;
  },
};
