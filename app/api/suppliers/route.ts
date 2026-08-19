import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Supplier } from "@/types/supplier.types";

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: "sup_indofood",
    name: "PT Indofood Sukses Makmur Tbk",
    contactPerson: "Budi Santoso",
    phone: "021-57958822",
    address: "Sudirman Plaza, Jakarta Selatan",
  },
  {
    id: "sup_wings",
    name: "Wings Surya Group",
    contactPerson: "Hendra Wijaya",
    phone: "031-5312345",
    address: "Jl. Tipar Cakung, Jakarta Timur",
  },
  {
    id: "sup_unilever",
    name: "PT Unilever Indonesia Tbk",
    contactPerson: "Siti Rahma",
    phone: "021-80827000",
    address: "BSD City, Tangerang Selatan",
  },
  {
    id: "sup_mayora",
    name: "PT Mayora Indah Tbk",
    contactPerson: "Agus Pratama",
    phone: "021-5655308",
    address: "Jl. Tomang Raya, Jakarta Barat",
  },
  {
    id: "sup_frisian",
    name: "PT Frisian Flag Indonesia",
    contactPerson: "Dewi Lestari",
    phone: "021-8710500",
    address: "Ciracas, Jakarta Timur",
  },
  {
    id: "sup_kalbe",
    name: "PT Kalbe Farma Tbk",
    contactPerson: "Rudi Hermawan",
    phone: "021-42873888",
    address: "Cempaka Putih, Jakarta Pusat",
  },
  {
    id: "sup_lotte",
    name: "PT Lotte Indonesia",
    contactPerson: "Kevin Tan",
    phone: "021-8983000",
    address: "Cikarang Barat, Bekasi",
  },
];

// GET /api/suppliers -> Fetch all suppliers from database
export async function GET(req: NextRequest) {
  try {
    const snapshot = await adminDb.collection("suppliers").get();

    if (snapshot.empty) {
      return NextResponse.json(
        { success: true, data: DEFAULT_SUPPLIERS },
        { status: 200 }
      );
    }

    const suppliers: Supplier[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "Supplier Tanpa Nama",
        contactPerson: data.contactPerson || "",
        phone: data.phone || "",
        address: data.address || "",
      };
    });

    return NextResponse.json(
      { success: true, data: suppliers },
      { status: 200 }
    );
  } catch (error: any) {
    console.warn("[API /api/suppliers GET Warning]:", error);

    // Fallback to default suppliers if Firestore error occurs
    return NextResponse.json(
      { success: true, data: DEFAULT_SUPPLIERS },
      { status: 200 }
    );
  }
}
