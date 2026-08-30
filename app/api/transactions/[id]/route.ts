import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID transaksi wajib disertakan." },
        { status: 400 }
      );
    }

    // 1. Coba cari berdasarkan Firestore Document ID
    const docRef = adminDb.collection("transactions").doc(id);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();
      return NextResponse.json({
        success: true,
        data: {
          id: docSnap.id,
          ...data,
          createdAt: data?.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data?.createdAt,
        },
      });
    }

    // 2. Jika tidak ditemukan, cari berdasarkan transactionNumber (misal: TRX-20260830-7698)
    const querySnap = await adminDb
      .collection("transactions")
      .where("transactionNumber", "==", id)
      .limit(1)
      .get();

    if (!querySnap.empty) {
      const foundDoc = querySnap.docs[0];
      const data = foundDoc.data();
      return NextResponse.json({
        success: true,
        data: {
          id: foundDoc.id,
          ...data,
          createdAt: data?.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data?.createdAt,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: `Transaksi dengan ID/Nomor "${id}" tidak ditemukan.` },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("[API /api/transactions/[id] Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data transaksi." },
      { status: 500 }
    );
  }
}
