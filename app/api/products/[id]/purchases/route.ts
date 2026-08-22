import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export interface ProductPurchaseHistoryItem {
  id: string;
  date: string;
  supplierName: string;
  invoiceNumber: string;
  purchasePrice: number;
  quantity: number;
  subtotal: number;
  receivedBy: string;
}

// GET /api/products/[id]/purchases -> Fetch purchase & restock history for a specific product
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Product ID wajib diisi' },
        { status: 400 }
      );
    }

    // 1. Check Product exists
    const prodDoc = await adminDb.collection('products').doc(id).get();
    if (!prodDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    const prodData = prodDoc.data();
    const productSku = prodData?.sku || '';

    // 2. Fetch from stock_in_logs
    const stockInSnapshot = await adminDb
      .collection('stock_in_logs')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const historyItems: ProductPurchaseHistoryItem[] = [];

    stockInSnapshot.forEach((doc) => {
      const data = doc.data();
      const items = Array.isArray(data.items) ? data.items : [];
      const matchedItem = items.find(
        (i: any) => i.productId === id || (productSku && i.sku === productSku)
      );

      if (matchedItem) {
        let formattedDate = '';
        if (data.createdAt?.toDate) {
          formattedDate = data.createdAt.toDate().toISOString();
        } else if (typeof data.createdAt === 'string') {
          formattedDate = data.createdAt;
        } else {
          formattedDate = new Date().toISOString();
        }

        historyItems.push({
          id: doc.id,
          date: formattedDate,
          supplierName: data.supplierName || 'Supplier Utama',
          invoiceNumber: data.invoiceNumber || '-',
          purchasePrice: Number(matchedItem.purchasePrice || 0),
          quantity: Number(matchedItem.quantity || 0),
          subtotal: Number(matchedItem.subtotal || Number(matchedItem.purchasePrice || 0) * Number(matchedItem.quantity || 0)),
          receivedBy: data.receivedBy || 'Staff Gudang',
        });
      }
    });

    // 3. Fallback: If no stock_in_logs found yet, check inventory_movements where type == 'PURCHASE'
    if (historyItems.length === 0) {
      try {
        const movementsSnap = await adminDb
          .collection('inventory_movements')
          .where('productId', '==', id)
          .where('type', '==', 'PURCHASE')
          .get();

        movementsSnap.forEach((doc) => {
          const data = doc.data();
          let formattedDate = '';
          if (data.createdAt?.toDate) {
            formattedDate = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt === 'string') {
            formattedDate = data.createdAt;
          } else {
            formattedDate = new Date().toISOString();
          }

          historyItems.push({
            id: doc.id,
            date: formattedDate,
            supplierName: 'Supplier Utama',
            invoiceNumber: data.referenceId || '-',
            purchasePrice: Number(data.purchasePrice || prodData?.purchasePrice || 0),
            quantity: Math.abs(Number(data.quantity || 0)),
            subtotal: Number(data.purchasePrice || prodData?.purchasePrice || 0) * Math.abs(Number(data.quantity || 0)),
            receivedBy: data.performedBy || 'Staff Gudang',
          });
        });
      } catch (movErr) {
        console.warn('Fallback inventory_movements error:', movErr);
      }
    }

    // Sort descending by date
    historyItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: historyItems,
    });
  } catch (error: any) {
    console.error('[API /api/products/[id]/purchases GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mengambil riwayat pembelian produk' },
      { status: 500 }
    );
  }
}
