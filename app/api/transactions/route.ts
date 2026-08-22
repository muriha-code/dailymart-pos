import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { CreateTransactionPayload, PaymentMethod } from "@/types/transaction.types";

/**
 * Generates a unique transaction number formatted as TRX-YYYYMMDD-XXXX
 * Example: TRX-20260815-4892
 */
function generateTransactionNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  // Random 4-digit code (1000 - 9999)
  const randomCode = Math.floor(1000 + Math.random() * 9000).toString();

  return `TRX-${dateStr}-${randomCode}`;
}

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "QRIS",
  "DEBIT",
  "CREDIT",
  "TRANSFER",
];

// GET /api/transactions -> Fetch transaction history
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase();

  try {
    const snapshot = await adminDb
      .collection("transactions")
      .orderBy("createdAt", "desc")
      .get();

    let transactions: any[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
      };
    });

    if (search) {
      transactions = transactions.filter(
        (trx) =>
          trx.transactionNumber?.toLowerCase().includes(search) ||
          trx.cashierId?.toLowerCase().includes(search) ||
          trx.cashierName?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json(
      { success: true, data: transactions },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API /api/transactions GET Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal mengambil daftar transaksi.",
      },
      { status: 500 }
    );
  }
}

// POST /api/transactions -> Checkout Flow with Firestore Atomic Transaction
export async function POST(req: NextRequest) {
  try {
    const body: CreateTransactionPayload = await req.json();

    const {
      items,
      paymentMethod,
      paidAmount,
      subtotal,
      discount,
      total,
      cashierId: bodyCashierId,
      cashierName: bodyCashierName,
    } = body;

    // Resolving Stamped Cashier Identity from Session Cookie or Fallback Body Payload
    let finalCashierId = bodyCashierId || "cashier_default";
    let finalCashierName = bodyCashierName || "Kasir POS";

    const sessionCookie = req.cookies.get("session")?.value;
    if (sessionCookie) {
      try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        finalCashierId = decodedClaims.uid;
        
        // Fetch User Display Name from Firestore users/{uid}
        const userDoc = await adminDb.collection("users").doc(decodedClaims.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          finalCashierName = userData?.displayName || decodedClaims.name || decodedClaims.email?.split("@")[0] || "Kasir POS";
        } else if (decodedClaims.name || decodedClaims.email) {
          finalCashierName = decodedClaims.name || decodedClaims.email?.split("@")[0] || "Kasir POS";
        }
      } catch (authErr) {
        console.warn("[API /api/transactions POST] Session cookie verify warning:", authErr);
      }
    }

    // 1. Validasi Payload Dasar
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Keranjang belanja tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          message: `Metode pembayaran "${paymentMethod}" tidak valid.`,
        },
        { status: 400 }
      );
    }

    if (total === undefined || total === null || isNaN(total) || total < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Total nilai transaksi tidak valid.",
        },
        { status: 400 }
      );
    }

    // Validasi Pembayaran Tunai
    if (paymentMethod === "CASH") {
      if (paidAmount === undefined || paidAmount === null || paidAmount < total) {
        return NextResponse.json(
          {
            success: false,
            message: `Nominal pembayaran tunai (${paidAmount ?? 0}) kurang dari total belanja (${total}).`,
          },
          { status: 400 }
        );
      }
    }

    // Validasi kelengkapan tiap item
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Data item produk "${item.productName || item.productId}" tidak valid.`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Jalankan Firestore Atomic Transaction
    const transactionRecord = await adminDb.runTransaction(async (transaction) => {
      // PHASE A: ALL READS FIRST (Memeriksa keberadaan & kecukupan stok produk)
      const productSnapshotsMap = new Map<string, FirebaseFirestore.DocumentSnapshot>();

      for (const item of items) {
        const productRef = adminDb.collection("products").doc(item.productId);
        const productSnapshot = await transaction.get(productRef);

        if (!productSnapshot.exists) {
          throw new Error(
            `Produk "${item.productName || item.productId}" tidak ditemukan di database.`
          );
        }

        const productData = productSnapshot.data();
        const currentStock = Number(productData?.stock ?? 0);

        if (currentStock < item.quantity) {
          throw new Error(
            `Stok produk "${productData?.name || item.productName}" tidak mencukupi (Stok saat ini: ${currentStock}, Dibutuhkan: ${item.quantity}).`
          );
        }

        productSnapshotsMap.set(item.productId, productSnapshot);
      }

      // PHASE B: ALL WRITES AFTER READS
      const transactionRef = adminDb.collection("transactions").doc();
      const transactionNumber = generateTransactionNumber();
      const now = new Date();
      const changeAmount =
        paymentMethod === "CASH" ? Math.max(0, Number(paidAmount) - Number(total)) : 0;

      // Formatting data transaksi dengan snapshot harga, subtotal, dan costPrice (HPP pada saat transaksi)
      const newTransactionData = {
        transactionNumber,
        cashierId: String(finalCashierId),
        cashierName: String(finalCashierName),
        items: items.map((item) => {
          const productSnap = productSnapshotsMap.get(item.productId);
          const productData = productSnap?.data();
          const snapshotCostPrice = Number(
            productData?.costPrice ?? productData?.purchasePrice ?? (item.price * 0.72)
          );

          return {
            productId: String(item.productId),
            productName: String(item.productName ?? productData?.name ?? ""),
            price: Number(item.price || 0),
            costPrice: snapshotCostPrice,
            quantity: Number(item.quantity || 0),
            discount: Number(item.discount || 0),
            subtotal: Number(item.subtotal || 0),
          };
        }),
        subtotal: Number(subtotal || 0),
        discount: Number(discount || 0),
        total: Number(total || 0),
        paymentMethod,
        paidAmount: Number(paidAmount || 0),
        change: Number(changeAmount),
        status: "COMPLETED" as const,
        createdAt: now,
      };

      // 1. Simpan Dokumen Transaksi Utama
      transaction.set(transactionRef, newTransactionData);

      // 2. Update Stok & Simpan Audit Log Mutasi Inventory
      for (const item of items) {
        const productRef = adminDb.collection("products").doc(item.productId);
        const productSnapshot = productSnapshotsMap.get(item.productId)!;
        const currentStock = Number(productSnapshot.data()?.stock ?? 0);
        const updatedStock = currentStock - Number(item.quantity);

        // Deduct product stock
        transaction.update(productRef, {
          stock: updatedStock,
          updatedAt: now,
        });

        // Record Inventory Movement (SALE)
        const movementRef = adminDb.collection("inventory_movements").doc();
        transaction.set(movementRef, {
          productId: String(item.productId),
          type: "SALE" as const,
          quantity: -Math.abs(Number(item.quantity)), // Nilai negatif untuk penjualan
          referenceId: transactionRef.id,
          performedBy: String(finalCashierId),
          createdAt: now,
        });
      }

      return {
        id: transactionRef.id,
        ...newTransactionData,
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Transaksi berhasil diselesaikan",
        data: transactionRecord,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API /api/transactions POST Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Terjadi kesalahan saat memproses transaksi.",
      },
      { status: 400 }
    );
  }
}
