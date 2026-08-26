import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

// Maximum write operations per batch in Firestore is 500. We safety chunk at 400.
const BATCH_SIZE_LIMIT = 400;

interface SimpleProduct {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
}

interface SimpleCashier {
  id: string;
  name: string;
}

interface SimpleSupplier {
  id: string;
  name: string;
}

// Fallback catalog products if Firestore `products` collection is empty
const FALLBACK_PRODUCTS: SimpleProduct[] = [
  {
    id: 'prod-001',
    sku: 'SM-BRS-001',
    name: 'Beras Premium Ramos 5kg',
    categoryId: 'sembako',
    categoryName: 'Sembako',
    purchasePrice: 65000,
    sellingPrice: 74000,
    stock: 45,
  },
  {
    id: 'prod-002',
    sku: 'SM-MYK-002',
    name: 'Minyak Goreng Sania 2L',
    categoryId: 'sembako',
    categoryName: 'Sembako',
    purchasePrice: 32000,
    sellingPrice: 36500,
    stock: 60,
  },
  {
    id: 'prod-003',
    sku: 'SM-GLA-003',
    name: 'Gulaku Gula Pasir Putih 1kg',
    categoryId: 'sembako',
    categoryName: 'Sembako',
    purchasePrice: 15000,
    sellingPrice: 17500,
    stock: 80,
  },
  {
    id: 'prod-004',
    sku: 'MK-MIE-001',
    name: 'Indomie Goreng Spesial 85g',
    categoryId: 'makanan',
    categoryName: 'Makanan',
    purchasePrice: 2800,
    sellingPrice: 3200,
    stock: 200,
  },
  {
    id: 'prod-005',
    sku: 'MN-SOP-001',
    name: 'Teh Botol Sosro Original 450ml',
    categoryId: 'minuman',
    categoryName: 'Minuman',
    purchasePrice: 5000,
    sellingPrice: 6500,
    stock: 120,
  },
  {
    id: 'prod-006',
    sku: 'MN-SOP-002',
    name: 'Ultra Milk Rasa Cokelat 250ml',
    categoryId: 'minuman',
    categoryName: 'Minuman',
    purchasePrice: 5800,
    sellingPrice: 7200,
    stock: 90,
  },
  {
    id: 'prod-007',
    sku: 'SN-CKLT-001',
    name: 'Silverqueen Cashew 58g',
    categoryId: 'snack',
    categoryName: 'Snack & Biskuit',
    purchasePrice: 13500,
    sellingPrice: 16500,
    stock: 50,
  },
  {
    id: 'prod-008',
    sku: 'SN-BSK-002',
    name: 'Oreo Vanilla 133g',
    categoryId: 'snack',
    categoryName: 'Snack & Biskuit',
    purchasePrice: 8500,
    sellingPrice: 10500,
    stock: 75,
  },
  {
    id: 'prod-009',
    sku: 'RT-SBN-001',
    name: 'Lifebuoy Sabun Mandi Red 110g',
    categoryId: 'kebutuhan-rumah',
    categoryName: 'Kebutuhan Rumah',
    purchasePrice: 4200,
    sellingPrice: 5500,
    stock: 110,
  },
  {
    id: 'prod-010',
    sku: 'RT-DET-002',
    name: 'Rinso Anti Noda Deterjen 770g',
    categoryId: 'kebutuhan-rumah',
    categoryName: 'Kebutuhan Rumah',
    purchasePrice: 18500,
    sellingPrice: 22000,
    stock: 40,
  },
];

// Fallback cashiers
const FALLBACK_CASHIERS: SimpleCashier[] = [
  { id: 'cashier-01', name: 'Siti Aminah (Kasir 1)' },
  { id: 'cashier-02', name: 'Budi Santoso (Kasir 2)' },
  { id: 'cashier-03', name: 'Dewi Lestari (Kasir 3)' },
];

// Fallback suppliers
const FALLBACK_SUPPLIERS: SimpleSupplier[] = [
  { id: 'sup-001', name: 'PT Indofood Sukses Makmur' },
  { id: 'sup-002', name: 'CV Sembako Jaya Abadi' },
  { id: 'sup-003', name: 'PT Mayora Indah Tbk' },
  { id: 'sup-004', name: 'PT Unilever Indonesia' },
];

/**
 * Generates a random Date within the last 90 days.
 * Weighted towards peak retail hours:
 * - Peak 1: 11:00 - 14:00 (11 - 14)
 * - Peak 2: 17:00 - 21:00 (17 - 21)
 * - Regular: 08:00 - 11:00 or 14:00 - 17:00
 */
