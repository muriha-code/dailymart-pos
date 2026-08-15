import { Product, GetProductsParams, ApiResponse } from "@/types/product.types";

/**
 * Service Abstraction Layer for Products
 * Next.js Frontend -> /api/products Route Handlers -> Firestore
 */
export const productService = {
  /**
   * Fetch active products with optional search query & category filter
   */
  async getProducts(params?: GetProductsParams): Promise<Product[]> {
    const searchParams = new URLSearchParams();

    if (params?.search && params.search.trim() !== "") {
      searchParams.append("search", params.search.trim());
    }

    if (params?.categoryId && params.categoryId !== "all") {
      searchParams.append("categoryId", params.categoryId);
    }

    const queryString = searchParams.toString();
    const url = `/api/products${queryString ? `?${queryString}` : ""}`;

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
        // Ignore JSON parse error if response body is empty or non-JSON
      }
      throw new Error(errorMessage);
    }

    const result: ApiResponse<Product[]> = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Gagal mengambil data produk.");
    }

    return result.data || [];
  },
};
