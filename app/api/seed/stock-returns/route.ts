import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

interface DummyStockReturnSeed {
  returnCode: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  quantity: number;
  type: "RETURN_TO_SUPPLIER" | "DISPOSAL_DAMAGED";
  reason: string;
  supplierName: string;
  actionStatus: "PENDING_PICKUP" | "COMPLETED" | "DISPOSED";
  notes: string;
  reporterId: string;
  reportedBy: string;
  createdAt: FirebaseFirestore.Timestamp;
}

const DUMMY_STOCK_RETURNS: DummyStockReturnSeed[] = [
  {
    returnCode: "RTN-20260818-0001",
    productId: "prod-aqua-600",
    productName: "Aqua Air Mineral Botol 600ml",
    sku: "DM-MNM-001",
    category: "Minuman",
    quantity: 5,
    type: "DISPOSAL_DAMAGED",
    reason: "PACKAGING_DAMAGED",
    supplierName: "-",
    actionStatus: "DISPOSED",
    notes: "5 botol bocor tertimpa karton saat proses bongkar muat.",
    reporterId: "staff-gudang-01",
    reportedBy: "Budi Santoso (Gudang)",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 60 * 60 * 1000)),
  },
  {
    returnCode: "RTN-20260818-0002",
    productId: "prod-indomie-goreng",
    productName: "Indomie Goreng Spesial 85g",
    sku: "DM-MKN-001",
    category: "Makanan Instan",
    quantity: 12,
    type: "RETURN_TO_SUPPLIER",
    reason: "NEAR_EXPIRY",
    supplierName: "PT Indomarco Adi Prima",
    actionStatus: "PENDING_PICKUP",
    notes: "Sisa stok display batch lama, menunggu jadwal pickup armada vendor.",
    reporterId: "staff-gudang-01",
    reportedBy: "Budi Santoso (Gudang)",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 60 * 1000)),
  },
  {
    returnCode: "RTN-20260817-0003",
    productId: "prod-rinso-770",
    productName: "Rinso Anti Noda Bubuk 770g",
    sku: "DM-KBH-001",
    category: "Kebutuhan Rumah Tangga",
    quantity: 3,
    type: "DISPOSAL_DAMAGED",
    reason: "PACKAGING_DAMAGED",
    supplierName: "-",
    actionStatus: "DISPOSED",
    notes: "Kemasan sobek terkena cutter saat unboxing dus pengiriman.",
    reporterId: "staff-gudang-02",
    reportedBy: "Rian Hidayat (Gudang)",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)),
  },
  {
    returnCode: "RTN-20260816-0004",
    productId: "prod-sunlight-750",
    productName: "Sunlight Pencuci Piring Jeruk Nipis 750ml",
    sku: "DM-KBH-002",
    category: "Kebutuhan Rumah Tangga",
    quantity: 6,
    type: "RETURN_TO_SUPPLIER",
    reason: "FACTORY_DEFECT",
    supplierName: "PT Unilever Indonesia Distributor",
    actionStatus: "COMPLETED",
    notes: "Tutup pouch tidak tersegel rapat dari pabrik, sudah ditukar langsung oleh sales.",
    reporterId: "staff-gudang-02",
    reportedBy: "Rian Hidayat (Gudang)",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 48 * 60 * 60 * 1000)),
  },
  {
    returnCode: "RTN-20260815-0005",
    productId: "prod-soklin-780",
    productName: "So Klin Pembersih Lantai Lavender 780ml",
    sku: "DM-KBH-003",
    category: "Kebutuhan Rumah Tangga",
    quantity: 2,
    type: "DISPOSAL_DAMAGED",
    reason: "EXPIRED",
    supplierName: "-",
    actionStatus: "DISPOSED",
    notes: "Barang display rak pojok yang terlewat siklus rotasi FIFO.",
    reporterId: "staff-gudang-01",
    reportedBy: "Budi Santoso (Gudang)",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 72 * 60 * 60 * 1000)),
  },
];

async function handleSeedStockReturns() {
  try {
    const batch = adminDb.batch();
    const collectionRef = adminDb.collection("stock_returns");

    const seededItems = DUMMY_STOCK_RETURNS.map((item) => {
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
        message: `Berhasil menambahkan ${DUMMY_STOCK_RETURNS.length} data dummy Stock Return & Damaged ke Firestore!`,
        dataCount: DUMMY_STOCK_RETURNS.length,
        data: seededItems,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[API /api/seed/stock-returns Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Gagal melakukan seeding data Stock Returns.",
      },
      { status: 500 }
    );
  }
}

// GET /api/seed/stock-returns -> Trigger database seeding via browser
export async function GET(req: NextRequest) {
  return handleSeedStockReturns();
}

// POST /api/seed/stock-returns -> Trigger database seeding via POST
export async function POST(req: NextRequest) {
  return handleSeedStockReturns();
}
