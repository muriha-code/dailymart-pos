import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { CreateReturnPayload, ReturnType } from "@/types/stockReturn.types";
import type { QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore";

/**
 * Generates automatic return code: RTN-YYYYMMDD-XXXX
 * Example: RTN-20260818-8492
 */
function generateReturnCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateStr = `${year}${month}${day}`;

  const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
  return `RTN-${dateStr}-${randomCode}`;
}

// GET /api/warehouse/returns -> Fetch Stock Returns & Damaged Items Log
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase().trim();
  const typeParam = searchParams.get("type")?.toUpperCase();
  const reasonParam = searchParams.get("reason")?.toUpperCase();
  const dateParam = searchParams.get("date"); // YYYY-MM-DD

  try {
    const snapshot = await adminDb
      .collection("stock_returns")
      .orderBy("createdAt", "desc")
      .get();

    let records: any[] = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      let createdAtDate: Date;
      if (data.createdAt?.toDate) {
        createdAtDate = data.createdAt.toDate();
      } else if (typeof data.createdAt === "string") {
        createdAtDate = new Date(data.createdAt);
      } else {
        createdAtDate = new Date();
      }

      return {
        id: doc.id,
        ...data,
        createdAt: createdAtDate.toISOString(),
      };
    });

    // Type Filter
    if (typeParam && typeParam !== "ALL") {
      records = records.filter((rec) => rec.type === typeParam);
    }

    // Reason Filter
    if (reasonParam && reasonParam !== "ALL") {
      records = records.filter((rec) => String(rec.reason).toUpperCase() === reasonParam);
    }

    // Date Filter (YYYY-MM-DD)
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [year, month, day] = dateParam.split("-").map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

      records = records.filter((rec) => {
        const d = new Date(rec.createdAt);
        return d >= startOfDay && d <= endOfDay;
      });
    }

    // Search Filter (Return Code, SKU, Product Name, Supplier Name, Reported By)
    if (search) {
      records = records.filter(
        (rec) =>
          rec.returnCode?.toLowerCase().includes(search) ||
          rec.sku?.toLowerCase().includes(search) ||
          rec.productName?.toLowerCase().includes(search) ||
          rec.supplierName?.toLowerCase().includes(search) ||
          rec.reportedBy?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json(
      { success: true, data: records },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API /api/warehouse/returns GET Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal mengambil riwayat retur & barang rusak.",
      },
      { status: 500 }
    );
  }
}

