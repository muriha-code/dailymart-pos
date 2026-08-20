import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

const DEFAULT_SETTINGS = {
  storeName: 'DailyMart Retail',
  storeBranch: 'Cabang Utama',
  storeAddress: 'Jl. Slamet Riyadi No. 182, Surakarta',
  storePhone: '0271-712345',
  storeEmail: 'admin@dailymart.com',
  enableTax: true,
  taxRate: 11,
  currencySymbol: 'Rp',
  defaultMinStockAlert: 5,
  autoHideOutOfStock: false,
  receiptPaperWidth: '58mm',
  receiptHeaderNote: 'Selamat Datang di DailyMart',
  receiptFooterNote: 'Barang yang sudah dibeli tidak dapat ditukar. Terima kasih!',
  showCashierName: true,
  showTaxDetails: true,
};

export async function GET() {
  try {
    const doc = await adminDb.collection('settings').doc('store_config').get();
    if (!doc.exists) {
      return NextResponse.json({ success: true, data: DEFAULT_SETTINGS });
    }
    const data = doc.data();
    return NextResponse.json({
      success: true,
      data: {
        ...DEFAULT_SETTINGS,
        ...data,
        updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data?.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('[API /api/admin/settings GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengambil pengaturan toko.' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await adminDb.collection('settings').doc('store_config').set(
      { ...body, updatedAt: new Date() },
      { merge: true }
    );
    return NextResponse.json({
      success: true,
      message: 'Pengaturan sistem berhasil disimpan.',
    });
  } catch (error: any) {
    console.error('[API /api/admin/settings POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menyimpan pengaturan toko.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  return POST(req);
}
