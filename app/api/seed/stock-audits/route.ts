import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

interface DummyAuditSeed {
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
  reason: string;
  notes: string;
  auditorId: string;
  auditorName: string;
  createdAt: FirebaseFirestore.Timestamp;
}

const DUMMY_STOCK_AUDITS: DummyAuditSeed[] = [
  {
    productId: "prod-rinso-770",
    productName: "Rinso Anti Noda Bubuk 770g",
    sku: "DM-KBH-001",
    categoryName: "Kebersihan Rumah",
    systemStock: 25,
    physicalStock: 22,
    difference: -3,
    reason: "Barang Rusak / Kemasan Bocor",
    notes: "3 bungkus bocor pada tumpukan rak bawah.",
    auditorId: "staff-gudang-01",
    auditorName: "Budi Santoso (Gudang)",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 3 * 60 * 60 * 1000)),
  },
  {
    productId: "prod-indomie-goreng",
    productName: "Indomie Goreng Spesial 85g",
    sku: "DM-MKN-001",
    categoryName: "Makanan",
    systemStock: 115,
    physicalStock: 120,
    difference: 5,
    reason: "Selisih Input Penerimaan",
    notes: "Surplus 5 bungkus dari sisa dus unboxing kemarin.",
    auditorId: "staff-gudang-01",
    auditorName: "Budi Santoso (Gudang)",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 60 * 1000)),
  },
  {
    productId: "prod-sunlight-750",
    productName: "Sunlight Pencuci Piring Jeruk Nipis 750ml",
    sku: "DM-KBH-002",
    categoryName: "Kebersihan Rumah",
    systemStock: 35,
    physicalStock: 35,
    difference: 0,
    reason: "Stok Cocok",
    notes: "Stok fisik rak display dan gudang sesuai.",
    auditorId: "staff-gudang-02",
    auditorName: "Rian Hidayat (Gudang)",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)),
  },
  {
    productId: "prod-aqua-600",
    productName: "Aqua Air Mineral Botol 600ml",
    sku: "DM-MNM-001",
    categoryName: "Minuman",
    systemStock: 100,
    physicalStock: 95,
    difference: -5,
    reason: "Kadaluarsa / Botol Rusak",
    notes: "5 botol penyok/bocor saat bongkar muat.",
    auditorId: "staff-gudang-01",
    auditorName: "Budi Santoso (Gudang)",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 28 * 60 * 60 * 1000)),
  },
  {
    productId: "prod-soklin-780",
    productName: "So Klin Pembersih Lantai Lavender 780ml",
    sku: "DM-KBH-003",
    categoryName: "Kebersihan Rumah",
    systemStock: 37,
    physicalStock: 39,
    difference: 2,
    reason: "Retur Pelanggan Tanpa Scan",
    notes: "Ditemukan 2 pouch lebih di keranjang retur kasir.",
    auditorId: "staff-gudang-02",
    auditorName: "Rian Hidayat (Gudang)",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 48 * 60 * 60 * 1000)),
  },
];

async function handleSeedStockAudits() {
  try {
    const batch = adminDb.batch();
    const collectionRef = adminDb.collection("stock_audits");

    const seededItems = DUMMY_STOCK_AUDITS.map((item) => {
      const docRef = collectionRef.doc();
      batch.set(docRef, item);
      return {
        id: docRef.id,
        ...item,
        createdAt: item.createdAt.toDate().toISOString(),
      };
    });

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        message: `Berhasil menambahkan ${DUMMY_STOCK_AUDITS.length} data dummy Stock Audit ke Firestore!`,
        count: DUMMY_STOCK_AUDITS.length,
        data: seededItems,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API /api/seed/stock-audits Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal melakukan seeding data Stock Audit.",
      },
      { status: 500 }
    );
  }
}

// GET /api/seed/stock-audits -> Seed dummy stock audit data via browser
export async function GET(req: NextRequest) {
  return handleSeedStockAudits();
}

// POST /api/seed/stock-audits -> Seed dummy stock audit data via POST request
export async function POST(req: NextRequest) {
  return handleSeedStockAudits();
}
