import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const dummyInventoryReports = [
      {
        productId: 'prod-aqua-600',
        productName: 'Aqua Air Mineral Botol 600ml',
        sku: 'DM-MNM-001',
        categoryName: 'Minuman',
        unit: 'Botol',
        initialStock: 100,
        stockIn: 150,
        stockOut: 240,
        opnameDiff: -2,
        stockReturn: 6,
        finalStock: 2, // 100 + 150 - 240 - 2 - 6 = 2
        lastUpdated: Timestamp.fromDate(new Date()),
      },
      {
        productId: 'prod-indomie-goreng',
        productName: 'Indomie Goreng Spesial 85g',
        sku: 'DM-MKN-001',
        categoryName: 'Makanan Instan',
        unit: 'Pcs',
        initialStock: 200,
        stockIn: 300,
        stockOut: 480,
        opnameDiff: +5,
        stockReturn: 10,
        finalStock: 15, // 200 + 300 - 480 + 5 - 10 = 15
        lastUpdated: Timestamp.fromDate(new Date()),
      },
      {
        productId: 'prod-rinso-770',
        productName: 'Rinso Anti Noda Bubuk 770g',
        sku: 'DM-KBH-001',
        categoryName: 'Kebutuhan Rumah Tangga',
        unit: 'Pcs',
        initialStock: 50,
        stockIn: 40,
        stockOut: 80,
        opnameDiff: -1,
        stockReturn: 5,
        finalStock: 4, // 50 + 40 - 80 - 1 - 5 = 4
        lastUpdated: Timestamp.fromDate(new Date()),
      },
      {
        productId: 'prod-bimoli-2l',
        productName: 'Bimoli Minyak Goreng Pouch 2L',
        sku: 'DM-SBK-001',
        categoryName: 'Sembako',
        unit: 'Pouch',
        initialStock: 80,
        stockIn: 100,
        stockOut: 175,
        opnameDiff: 0,
        stockReturn: 5,
        finalStock: 0, // 80 + 100 - 175 + 0 - 5 = 0
        lastUpdated: Timestamp.fromDate(new Date()),
      },
      {
        productId: 'prod-bango-520',
        productName: 'Bango Kecap Manis Refill 520ml',
        sku: 'DM-SBK-002',
        categoryName: 'Sembako',
        unit: 'Pouch',
        initialStock: 40,
        stockIn: 50,
        stockOut: 85,
        opnameDiff: +1,
        stockReturn: 3,
        finalStock: 3, // 40 + 50 - 85 + 1 - 3 = 3
        lastUpdated: Timestamp.fromDate(new Date()),
      },
      {
        productId: 'prod-sunlight-750',
        productName: 'Sunlight Pencuci Piring Jeruk Nipis 750ml',
        sku: 'DM-KBH-002',
        categoryName: 'Kebutuhan Rumah Tangga',
        unit: 'Pouch',
        initialStock: 60,
        stockIn: 80,
        stockOut: 130,
        opnameDiff: -2,
        stockReturn: 3,
        finalStock: 5, // 60 + 80 - 130 - 2 - 3 = 5
        lastUpdated: Timestamp.fromDate(new Date()),
      },
      {
        productId: 'prod-pocari-500',
        productName: 'Pocari Sweat Botol 500ml',
        sku: 'DM-MNM-002',
        categoryName: 'Minuman',
        unit: 'Botol',
        initialStock: 90,
        stockIn: 120,
        stockOut: 180,
        opnameDiff: 0,
        stockReturn: 5,
        finalStock: 25, // 90 + 120 - 180 - 5 = 25
        lastUpdated: Timestamp.fromDate(new Date()),
      },
      {
        productId: 'prod-pepsodent-190',
        productName: 'Pepsodent Pencegah Gigi Berlubang 190g',
        sku: 'DM-PC-001',
        categoryName: 'Personal Care',
        unit: 'Pcs',
        initialStock: 30,
        stockIn: 50,
        stockOut: 65,
        opnameDiff: -1,
        stockReturn: 2,
        finalStock: 12, // 30 + 50 - 65 - 1 - 2 = 12
        lastUpdated: Timestamp.fromDate(new Date()),
      },
      {
        productId: 'prod-ultra-1l',
        productName: 'Ultra Milk Susu UHT Cokelat 1L',
        sku: 'DM-MNM-003',
        categoryName: 'Minuman',
        unit: 'Pcs',
        initialStock: 45,
        stockIn: 60,
        stockOut: 100,
        opnameDiff: -2,
        stockReturn: 2,
        finalStock: 1, // 45 + 60 - 100 - 2 - 2 = 1
        lastUpdated: Timestamp.fromDate(new Date()),
      },
      {
        productId: 'prod-soklin-780',
        productName: 'So Klin Pembersih Lantai Lavender 780ml',
        sku: 'DM-KBH-003',
        categoryName: 'Kebutuhan Rumah Tangga',
        unit: 'Pouch',
        initialStock: 25,
        stockIn: 40,
        stockOut: 55,
        opnameDiff: +2,
        stockReturn: 4,
        finalStock: 8, // 25 + 40 - 55 + 2 - 4 = 8
        lastUpdated: Timestamp.fromDate(new Date()),
      },
    ];

    const batch = adminDb.batch();
    const collectionRef = adminDb.collection('inventory_reports');

    dummyInventoryReports.forEach((item) => {
      const docRef = collectionRef.doc();
      batch.set(docRef, item);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Berhasil menambahkan ${dummyInventoryReports.length} data dummy Laporan Inventaris ke Firestore!`,
      dataCount: dummyInventoryReports.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal seeding laporan inventaris.' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
