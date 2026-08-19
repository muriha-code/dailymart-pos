import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const dummyRequests = [
      {
        requestCode: 'REQ-20260819-0001',
        productId: 'prod-aqua-600',
        productName: 'Aqua Air Mineral Botol 600ml',
        sku: 'DM-MNM-001',
        category: 'Minuman',
        currentStock: 2,
        minStock: 20,
        requestedQty: 50,
        urgency: 'URGENT',
        status: 'PENDING',
        notes: 'Stok rak display hampir habis total, laku keras saat jam istirahat.',
        rejectionReason: '',
        requesterId: 'staff-gudang-01',
        requesterName: 'Budi Santoso (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 1 * 3600 * 1000)), // 1 jam lalu
      },
      {
        requestCode: 'REQ-20260819-0002',
        productId: 'prod-rinso-770',
        productName: 'Rinso Anti Noda Bubuk 770g',
        sku: 'DM-KBH-001',
        category: 'Kebutuhan Rumah Tangga',
        currentStock: 4,
        minStock: 15,
        requestedQty: 24,
        urgency: 'NORMAL',
        status: 'APPROVED',
        notes: 'Permintaan restock rutin mingguan supplier Unilever.',
        rejectionReason: '',
        requesterId: 'staff-gudang-01',
        requesterName: 'Budi Santoso (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 3 * 3600 * 1000)), // 3 jam lalu
      },
      {
        requestCode: 'REQ-20260819-0003',
        productId: 'prod-bimoli-2l',
        productName: 'Bimoli Minyak Goreng Pouch 2L',
        sku: 'DM-SBK-001',
        category: 'Sembako',
        currentStock: 0,
        minStock: 12,
        requestedQty: 36,
        urgency: 'URGENT',
        status: 'APPROVED',
        notes: 'Stok fisik gudang kosong total (0 unit), permintaan pelanggan tinggi.',
        rejectionReason: '',
        requesterId: 'staff-gudang-02',
        requesterName: 'Rian Hidayat (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 6 * 3600 * 1000)), // 6 jam lalu
      },
      {
        requestCode: 'REQ-20260818-0004',
        productId: 'prod-indomie-goreng',
        productName: 'Indomie Goreng Spesial 85g',
        sku: 'DM-MKN-001',
        category: 'Makanan Instan',
        currentStock: 15,
        minStock: 40,
        requestedQty: 120,
        urgency: 'URGENT',
        status: 'COMPLETED',
        notes: 'Persiapan stok promo belanja akhir pekan (weekend promo).',
        rejectionReason: '',
        requesterId: 'staff-gudang-01',
        requesterName: 'Budi Santoso (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 22 * 3600 * 1000)), // Kemarin
      },
      {
        requestCode: 'REQ-20260818-0005',
        productId: 'prod-bango-520',
        productName: 'Bango Kecap Manis Refill 520ml',
        sku: 'DM-SBK-002',
        category: 'Sembako',
        currentStock: 3,
        minStock: 10,
        requestedQty: 20,
        urgency: 'NORMAL',
        status: 'PENDING',
        notes: 'Sisa display 3 pouch di lorong bumbu dapur.',
        rejectionReason: '',
        requesterId: 'staff-gudang-02',
        requesterName: 'Rian Hidayat (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 26 * 3600 * 1000)), // Kemarin
      },
      {
        requestCode: 'REQ-20260817-0006',
        productId: 'prod-soklin-780',
        productName: 'So Klin Pembersih Lantai Lavender 780ml',
        sku: 'DM-KBH-003',
        category: 'Kebutuhan Rumah Tangga',
        currentStock: 8,
        minStock: 10,
        requestedQty: 40,
        urgency: 'LOW',
        status: 'REJECTED',
        notes: 'Tambahan stok untuk rak display lantai 2.',
        rejectionReason: 'Kapasitas rak display masih memadai, prioritaskan deterjen dan minyak.',
        requesterId: 'staff-gudang-02',
        requesterName: 'Rian Hidayat (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 48 * 3600 * 1000)), // 2 hari lalu
      },
      {
        requestCode: 'REQ-20260817-0007',
        productId: 'prod-sunlight-750',
        productName: 'Sunlight Pencuci Piring Jeruk Nipis 750ml',
        sku: 'DM-KBH-002',
        category: 'Kebutuhan Rumah Tangga',
        currentStock: 5,
        minStock: 12,
        requestedQty: 30,
        urgency: 'NORMAL',
        status: 'PENDING',
        notes: 'Pengadaan ulang bersamaan PO mingguan.',
        rejectionReason: '',
        requesterId: 'staff-gudang-01',
        requesterName: 'Budi Santoso (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 52 * 3600 * 1000)), // 2 hari lalu
      },
      {
        requestCode: 'REQ-20260816-0008',
        productId: 'prod-pocari-500',
        productName: 'Pocari Sweat Botol 500ml',
        sku: 'DM-MNM-002',
        category: 'Minuman',
        currentStock: 25,
        minStock: 20,
        requestedQty: 48,
        urgency: 'LOW',
        status: 'COMPLETED',
        notes: 'Pengadaan stok menjelang acara jalan sehat lingkungan toko.',
        rejectionReason: '',
        requesterId: 'staff-gudang-01',
        requesterName: 'Budi Santoso (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 72 * 3600 * 1000)), // 3 hari lalu
      },
      {
        requestCode: 'REQ-20260815-0009',
        productId: 'prod-pepsodent-190',
        productName: 'Pepsodent Pencegah Gigi Berlubang 190g',
        sku: 'DM-PC-001',
        category: 'Personal Care',
        currentStock: 12,
        minStock: 15,
        requestedQty: 60,
        urgency: 'NORMAL',
        status: 'REJECTED',
        notes: 'Pengajuan restock karton besar.',
        rejectionReason: 'Jumlah pengajuan terlalu banyak melebihi kuota mingguan rak.',
        requesterId: 'staff-gudang-02',
        requesterName: 'Rian Hidayat (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 96 * 3600 * 1000)), // 4 hari lalu
      },
      {
        requestCode: 'REQ-20260815-0010',
        productId: 'prod-ultra-1l',
        productName: 'Ultra Milk Susu UHT Cokelat 1L',
        sku: 'DM-MNM-003',
        category: 'Minuman',
        currentStock: 1,
        minStock: 15,
        requestedQty: 36,
        urgency: 'URGENT',
        status: 'PENDING',
        notes: 'Stok chiller display sisa 1 pcs, barang fast-moving.',
        rejectionReason: '',
        requesterId: 'staff-gudang-01',
        requesterName: 'Budi Santoso (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 100 * 3600 * 1000)), // 4 hari lalu
      },
    ];

    const batch = adminDb.batch();
    const collectionRef = adminDb.collection('restock_requests');

    dummyRequests.forEach((item) => {
      const docRef = collectionRef.doc();
      batch.set(docRef, item);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Berhasil menambahkan ${dummyRequests.length} data dummy restock request ke Firestore!`,
      dataCount: dummyRequests.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal seeding restock requests' },
      { status: 500 }
    );
  }
}