function getRandomSimulationDate(daysAgoMin: number, daysAgoMax: number): Date {
  const now = new Date();
  // Random day between daysAgoMin and daysAgoMax
  const randomDayOffset = daysAgoMin + Math.random() * (daysAgoMax - daysAgoMin);
  const targetDate = new Date(now.getTime() - randomDayOffset * 24 * 60 * 60 * 1000);

  // Determine hour distribution
  const randHourRoll = Math.random();
  let hour: number;

  if (randHourRoll < 0.45) {
    // Peak 2: 17:00 - 21:00 (45% probability)
    hour = 17 + Math.floor(Math.random() * 4);
  } else if (randHourRoll < 0.80) {
    // Peak 1: 11:00 - 14:00 (35% probability)
    hour = 11 + Math.floor(Math.random() * 3);
  } else {
    // Off-peak / Morning / Afternoon (20% probability): 08:00 - 11:00 or 14:00 - 17:00
    hour = Math.random() < 0.5 ? 8 + Math.floor(Math.random() * 3) : 14 + Math.floor(Math.random() * 3);
  }

  const minute = Math.floor(Math.random() * 60);
  const second = Math.floor(Math.random() * 60);

  targetDate.setHours(hour, minute, second, 0);
  return targetDate;
}

/**
 * Execute writes in batch chunks to keep below Firestore limits.
 */
