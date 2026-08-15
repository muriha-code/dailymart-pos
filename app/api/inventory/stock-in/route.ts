import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { StockInPayload } from "@/types/inventory.types";

/**
 * Generates automatic invoice number for stock in: IN-YYYYMMDD-XXXX
 * Example: IN-20260815-5829
 */
function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
  return `IN-${dateStr}-${randomCode}`;
}

// POST /api/inventory/stock-in -> Record Inbound Restock with Firestore Atomic Transaction
export async function POST(req: NextRequest) {
  try {
    const body: StockInPayload = await req.json();
    const { supplierId, supplierName, notes, receivedBy, items } = body;
    let invoiceNumber = body.invoiceNumber?.trim();

    // 1. Validasi Payload Dasar
    if (!supplierId || supplierId.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Supplier wajib dipilih." },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Daftar barang masuk tidak boleh kosong." },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.productId) {
        return NextResponse.json(
          { success: false, message: "Product ID item tidak valid." },
          { status: 400 }
        );
      }
      if (!item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Kuantitas barang masuk untuk ${item.productName || item.productId} harus lebih dari 0.`,
          },
          { status: 400 }
        );
      }
      if (item.purchasePrice == null || item.purchasePrice < 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Harga beli barang masuk untuk ${item.productName || item.productId} tidak valid.`,
          },
          { status: 400 }
        );
      }
    }

    if (!invoiceNumber) {
      invoiceNumber = generateInvoiceNumber();
    }

    const now = new Date();
    const staffName = receivedBy?.trim() || "Staff Gudang";

    // 2. Jalankan Firestore Atomic Transaction
    const stockInResult = await adminDb.runTransaction(async (transaction) => {
      // PHASE A: ALL READS FIRST (Memeriksa dokumen produk)
      const productSnapshotsMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();

      for (const item of items) {
        const productRef = adminDb.collection("products").doc(item.productId);
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists) {
          throw new Error(
            `Produk "${item.productName || item.productId}" tidak ditemukan di database.`
          );
        }

        productSnapshotsMap.set(item.productId, productSnap);
      }

      // PHASE B: ALL WRITES AFTER READS
      // 1. Simpan Log Penerimaan Barang Utama (stock_in_logs)
      const stockInLogRef = adminDb.collection("stock_in_logs").doc();
      const totalItems = items.length;
      const totalQuantity = items.reduce((sum, i) => sum + Number(i.quantity), 0);
      const totalCost = items.reduce(
        (sum, i) => sum + Number(i.quantity) * Number(i.purchasePrice),
        0
      );

      const stockInLogData = {
        supplierId: String(supplierId),
        supplierName: String(supplierName || supplierId),
        invoiceNumber: String(invoiceNumber),
        notes: String(notes || ""),
        receivedBy: staffName,
        totalItems,
        totalQuantity,
        totalCost,
        items: items.map((i) => ({
          productId: String(i.productId),
          productName: String(i.productName || ""),
          sku: String(i.sku || ""),
          quantity: Number(i.quantity),
          purchasePrice: Number(i.purchasePrice),
          subtotal: Number(i.quantity) * Number(i.purchasePrice),
        })),
        createdAt: now,
      };

      transaction.set(stockInLogRef, stockInLogData);

      // 2. Update Stok Produk & Simpan Riwayat Audit Mutasi (inventory_movements)
      for (const item of items) {
        const productRef = adminDb.collection("products").doc(item.productId);
        const productSnap = productSnapshotsMap.get(item.productId)!;
        const currentStock = Number(productSnap.data()?.stock ?? 0);
        const updatedStock = currentStock + Number(item.quantity);

        // Update stok & harga beli terbaru di master products
        transaction.update(productRef, {
          stock: updatedStock,
          purchasePrice: Number(item.purchasePrice),
          updatedAt: now,
        });

        // Record Inventory Movement (PURCHASE - Positive quantity)
        const movementRef = adminDb.collection("inventory_movements").doc();
        transaction.set(movementRef, {
          productId: String(item.productId),
          type: "PURCHASE" as const,
          quantity: Math.abs(Number(item.quantity)), // Positif untuk barang masuk
          purchasePrice: Number(item.purchasePrice),
          referenceId: String(invoiceNumber),
          performedBy: staffName,
          createdAt: now,
        });
      }

      return {
        id: stockInLogRef.id,
        ...stockInLogData,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Penerimaan barang masuk (restock) berhasil dicatat.",
        data: stockInResult,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API /api/inventory/stock-in POST Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Terjadi kesalahan saat memproses penerimaan barang.",
      },
      { status: 500 }
    );
  }
}
