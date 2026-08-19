import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  RestockRequestRecord,
  CreateRestockRequestPayload,
  RestockRequestSummary,
} from "@/types/restockRequest.types";
import type { QueryDocumentSnapshot, DocumentData } from "firebase-admin/firestore";

/**
 * Generate unique ticket code: REQ-YYYYMMDD-XXXX
 */
function generateRequestCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `REQ-${year}${month}${day}-${randomSuffix}`;
}

// GET /api/warehouse/restock-requests -> Fetch All Restock Requests & KPI Summary
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.toLowerCase().trim();
  const statusFilter = searchParams.get("status")?.toUpperCase().trim();
  const urgencyFilter = searchParams.get("urgency")?.toUpperCase().trim();

  try {
    const snapshot = await adminDb
      .collection("restock_requests")
      .orderBy("createdAt", "desc")
      .get();

    const allRecords: RestockRequestRecord[] = snapshot.docs.map(
      (doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        let createdAtIso: string;
        if (data.createdAt?.toDate) {
          createdAtIso = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === "string") {
          createdAtIso = data.createdAt;
        } else {
          createdAtIso = new Date().toISOString();
        }

        return {
          id: doc.id,
          requestCode: String(data.requestCode || doc.id),
          productId: String(data.productId || ""),
          productName: String(data.productName || "Produk"),
          sku: String(data.sku || ""),
          categoryName: String(data.categoryName || data.category || "Umum"),
          currentStock: Number(data.currentStock ?? 0),
          requestedQty: Number(data.requestedQty ?? 1),
          unit: String(data.unit || "Pcs"),
          urgency: (data.urgency as any) || "NORMAL",
          status: (data.status as any) || "PENDING",
          reasonNotes: String(data.notes || data.reasonNotes || ""),
          rejectionReason: data.rejectionReason ? String(data.rejectionReason) : undefined,
          requestedBy: String(data.requesterName || data.requestedBy || "Staf Gudang"),
          requestedById: data.requesterId ? String(data.requesterId) : data.requestedById ? String(data.requestedById) : undefined,
          createdAt: createdAtIso,
        };
      }
    );

    // Summary Metrics (sebelum filter UI)
    const summary: RestockRequestSummary = {
      total: allRecords.length,
      pending: allRecords.filter((r) => r.status === "PENDING").length,
      approved: allRecords.filter((r) => r.status === "APPROVED").length,
      completed: allRecords.filter((r) => r.status === "COMPLETED").length,
      rejected: allRecords.filter((r) => r.status === "REJECTED").length,
    };

    // Filter Logic
    let filteredRecords = allRecords;

    if (statusFilter && statusFilter !== "ALL") {
      filteredRecords = filteredRecords.filter((r) => r.status === statusFilter);
    }

    if (urgencyFilter && urgencyFilter !== "ALL") {
      filteredRecords = filteredRecords.filter((r) => r.urgency === urgencyFilter);
    }

    if (search) {
      filteredRecords = filteredRecords.filter(
        (r) =>
          r.requestCode.toLowerCase().includes(search) ||
          r.productName.toLowerCase().includes(search) ||
          r.sku.toLowerCase().includes(search) ||
          r.requestedBy.toLowerCase().includes(search)
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: filteredRecords,
        summary,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API /api/warehouse/restock-requests GET Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal mengambil daftar pengajuan restok.",
      },
      { status: 500 }
    );
  }
}

// POST /api/warehouse/restock-requests -> Submit New Restock Request Ticket
export async function POST(req: NextRequest) {
  try {
    const body: CreateRestockRequestPayload = await req.json();
    const { productId, requestedQty, urgency, reasonNotes } = body;

    // 1. Validasi Payload Dasar
    if (!productId || productId.trim() === "") {
      return NextResponse.json(
        { success: false, message: "Produk wajib dipilih." },
        { status: 400 }
      );
    }

    if (!requestedQty || isNaN(requestedQty) || requestedQty <= 0) {
      return NextResponse.json(
        { success: false, message: "Kuantitas barang yang diminta harus minimal 1." },
        { status: 400 }
      );
    }

    if (!urgency || !["URGENT", "NORMAL", "LOW"].includes(urgency)) {
      return NextResponse.json(
        { success: false, message: "Tingkat urgensi tidak valid." },
        { status: 400 }
      );
    }

    // 2. Ambil detail produk dari katalog master Firestore
    const productRef = adminDb.collection("products").doc(productId);
    const productDoc = await productRef.get();

    if (!productDoc.exists) {
      return NextResponse.json(
        { success: false, message: `Produk dengan ID "${productId}" tidak ditemukan.` },
        { status: 404 }
      );
    }

    const productData = productDoc.data();

    // 3. Resolving Pemohon Identity dari Session Cookie
    let requestedById = body.requestedById || "user_default";
    let requestedBy = body.requestedBy || "Staf Gudang";

    const sessionCookie = req.cookies.get("session")?.value;
    if (sessionCookie) {
      try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        requestedById = decodedClaims.uid;

        const userDoc = await adminDb.collection("users").doc(decodedClaims.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          requestedBy =
            userData?.displayName ||
            decodedClaims.name ||
            decodedClaims.email?.split("@")[0] ||
            "Staf Gudang";
        } else if (decodedClaims.name || decodedClaims.email) {
          requestedBy =
            decodedClaims.name || decodedClaims.email?.split("@")[0] || "Staf Gudang";
        }
      } catch (authErr) {
        console.warn(
          "[API /api/warehouse/restock-requests POST] Session warning:",
          authErr
        );
      }
    }

    const now = new Date();
    const requestCode = generateRequestCode();
    const newDocRef = adminDb.collection("restock_requests").doc();

    const recordData = {
      requestCode,
      productId: String(productId),
      productName: String(productData?.name || "Produk"),
      sku: String(productData?.sku || ""),
      categoryName: String(productData?.categoryName || "Umum"),
      currentStock: Number(productData?.stock ?? 0),
      requestedQty: Number(requestedQty),
      unit: String(productData?.unit || "Pcs"),
      urgency: String(urgency),
      status: "PENDING" as const,
      reasonNotes: String(reasonNotes || ""),
      requestedBy: String(requestedBy),
      requestedById: String(requestedById),
      createdAt: now,
      updatedAt: now,
    };

    await newDocRef.set(recordData);

    return NextResponse.json(
      {
        success: true,
        message: `Pengajuan restok (${requestCode}) berhasil dibuat dengan status PENDING.`,
        data: {
          id: newDocRef.id,
          ...recordData,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API /api/warehouse/restock-requests POST Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal membuat pengajuan restok barang.",
      },
      { status: 500 }
    );
  }
}
