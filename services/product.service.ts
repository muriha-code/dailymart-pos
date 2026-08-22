import { Product, GetProductsParams, ApiResponse } from "@/types/product.types";

/**
 * Service Abstraction Layer for Products
 * Next.js Frontend -> /api/products Route Handlers -> Cloud Firestore
 */
export const productService = {
  /**
   * Fetch products with optional search query, category filter, and status filter
   */
  async getProducts(params?: GetProductsParams): Promise<Product[]> {
    const searchParams = new URLSearchParams();

    if (params?.search && params.search.trim() !== "") {
      searchParams.append("search", params.search.trim());
    }

    if (params?.categoryId && params.categoryId !== "all") {
      searchParams.append("categoryId", params.categoryId);
    }

    if (params?.status && params.status !== "all") {
      searchParams.append("status", params.status);
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

  /**
   * Create a new product in master catalog
   */
  async createProduct(productData: Omit<Product, "id">): Promise<Product> {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productData),
    });

    const result: ApiResponse<Product> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal membuat produk baru.");
    }

    if (!result.data) {
      throw new Error("Data produk tidak dikembalikan dari server.");
    }

    return result.data;
  },

  /**
   * Update existing product details by ID
   */
  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    const response = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productData),
    });

    const result: ApiResponse<Product> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal memperbarui data produk.");
    }

    if (!result.data) {
      throw new Error("Data produk tidak dikembalikan dari server.");
    }

    return result.data;
  },

  /**
   * Toggle product status ('active' | 'inactive')
   */
  async toggleProductStatus(id: string, newStatus: "active" | "inactive"): Promise<Product> {
    const response = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });

    const result: ApiResponse<Product> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal mengubah status produk.");
    }

    if (!result.data) {
      throw new Error("Data produk tidak dikembalikan dari server.");
    }

    return result.data;
  },

  /**
   * Permanently delete a single product (Firestore + Cloudinary)
   */
  async deleteProduct(
    id: string,
    options?: { sku?: string; imageUrl?: string; categoryId?: string; categoryName?: string }
  ): Promise<void> {
    const response = await fetch("/api/admin/products/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: id,
        sku: options?.sku,
        imageUrl: options?.imageUrl,
        category: options?.categoryName || options?.categoryId,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal menghapus produk permanen.");
    }
  },

  /**
   * Permanently delete multiple products in bulk (Firestore + Cloudinary)
   */
  async deleteProductsBulk(
    items: Array<{ productId: string; sku?: string; imageUrl?: string; categoryId?: string; categoryName?: string }>
  ): Promise<void> {
    const response = await fetch("/api/admin/products/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal menghapus produk terpilih.");
    }
  },

  /**
   * Fetch restock / purchase history for a specific product
   */
  async getProductPurchases(productId: string): Promise<any[]> {
    const response = await fetch(`/api/products/${productId}/purchases`, {
      method: "GET",
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal mengambil riwayat pembelian produk.");
    }

    return result.data || [];
  },
};
