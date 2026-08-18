import { adminDb } from '../lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

interface DummyAudit {
    productId: string;
    productName: string;
    sku: string;
    systemStock: number;
    physicalStock: number;
    difference: number;
    reason: string;
    notes: string;
    auditorId: string;
    auditorName: string;
    createdAt: FirebaseFirestore.Timestamp;
}

const dummyAudits: DummyAudit[] = [
    {
        productId: 'prod-rinso-770',
        productName: 'Rinso Anti Noda Bubuk 770g',
        sku: 'DM-KBH-001',
        systemStock: 25,
        physicalStock: 22,
        difference: -3,
        reason: 'Barang Rusak / Kemasan Bocor',
        notes: '3 bungkus rusak di tumpukan bawah rak A-02 saat pemindahan.',
        auditorId: 'staff-gudang-01',
        auditorName: 'Budi Santoso (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 3 * 60 * 60 * 1000)), // 3 jam lalu
    },
    {
        productId: 'prod-indomie-goreng',
        productName: 'Indomie Goreng Spesial 85g',
        sku: 'DM-MKN-001',
        systemStock: 115,
        physicalStock: 120,
        difference: 5,
        reason: 'Selisih Input Penerimaan',
        notes: 'Surplus 5 bungkus dari sisa unboxing dus pengiriman supplier kemarin.',
        auditorId: 'staff-gudang-01',
        auditorName: 'Budi Santoso (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 60 * 1000)), // 5 jam lalu
    },
    {
        productId: 'prod-sunlight-750',
        productName: 'Sunlight Pencuci Piring Jeruk Nipis 750ml',
        sku: 'DM-KBH-002',
        systemStock: 35,
        physicalStock: 35,
        difference: 0,
        reason: 'Stok Cocok',
        notes: 'Stok fisik rak display dan gudang belakang sesuai catatan sistem.',
        auditorId: 'staff-gudang-02',
        auditorName: 'Rian Hidayat (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)), // Kemarin
    },
    {
        productId: 'prod-aqua-600',
        productName: 'Aqua Air Mineral Botol 600ml',
        sku: 'DM-MNM-001',
        systemStock: 100,
        physicalStock: 95,
        difference: -5,
        reason: 'Kadaluarsa / Botol Rusak',
        notes: '5 botol penyok parah saat proses unloading karton.',
        auditorId: 'staff-gudang-01',
        auditorName: 'Budi Santoso (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 28 * 60 * 60 * 1000)), // Kemarin
    },
    {
        productId: 'prod-soklin-780',
        productName: 'So Klin Pembersih Lantai Lavender 780ml',
        sku: 'DM-KBH-003',
        systemStock: 37,
        physicalStock: 39,
        difference: 2,
        reason: 'Retur Pelanggan Tanpa Scan',
        notes: 'Ditemukan 2 pouch lebih di keranjang retur barang kasir.',
        auditorId: 'staff-gudang-02',
        auditorName: 'Rian Hidayat (Gudang)',
        createdAt: Timestamp.fromDate(new Date(Date.now() - 48 * 60 * 60 * 1000)), // 2 hari lalu
    },
];

async function seedStockAudits() {
    console.log('🚀 Memulai proses seeding data Stock Audit...');

    try {
        const batch = adminDb.batch();
        const collectionRef = adminDb.collection('stock_audits');

        for (const item of dummyAudits) {
            const docRef = collectionRef.doc();
            batch.set(docRef, item);
        }

        await batch.commit();
        console.log(`✅ Berhasil menambahkan ${dummyAudits.length} data dummy stock audit ke Firestore!`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Gagal melakukan seeding:', error);
        process.exit(1);
    }
}

seedStockAudits();