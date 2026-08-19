import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import type { QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore";

export type StockAlertUrgency = "HABIS" | "KRITIS" | "MENIPIS";

export interface StockAlertItem {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  supplierId?: string;
  supplierName?: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  urgency: StockAlertUrgency;
  suggestedRestockQty: number;
}

export interface StockAlertSummary {
  totalCritical: number;
  outOfStock: number;
  criticalStock: number;
  lowStock: number;
  mostImpactedCategory: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase().trim();
  const urgencyFilter = searchParams.get("urgency")?.toUpperCase().trim();
  const categoryIdFilter = searchParams.get("categoryId")?.trim();

  try {
    const productsSnapshot = await adminDb.collection("products").get();

    const allLowStockItems: StockAlertItem[] = [];
    const categoryCounts: Record<string, number> = {};

    productsSnapshot.docs.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();

      // Only check active products or default to active
      if (data.status === "inactive") return;

      const stock = Number(data.stock ?? 0);
      const minStock = Number(data.minimumStock ?? data.minStock ?? 10);

      // Kriteria Item Alert: stock <= minStock
      if (stock <= minStock) {
        let urgency: StockAlertUrgency;
        if (stock === 0) {
          urgency = "HABIS";
        } else if (stock <= Math.floor(minStock / 2)) {
          urgency = "KRITIS";
        } else {
          urgency = "MENIPIS";
        }

        // Hitung restok yang disarankan (misal target membawa stok kembali ke setidaknya 2x minStock)
        const targetStock = Math.max(minStock * 2, minStock + 10);
        const suggestedRestockQty = Math.max(1, targetStock - stock);

        const categoryName = String(data.categoryName || "Umum");

        allLowStockItems.push({
          id: doc.id,
          sku: String(data.sku || ""),
          barcode: data.barcode ? String(data.barcode) : undefined,
          name: String(data.name || "Tanpa Nama"),
          categoryId: String(data.categoryId || ""),
          categoryName,
          supplierId: data.supplierId ? String(data.supplierId) : undefined,
          supplierName: data.supplierName ? String(data.supplierName) : undefined,
          purchasePrice: Number(data.purchasePrice ?? 0),
          sellingPrice: Number(data.sellingPrice ?? 0),
          stock,
          minStock,
          unit: String(data.unit || "Pcs"),
          urgency,
          suggestedRestockQty,
        });

        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      }
    });

    // Kalkulasi Kategori Paling Terdampak
    let mostImpactedCategory = "-";
    let maxCount = 0;
    Object.entries(categoryCounts).forEach(([catName, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostImpactedCategory = catName;
      }
    });

    // Summary Metrics (sebelum filter UI)
    const summary: StockAlertSummary = {
      totalCritical: allLowStockItems.length,
      outOfStock: allLowStockItems.filter((i) => i.urgency === "HABIS").length,
      criticalStock: allLowStockItems.filter((i) => i.urgency === "KRITIS").length,
      lowStock: allLowStockItems.filter((i) => i.urgency === "MENIPIS").length,
      mostImpactedCategory: maxCount > 0 ? `${mostImpactedCategory} (${maxCount} SKU)` : "-",
    };

    // Apply Client/Query Filters
    let filteredItems = allLowStockItems;

    // 1. Filter Urgensi (HABIS, KRITIS, MENIPIS)
    if (urgencyFilter && ["HABIS", "KRITIS", "MENIPIS"].includes(urgencyFilter)) {
      filteredItems = filteredItems.filter((item) => item.urgency === urgencyFilter);
    }

    // 2. Filter Kategori
    if (categoryIdFilter && categoryIdFilter !== "ALL") {
      filteredItems = filteredItems.filter((item) => item.categoryId === categoryIdFilter);
    }

    // 3. Filter Search (SKU, Nama, Kategori)
    if (search) {
      filteredItems = filteredItems.filter(
        (item) =>
          item.sku.toLowerCase().includes(search) ||
          item.name.toLowerCase().includes(search) ||
          (item.categoryName && item.categoryName.toLowerCase().includes(search))
      );
    }

    // Urutkan data berdasarkan prioritas: HABIS dahulu, kemudian KRITIS, lalu MENIPIS
    const urgencyWeight: Record<StockAlertUrgency, number> = {
      HABIS: 1,
      KRITIS: 2,
      MENIPIS: 3,
    };
    filteredItems.sort((a, b) => urgencyWeight[a.urgency] - urgencyWeight[b.urgency]);

    return NextResponse.json(
      {
        success: true,
        data: {
          items: filteredItems,
          summary,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API /api/warehouse/stock-alerts GET Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal mengambil data peringatan stok minimum.",
      },
      { status: 500 }
    );
  }
}
