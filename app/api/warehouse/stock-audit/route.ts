import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { AuditSubmissionPayload } from "@/types/stockAudit.types";
import type { QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore";

// GET /api/warehouse/stock-audit -> Fetch Stock Audit History
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase().trim();
  const dateParam = searchParams.get("date"); // YYYY-MM-DD

  try {
    const snapshot = await adminDb
      .collection("stock_audits")
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

    // Search Filter (SKU, Product Name, Auditor Name, or Reason)
    if (search) {
      records = records.filter(
        (rec) =>
          rec.sku?.toLowerCase().includes(search) ||
          rec.productName?.toLowerCase().includes(search) ||
          rec.auditorName?.toLowerCase().includes(search) ||
          rec.reason?.toLowerCase().includes(search)
      );
    }

    return NextResponse.json(
      { success: true, data: records },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API /api/warehouse/stock-audit GET Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal mengambil riwayat audit stok.",
      },
      { status: 500 }
    );
  }
}

// POST /api/warehouse/stock-audit -> Submit Physical Stock Audit & Atomic Adjustment
export async function POST(req: NextRequest) {
  try {
    const body: AuditSubmissionPayload = await req.json();
    const {
      productId,
      physicalStock,
      reason,
      notes,
      auditorId: bodyAuditorId,
      auditorName: bodyAuditorName,
    } = body;

    // 1. Validasi Payload Dasar
    if (!productId || productId.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Produk wajib dipilih." },
        { status: 400 }
      );
    }

    if (
      physicalStock === undefined ||
      physicalStock === null ||
      isNaN(physicalStock) ||
      physicalStock < 0
    ) {
      return NextResponse.json(
        { success: false, message: "Jumlah stok fisik aktual tidak valid." },
        { status: 400 }
      );
    }

    if (!reason || String(reason).trim() === "") {
      return NextResponse.json(
        { success: false, message: "Alasan penyesuaian stok wajib dipilih." },
        { status: 400 }
      );
    }

    // Resolving Auditor Identity from Session Cookie
    let auditorId = bodyAuditorId || "auditor_default";
    let auditorName = bodyAuditorName || "Staf Gudang";

    const sessionCookie = req.cookies.get("session")?.value;
    if (sessionCookie) {
      try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        auditorId = decodedClaims.uid;

        const userDoc = await adminDb.collection("users").doc(decodedClaims.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          auditorName =
            userData?.displayName ||
            decodedClaims.name ||
            decodedClaims.email?.split("@")[0] ||
            "Staf Gudang";
        } else if (decodedClaims.name || decodedClaims.email) {
          auditorName =
            decodedClaims.name || decodedClaims.email?.split("@")[0] || "Staf Gudang";
        }
      } catch (authErr) {
        console.warn(
          "[API /api/warehouse/stock-audit POST] Session verify warning:",
          authErr
        );
      }
    }

    const now = new Date();

    // 2. Jalankan Atomic Firestore Transaction
    const auditRecordResult = await adminDb.runTransaction(async (transaction) => {
      const productRef = adminDb.collection("products").doc(productId);
      const productSnapshot = await transaction.get(productRef);

      if (!productSnapshot.exists) {
        throw new Error(`Produk dengan ID "${productId}" tidak ditemukan di database.`);
      }

      const productData = productSnapshot.data();
      const systemStock = Number(productData?.stock ?? 0);
      const targetPhysicalStock = Number(physicalStock);
      const difference = targetPhysicalStock - systemStock;

      // Create Stock Audit Reference
      const auditRef = adminDb.collection("stock_audits").doc();

      const auditData = {
        productId: String(productId),
        productName: String(productData?.name || ""),
        sku: String(productData?.sku || ""),
        categoryName: String(productData?.categoryName || "Umum"),
        systemStock,
        physicalStock: targetPhysicalStock,
        difference,
        reason: String(reason),
        notes: String(notes || ""),
        auditorId: String(auditorId),
        auditorName: String(auditorName),
        createdAt: now,
      };

      // 1. Simpan dokumen audit di stock_audits
      transaction.set(auditRef, auditData);

      // 2. Update nilai stock pada koleksi master products/{productId}
      transaction.update(productRef, {
        stock: targetPhysicalStock,
        updatedAt: now,
      });

      // 3. Catat audit adjustment pada koleksi inventory_movements
      const movementRef = adminDb.collection("inventory_movements").doc();
      transaction.set(movementRef, {
        productId: String(productId),
        type: "AUDIT_ADJUSTMENT" as const,
        quantity: difference, // Positif jika surplus, negatif jika defisit
        referenceId: auditRef.id,
        performedBy: String(auditorName),
        notes: `Opname: ${reason}${notes ? ` (${notes})` : ""}`,
        createdAt: now,
      });

      return {
        id: auditRef.id,
        ...auditData,
        createdAt: now.toISOString(),
      };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Verifikasi stok fisik (Stock Opname) berhasil disimpan.",
        data: auditRecordResult,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API /api/warehouse/stock-audit POST Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Terjadi kesalahan saat memproses verifikasi stok.",
      },
      { status: 500 }
    );
  }
}
