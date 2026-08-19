import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST() {
  try {
    const batch = adminDb.batch();
    const transactionsRef = adminDb.collection('transactions');

    const dummyTransactions = [
      {
        invoiceNumber: 'INV-20260819-001',
        createdAt: new Date('2026-08-19T08:30:00Z').toISOString(),
        cashierId: 'cashier-01',
        cashierName: 'Kasir Utama 01',
        paymentMethod: 'CASH',
        paidAmount: 100000,
        changeAmount: 18500,
        subtotal: 81500,
        discountTotal: 0,
        grandTotal: 81500,
        items: [
          { productId: 'P001', productName: 'Beras Premium 5kg', price: 75000, quantity: 1, discount: 0, subtotal: 75000 },
          { productId: 'P004', productName: 'Teh Celup SOSRO 25s', price: 6500, quantity: 1, discount: 0, subtotal: 6500 },
        ],
      },
      {
        invoiceNumber: 'INV-20260819-002',
        createdAt: new Date('2026-08-19T09:15:00Z').toISOString(),
        cashierId: 'cashier-01',
        cashierName: 'Kasir Utama 01',
        paymentMethod: 'QRIS',
        paidAmount: 43000,
        changeAmount: 0,
        subtotal: 43000,
        discountTotal: 0,
        grandTotal: 43000,
        items: [
          { productId: 'P002', productName: 'Minyak Goreng Bimoli 2L', price: 34000, quantity: 1, discount: 0, subtotal: 34000 },
          { productId: 'P003', productName: 'Gula Pasir Gulaku 1kg', price: 18000, quantity: 0.5, discount: 0, subtotal: 9000 },
        ],
      },
      {
        invoiceNumber: 'INV-20260819-003',
        createdAt: new Date('2026-08-19T10:45:00Z').toISOString(),
        cashierId: 'cashier-02',
        cashierName: 'Siti Aminah',
        paymentMethod: 'DEBIT',
        paidAmount: 145000,
        changeAmount: 0,
        subtotal: 150000,
        discountTotal: 5000,
        grandTotal: 145000,
        items: [
          { productId: 'P001', productName: 'Beras Premium 5kg', price: 75000, quantity: 1, discount: 0, subtotal: 75000 },
          { productId: 'P002', productName: 'Minyak Goreng Bimoli 2L', price: 34000, quantity: 2, discount: 5000, subtotal: 63000 },
          { productId: 'P005', productName: 'Susu UHT Indomilk 1L', price: 17000, quantity: 1, discount: 0, subtotal: 17000 },
        ],
      },
      {
        invoiceNumber: 'INV-20260818-004',
        createdAt: new Date('2026-08-18T14:20:00Z').toISOString(),
        cashierId: 'cashier-01',
        cashierName: 'Kasir Utama 01',
        paymentMethod: 'CASH',
        paidAmount: 50000,
        changeAmount: 11000,
        subtotal: 39000,
        discountTotal: 0,
        grandTotal: 39000,
        items: [
          { productId: 'P003', productName: 'Gula Pasir Gulaku 1kg', price: 18000, quantity: 1, discount: 0, subtotal: 18000 },
          { productId: 'P006', productName: 'Sabun Cuci Rinso 770g', price: 21000, quantity: 1, discount: 0, subtotal: 21000 },
        ],
      },
      {
        invoiceNumber: 'INV-20260818-005',
        createdAt: new Date('2026-08-18T16:50:00Z').toISOString(),
        cashierId: 'cashier-02',
        cashierName: 'Siti Aminah',
        paymentMethod: 'QRIS',
        paidAmount: 112000,
        changeAmount: 0,
        subtotal: 112000,
        discountTotal: 0,
        grandTotal: 112000,
        items: [
          { productId: 'P001', productName: 'Beras Premium 5kg', price: 75000, quantity: 1, discount: 0, subtotal: 75000 },
          { productId: 'P005', productName: 'Susu UHT Indomilk 1L', price: 17000, quantity: 2, discount: 0, subtotal: 34000 },
          { productId: 'P004', productName: 'Teh Celup SOSRO 25s', price: 6500, quantity: 1, discount: 0, subtotal: 6500 },
        ],
      },
      {
        invoiceNumber: 'INV-20260817-006',
        createdAt: new Date('2026-08-17T11:10:00Z').toISOString(),
        cashierId: 'cashier-01',
        cashierName: 'Kasir Utama 01',
        paymentMethod: 'CASH',
        paidAmount: 200000,
        changeAmount: 43500,
        subtotal: 156500,
        discountTotal: 0,
        grandTotal: 156500,
        items: [
          { productId: 'P001', productName: 'Beras Premium 5kg', price: 75000, quantity: 2, discount: 0, subtotal: 150000 },
          { productId: 'P004', productName: 'Teh Celup SOSRO 25s', price: 6500, quantity: 1, discount: 0, subtotal: 6500 },
        ],
      },
      {
        invoiceNumber: 'INV-20260816-007',
        createdAt: new Date('2026-08-16T15:30:00Z').toISOString(),
        cashierId: 'cashier-02',
        cashierName: 'Siti Aminah',
        paymentMethod: 'DEBIT',
        paidAmount: 89000,
        changeAmount: 0,
        subtotal: 89000,
        discountTotal: 0,
        grandTotal: 89000,
        items: [
          { productId: 'P002', productName: 'Minyak Goreng Bimoli 2L', price: 34000, quantity: 2, discount: 0, subtotal: 68000 },
          { productId: 'P006', productName: 'Sabun Cuci Rinso 770g', price: 21000, quantity: 1, discount: 0, subtotal: 21000 },
        ],
      },
    ];

    dummyTransactions.forEach((tx) => {
      const docRef = transactionsRef.doc(tx.invoiceNumber);
      batch.set(docRef, tx);
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Berhasil menambahkan ${dummyTransactions.length} data transaksi sampel ke Firestore!`,
      dataCount: dummyTransactions.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal seeding transaksi.' },
      { status: 500 }
    );
  }
}
