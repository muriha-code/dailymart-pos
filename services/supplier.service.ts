import { Supplier, SupplierResponse } from "@/types/supplier.types";

export const supplierService = {
  /**
   * Fetch supplier list from database API
   */
  async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await fetch("/api/suppliers", {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const result: SupplierResponse = await response.json();
      return result.data || [];
    } catch (err) {
      console.warn("Gagal memuat data supplier dari database:", err);
      return [
        { id: "sup_indofood", name: "PT Indofood Sukses Makmur Tbk" },
        { id: "sup_wings", name: "Wings Surya Group" },
        { id: "sup_unilever", name: "PT Unilever Indonesia Tbk" },
        { id: "sup_mayora", name: "PT Mayora Indah Tbk" },
        { id: "sup_frisian", name: "PT Frisian Flag Indonesia" },
        { id: "sup_kalbe", name: "PT Kalbe Farma Tbk" },
        { id: "sup_lotte", name: "PT Lotte Indonesia" },
      ];
    }
  },
};
