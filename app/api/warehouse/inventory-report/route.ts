import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore";
import { InventoryReportItem, InventoryReportSummary } from "@/types/inventoryReport.types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase().trim();
  const categoryFilter = searchParams.get("category")?.trim();
  const period = searchParams.get("period") || "all";

  try {
    const snapshot = await adminDb
      .collection("inventory_reports")
      .get();

    let allItems: InventoryReportItem[] = snapshot.docs.map(
      (doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        let lastUpdatedIso: string;
        if (data.lastUpdated?.toDate) {
          lastUpdatedIso = data.lastUpdated.toDate().toISOString();
        } else if (typeof data.lastUpdated === "string") {
          lastUpdatedIso = data.lastUpdated;
        } else {
          lastUpdatedIso = new Date().toISOString();
        }

        const initialStock = Number(data.initialStock ?? 0);
        const stockIn = Number(data.stockIn ?? 0);
        const stockOut = Number(data.stockOut ?? 0);
        const opnameDiff = Number(data.opnameDiff ?? 0);
        const stockReturn = Number(data.stockReturn ?? 0);
        const finalStock =
          data.finalStock !== undefined
            ? Number(data.finalStock)
            : initialStock + stockIn - stockOut + opnameDiff - stockReturn;

        return {
          id: doc.id,
          productId: String(data.productId || doc.id),
          productName: String(data.productName || "Produk"),
          sku: String(data.sku || ""),
          categoryName: String(data.categoryName || data.category || "Umum"),
          unit: String(data.unit || "Pcs"),
          initialStock,
          stockIn,
          stockOut,
          opnameDiff,
          stockReturn,
          finalStock,
          lastUpdated: lastUpdatedIso,
        };
      }
    );

    // Apply Filters
    if (search) {
      allItems = allItems.filter(
        (item) =>
          item.productName.toLowerCase().includes(search) ||
          item.sku.toLowerCase().includes(search) ||
          item.categoryName.toLowerCase().includes(search)
      );
    }

    if (categoryFilter && categoryFilter !== "ALL") {
      allItems = allItems.filter(
        (item) => item.categoryName.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Summary Metrics
    const summary: InventoryReportSummary = {
      totalStockIn: allItems.reduce((acc, curr) => acc + curr.stockIn, 0),
      totalStockOut: allItems.reduce((acc, curr) => acc + curr.stockOut, 0),
      netOpnameDiff: allItems.reduce((acc, curr) => acc + curr.opnameDiff, 0),
      totalStockReturn: allItems.reduce((acc, curr) => acc + curr.stockReturn, 0),
    };

    return NextResponse.json({
      success: true,
      data: allItems,
      summary,
      totalCount: allItems.length,
    });
  } catch (error: any) {
    console.error("[API /api/warehouse/inventory-report Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal mengambil data Laporan Inventaris.",
      },
      { status: 500 }
    );
  }
}