// POST /api/warehouse/returns -> Create Stock Return & Atomic Inventory Deduction
export async function POST(req: NextRequest) {
  try {
    const body: CreateReturnPayload = await req.json();
    const {
      productId,
      quantity,
      type,
      reason,
      supplierName,
      notes,
      reportedBy: bodyReportedBy,
      reporterId: bodyReporterId,
    } = body;

    // 1. Validasi Payload Dasar
    if (!productId || String(productId).trim() === "") {
      return NextResponse.json(
        { success: false, message: "Produk wajib dipilih." },
        { status: 400 }
      );
    }

    const returnQty = Number(quantity);
    if (!returnQty || isNaN(returnQty) || returnQty <= 0) {
      return NextResponse.json(
        { success: false, message: "Kuantitas retur harus lebih dari 0." },
        { status: 400 }
      );
    }

    if (!type || (type !== "RETURN_TO_SUPPLIER" && type !== "DISPOSAL_DAMAGED")) {
      return NextResponse.json(
        { success: false, message: "Tipe proses retur tidak valid." },
        { status: 400 }
      );
    }

    if (!reason || String(reason).trim() === "") {
      return NextResponse.json(
        { success: false, message: "Alasan retur/kerusakan wajib dipilih." },
        { status: 400 }
      );
    }

    if (type === "RETURN_TO_SUPPLIER" && (!supplierName || String(supplierName).trim() === "")) {
      return NextResponse.json(
        { success: false, message: "Nama supplier wajib diisi untuk retur ke supplier." },
        { status: 400 }
      );
    }

    // Resolving Reporter Identity from Session Cookie
    let reporterId = bodyReporterId || "staff_gudang_default";
    let reportedBy = bodyReportedBy || "Staf Gudang";

    const sessionCookie = req.cookies.get("session")?.value;
    if (sessionCookie) {
      try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        reporterId = decodedClaims.uid;

        const userDoc = await adminDb.collection("users").doc(decodedClaims.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          reportedBy =
            userData?.displayName ||
            decodedClaims.name ||
            decodedClaims.email?.split("@")[0] ||
            "Staf Gudang";
        } else if (decodedClaims.name || decodedClaims.email) {
          reportedBy =
            decodedClaims.name || decodedClaims.email?.split("@")[0] || "Staf Gudang";
        }
      } catch (authErr) {
        console.warn(
          "[API /api/warehouse/returns POST] Session verify warning:",
          authErr
        );
      }
    }

    const returnCode = generateReturnCode();
    const now = new Date();

    // 2. Jalankan Firestore Atomic Transaction
    const returnRecordResult = await adminDb.runTransaction(async (transaction) => {
      const productRef = adminDb.collection("products").doc(productId);
      const productSnapshot = await transaction.get(productRef);

      if (!productSnapshot.exists) {
        throw new Error(`Produk dengan ID "${productId}" tidak ditemukan di database.`);
      }

      const productData = productSnapshot.data();
      const currentStock = Number(productData?.stock ?? 0);

      if (currentStock < returnQty) {
        throw new Error(
          `Stok produk "${productData?.name || productId}" saat ini (${currentStock} ${productData?.unit || "Pcs"}) tidak mencukupi untuk diretur sebanyak ${returnQty} ${productData?.unit || "Pcs"}.`
        );
      }

      const updatedStock = currentStock - returnQty;
      const returnRef = adminDb.collection("stock_returns").doc();
      const actionStatus = type === "RETURN_TO_SUPPLIER" ? "PENDING_PICKUP" : "DISPOSED";

      const returnRecordData = {
        returnCode,
        productId: String(productId),
        productName: String(productData?.name || ""),
        sku: String(productData?.sku || ""),
        category: String(productData?.categoryName || "Umum"),
        quantity: returnQty,
        type,
        reason: String(reason),
        supplierName: type === "RETURN_TO_SUPPLIER" ? String(supplierName).trim() : null,
        actionStatus,
        notes: String(notes || ""),
        reportedBy: String(reportedBy),
        reporterId: String(reporterId),
        createdAt: now,
      };

      // 1. Simpan dokumen retur ke koleksi stock_returns
      transaction.set(returnRef, returnRecordData);

      // 2. Potong stok produk di master products
      transaction.update(productRef, {
        stock: updatedStock,
        updatedAt: now,
      });

      // 3. Catat audit log mutasi stok di inventory_movements
      const movementRef = adminDb.collection("inventory_movements").doc();
      const movementType = type === "RETURN_TO_SUPPLIER" ? ("SUPPLIER_RETURN" as const) : ("DAMAGE_WRITE_OFF" as const);
      
      transaction.set(movementRef, {
        productId: String(productId),
        type: movementType,
        quantity: -Math.abs(returnQty), // Kuantitas negatif untuk pengurangan stok
        referenceId: returnCode,
        performedBy: String(reportedBy),
        notes: `${type === "RETURN_TO_SUPPLIER" ? "Retur Supplier" : "Pemusnahan Rusak"}: ${reason}${notes ? ` (${notes})` : ""}`,
        createdAt: now,
      });

      return {
        id: returnRef.id,
        ...returnRecordData,
        createdAt: now.toISOString(),
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: `Pencatatan ${type === "RETURN_TO_SUPPLIER" ? "retur ke supplier" : "pemusnahan barang rusak"} berhasil diproses.`,
        data: returnRecordResult,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API /api/warehouse/returns POST Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Terjadi kesalahan saat memproses pencatatan retur.",
      },
      { status: 500 }
    );
  }
}
