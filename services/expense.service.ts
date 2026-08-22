import {
  OperatingExpense,
  CreateExpensePayload,
  GetExpensesParams,
  ExpenseApiResponse,
} from "@/types/expense.types";

/**
 * Service Abstraction Layer for Operating Expenses
 * Frontend -> /api/expenses Route Handlers -> Cloud Firestore
 */
export const expenseService = {
  /**
   * Fetch operating expenses with optional period, date range, and category filter
   */
  async getExpenses(params?: GetExpensesParams): Promise<OperatingExpense[]> {
    const searchParams = new URLSearchParams();

    if (params?.period) {
      searchParams.append("period", params.period);
    }
    if (params?.startDate) {
      searchParams.append("startDate", params.startDate);
    }
    if (params?.endDate) {
      searchParams.append("endDate", params.endDate);
    }
    if (params?.category && params.category !== "ALL") {
      searchParams.append("category", params.category);
    }
    if (params?.search && params.search.trim() !== "") {
      searchParams.append("search", params.search.trim());
    }

    const queryString = searchParams.toString();
    const url = `/api/expenses${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson?.message) {
          errorMessage = errorJson.message;
        }
      } catch {
        // Ignore JSON parse error
      }
      throw new Error(errorMessage);
    }

    const result: ExpenseApiResponse<OperatingExpense[]> = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Gagal mengambil data biaya operasional.");
    }

    return result.data || [];
  },

  /**
   * Create / Record a new operating expense
   */
  async createExpense(payload: CreateExpensePayload): Promise<OperatingExpense> {
    const response = await fetch("/api/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result: ExpenseApiResponse<OperatingExpense> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal mencatat biaya operasional.");
    }

    if (!result.data) {
      throw new Error("Data biaya operasional tidak dikembalikan dari server.");
    }

    return result.data;
  },
};