async function commitBatchOperations(
  operations: Array<{
    ref: FirebaseFirestore.DocumentReference;
    data: any;
    secondaryRef?: FirebaseFirestore.DocumentReference;
  }>
) {
  let batch = adminDb.batch();
  let count = 0;

  for (const op of operations) {
    batch.set(op.ref, op.data);
    count++;

    if (op.secondaryRef) {
      batch.set(op.secondaryRef, op.data);
      count++;
    }

    if (count >= BATCH_SIZE_LIMIT) {
      await batch.commit();
      batch = adminDb.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Fetch existing Products, Cashiers, and Suppliers from Firestore if available
    let products: SimpleProduct[] = [];
    try {
      const prodSnap = await adminDb.collection('products').get();
      if (!prodSnap.empty) {
        products = prodSnap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            sku: d.sku || `SKU-${doc.id.slice(0, 5)}`,
            name: d.name || d.productName || 'Produk Retail',
            categoryId: d.categoryId || 'umum',
            categoryName: d.categoryName || 'Umum',
            purchasePrice: Number(d.purchasePrice || d.costPrice || 10000),
            sellingPrice: Number(d.sellingPrice || d.price || 12500),
            stock: Number(d.stock || 50),
          };
        });
      }
    } catch (e) {
      console.warn('[Seed Simulation] Error fetching products:', e);
    }
    if (products.length === 0) {
      products = FALLBACK_PRODUCTS;
    }

    let cashiers: SimpleCashier[] = [];
    try {
      const userSnap = await adminDb.collection('users').get();
      if (!userSnap.empty) {
        cashiers = userSnap.docs
          .map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              name: d.displayName || d.name || d.email || `Kasir ${doc.id.slice(0, 4)}`,
            };
          })
          .filter(Boolean);
      }
    } catch (e) {
      console.warn('[Seed Simulation] Error fetching users:', e);
    }
    if (cashiers.length === 0) {
      cashiers = FALLBACK_CASHIERS;
    }

    let suppliers: SimpleSupplier[] = [];
    try {
      const supSnap = await adminDb.collection('suppliers').get();
      if (!supSnap.empty) {
        suppliers = supSnap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.name || d.supplierName || 'Supplier Utama',
          };
        });
      }
    } catch (e) {
      console.warn('[Seed Simulation] Error fetching suppliers:', e);
    }
    if (suppliers.length === 0) {
      suppliers = FALLBACK_SUPPLIERS;
    }

    const operationsList: Array<{
      ref: FirebaseFirestore.DocumentReference;
      data: any;
      secondaryRef?: FirebaseFirestore.DocumentReference;
    }> = [];

    // -------------------------------------------------------------
    // 2. SIMULASI TRANSAKSI PENJUALAN (`transactions` & `sales`)
    // -------------------------------------------------------------
    // Generate 180 Sales Transactions over the last 90 days
    const totalTransactionsToGenerate = 180;
    const paymentMethods: Array<'CASH' | 'QRIS' | 'DEBIT'> = ['CASH', 'CASH', 'QRIS', 'QRIS', 'DEBIT'];

    for (let i = 0; i < totalTransactionsToGenerate; i++) {
      // Uniform spread across 90 days with peaked hour distribution
      const daysAgo = (i / totalTransactionsToGenerate) * 90;
      const txDate = getRandomSimulationDate(daysAgo, daysAgo + 0.5);

      const yyyy = txDate.getFullYear();
      const mm = String(txDate.getMonth() + 1).padStart(2, '0');
      const dd = String(txDate.getDate()).padStart(2, '0');
      const randSeq = String(i + 1).padStart(4, '0');
      const invoiceNumber = `INV-${yyyy}${mm}${dd}-${randSeq}`;

      const cashier = cashiers[Math.floor(Math.random() * cashiers.length)];
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      // Pick 1 to 4 random unique items
      const itemCount = Math.floor(Math.random() * 4) + 1;
      const shuffledProducts = [...products].sort(() => 0.5 - Math.random());
      const selectedProducts = shuffledProducts.slice(0, itemCount);

      let subtotal = 0;
      let totalCogs = 0;
      let totalDiscount = 0;

      const items = selectedProducts.map((prod) => {
        const qty = Math.floor(Math.random() * 3) + 1;
        const price = prod.sellingPrice;
        const costPrice = prod.purchasePrice;
        const itemSubtotal = price * qty;
        const itemDiscount = Math.random() < 0.1 ? Math.floor(price * 0.05) * qty : 0; // 10% chance of 5% promo

        subtotal += itemSubtotal;
        totalCogs += costPrice * qty;
        totalDiscount += itemDiscount;

        return {
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          categoryId: prod.categoryId,
          categoryName: prod.categoryName,
          price,
          costPrice,
          purchasePrice: costPrice,
          quantity: qty,
          discount: itemDiscount,
          subtotal: itemSubtotal - itemDiscount,
        };
      });

      const grandTotal = subtotal - totalDiscount;
      const grossProfit = grandTotal - totalCogs;
      const margin = grandTotal > 0 ? Number(((grossProfit / grandTotal) * 100).toFixed(2)) : 0;

      let paidAmount = grandTotal;
      let changeAmount = 0;

      if (paymentMethod === 'CASH') {
        // Round paid amount up to nearest 10,000 or 50,000
        paidAmount = Math.ceil(grandTotal / 10000) * 10000;
        if (paidAmount < grandTotal) paidAmount = grandTotal;
        changeAmount = paidAmount - grandTotal;
      }

      // Format Firestore Timestamp natively with Timestamp.fromDate()
      const firestoreTimestamp = Timestamp.fromDate(txDate);

      const transactionPayload = {
        invoiceNumber,
        transactionNumber: invoiceNumber,
        cashierId: cashier.id,
        cashierName: cashier.name,
        paymentMethod,
        items,
        subtotal,
        discount: totalDiscount,
        discountTotal: totalDiscount,
        total: grandTotal,
        grandTotal,
        totalCogs,
        totalHpp: totalCogs,
        grossProfit,
        margin,
        paidAmount,
        change: changeAmount,
        changeAmount,
        status: 'COMPLETED',
        createdAt: firestoreTimestamp,
        updatedAt: firestoreTimestamp,
      };

      const trxDocRef = adminDb.collection('transactions').doc(invoiceNumber);
      const salesDocRef = adminDb.collection('sales').doc(invoiceNumber);

      operationsList.push({
        ref: trxDocRef,
        secondaryRef: salesDocRef,
        data: transactionPayload,
      });
    }

    // -------------------------------------------------------------
    // 3. SIMULASI PENERIMAAN STOK / RESTOCK (`stock_in_logs` & `stock_in`)
    // -------------------------------------------------------------
    // Generate 14 Stock-in logs over the last 90 days (~1 restock every 6 days)
    const totalRestocks = 14;

    for (let k = 0; k < totalRestocks; k++) {
      const daysAgo = (k / totalRestocks) * 90;
      const restockDate = getRandomSimulationDate(daysAgo, daysAgo + 1);

      const yyyy = restockDate.getFullYear();
      const mm = String(restockDate.getMonth() + 1).padStart(2, '0');
      const dd = String(restockDate.getDate()).padStart(2, '0');
      const randCode = Math.floor(1000 + Math.random() * 9000).toString();
      const invoiceNumber = `IN-${yyyy}${mm}${dd}-${randCode}`;

      const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
      const staffName = 'Staff Gudang';

      // Pick 3 to 6 products to restock
      const prodCount = Math.floor(Math.random() * 4) + 3;
      const shuffledProds = [...products].sort(() => 0.5 - Math.random());
      const restockProds = shuffledProds.slice(0, prodCount);

      let totalQuantity = 0;
      let totalCost = 0;

      const restockItems = restockProds.map((p) => {
        const qty = Math.floor(Math.random() * 20) + 10; // Restock 10-30 pcs per item
        const pPrice = p.purchasePrice;
        const itemSubtotal = qty * pPrice;

        totalQuantity += qty;
        totalCost += itemSubtotal;

        return {
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          quantity: qty,
          purchasePrice: pPrice,
          subtotal: itemSubtotal,
        };
      });

      const restockTimestamp = Timestamp.fromDate(restockDate);

      const stockInPayload = {
        invoiceNumber,
        supplierId: supplier.id,
        supplierName: supplier.name,
        receivedBy: staffName,
        notes: `Penerimaan stok rutin dari ${supplier.name}`,
        totalItems: restockItems.length,
        totalQuantity,
        totalCost,
        items: restockItems,
        createdAt: restockTimestamp,
        updatedAt: restockTimestamp,
      };

      const stockInLogRef = adminDb.collection('stock_in_logs').doc(invoiceNumber);
      const stockInRef = adminDb.collection('stock_in').doc(invoiceNumber);

      operationsList.push({
        ref: stockInLogRef,
        secondaryRef: stockInRef,
        data: stockInPayload,
      });

      // Also record inventory movement per product
      for (const item of restockItems) {
        const movementRef = adminDb.collection('inventory_movements').doc();
        operationsList.push({
          ref: movementRef,
          data: {
            productId: item.productId,
            type: 'PURCHASE',
            quantity: item.quantity,
            purchasePrice: item.purchasePrice,
            referenceId: invoiceNumber,
            performedBy: staffName,
            createdAt: restockTimestamp,
          },
        });
      }
    }

    // -------------------------------------------------------------
    // 4. SIMULASI PENGELUARAN OPERASIONAL (`operating_expenses` & `expenses`)
    // -------------------------------------------------------------
    // Generate monthly recurring expenses for each of the last 3 months
    const expenseTemplates = [
      { name: 'Tagihan Listrik PLN & Air PAM Minimarket', category: 'Listrik & Air', min: 1400000, max: 2100000, dayOffset: 5 },
      { name: 'Langganan WiFi & Internet Biznet 100Mbps', category: 'WiFi & Internet', min: 450000, max: 550000, dayOffset: 10 },
      { name: 'Biaya Kebersihan & Keamanan Komplek', category: 'Kebersihan', min: 300000, max: 400000, dayOffset: 15 },
      { name: 'Pembelian Perlengkapan Toko & Plastik POS', category: 'Operasional Toko', min: 250000, max: 450000, dayOffset: 20 },
      { name: 'Retur Barang Kadaluwarsa / Kerusakan Produk', category: 'Lainnya', min: 150000, max: 350000, dayOffset: 25 },
      { name: 'Biaya Sewa Bangunan Toko Bulanan', category: 'Sewa Toko', min: 2500000, max: 2500000, dayOffset: 1 },
    ];

    const monthsAgoList = [0, 1, 2]; // 0 = month 1 (this month), 1 = last month, 2 = 2 months ago

    for (const monthIndex of monthsAgoList) {
      for (const tmpl of expenseTemplates) {
        const daysAgo = monthIndex * 30 + tmpl.dayOffset;
        const expenseDate = getRandomSimulationDate(daysAgo, daysAgo + 0.5);

        const amount = Math.floor(tmpl.min + Math.random() * (tmpl.max - tmpl.min));
        const dateIsoStr = expenseDate.toISOString().slice(0, 10);
        const expenseTimestamp = Timestamp.fromDate(expenseDate);

        const expensePayload = {
          name: tmpl.name,
          category: tmpl.category,
          amount,
          date: dateIsoStr,
          notes: `Rincian biaya operasional bulan ke-${monthIndex + 1}`,
          createdBy: 'Admin Utama',
          createdAt: expenseTimestamp,
          updatedAt: expenseTimestamp,
        };

        const opExpRef = adminDb.collection('operating_expenses').doc();
        const expRef = adminDb.collection('expenses').doc(opExpRef.id);
        const cashFlowRef = adminDb.collection('cashflow').doc(opExpRef.id);

        operationsList.push({
          ref: opExpRef,
          secondaryRef: expRef,
          data: expensePayload,
        });

        operationsList.push({
          ref: cashFlowRef,
          data: expensePayload,
        });
      }
    }

    // -------------------------------------------------------------
    // 5. COMMIT ALL BATCH WRITES
    // -------------------------------------------------------------
    await commitBatchOperations(operationsList);

    return NextResponse.json(
      {
        success: true,
        message: 'Berhasil melakukan seeder simulasi transaksi 3 bulan (90 hari) ke Firestore!',
        summary: {
          salesTransactions: totalTransactionsToGenerate,
          stockInLogs: totalRestocks,
          operatingExpenses: monthsAgoList.length * expenseTemplates.length,
          totalFirestoreOperations: operationsList.length,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API /api/admin/seed-simulation POST Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Gagal memproses simulasi seeder data.',
      },
      { status: 500 }
    );
  }
}
