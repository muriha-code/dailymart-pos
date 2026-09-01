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
   * Menerima parameter opsional cashierId, search, date, method.
   * Jika cashierId tidak dikirim atau bernilai "ALL", ambil seluruh transaksi kasir.
   */
  async getTransactions(params?: {
    search?: string;
    cashierId?: string;
    date?: string;
    method?: string;
  }): Promise<Transaction[]> {
    const searchParams = new URLSearchParams();
    if (params?.search && params.search.trim() !== "") {
      searchParams.append("search", params.search.trim());
    }
    if (
      params?.cashierId &&
      params.cashierId !== "ALL" &&
      params.cashierId.trim() !== ""
    ) {
      searchParams.append("cashierId", params.cashierId.trim());
    }
    if (params?.date && params.date.trim() !== "") {
      searchParams.append("date", params.date.trim());
    }
    if (
      params?.method &&
      params.method !== "ALL" &&
      params.method.trim() !== ""
    ) {
      searchParams.append("method", params.method.trim());
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

  /**
   * Mengambil detail satu transaksi berdasarkan ID atau Nomor Transaksi
   */
  async getTransactionById(id: string): Promise<Transaction> {
    const response = await fetch(`/api/transactions/${encodeURIComponent(id)}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    let result: TransactionApiResponse<Transaction>;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        `HTTP Error ${response.status}: Gagal memproses respons server.`
      );
    }

    if (!response.ok || !result.success || !result.data) {
      throw new Error(
        result.message || `Transaksi "${id}" tidak ditemukan.`
      );
    }

    return result.data;
  },
};

