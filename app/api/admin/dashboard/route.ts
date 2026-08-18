import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Product } from '@/types/product.types';
import { Transaction } from '@/types/transaction.types';
import {
  ChartDataPoint,
  DashboardData,
  LowStockProductItem,
  TopProductItem,
} from '@/types/dashboard.types';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

// Day name array for Indonesian locale formatting (0 = Minggu, 1 = Senin, ...)
const DAY_NAMES_ID = ['Ming', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// Fallback catalog products in case Firestore products collection is unpopulated
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: "prod-001",
    sku: "SM-BRS-001",
    barcode: "8992753123456",
    name: "Beras Premium Ramos 5kg",
    categoryId: "sembako",
    categoryName: "Sembako",
    purchasePrice: 65000,
    sellingPrice: 74000,
    stock: 28,
    minimumStock: 5,
    unit: "sak",
    status: "active",
  },
  {
    id: "prod-002",
    sku: "SM-MYK-002",
    barcode: "8992753123457",
    name: "Minyak Goreng Sania 2L",
    categoryId: "sembako",
    categoryName: "Sembako",
    purchasePrice: 32000,
    sellingPrice: 36500,
    stock: 45,
    minimumStock: 5,
    unit: "pouch",
    status: "active",
  },
  {
    id: "prod-003",
    sku: "SM-GLA-003",
    barcode: "8992753123458",
    name: "Gulaku Gula Pasir Putih 1kg",
    categoryId: "sembako",
    categoryName: "Sembako",
    purchasePrice: 15000,
    sellingPrice: 17500,
    stock: 60,
    minimumStock: 10,
    unit: "bks",
    status: "active",
  },
  {
    id: "prod-004",
    sku: "MK-MIE-001",
    barcode: "8998866200112",
    name: "Indomie Goreng Spesial 85g",
    categoryId: "makanan",
    categoryName: "Makanan",
    purchasePrice: 2800,
    sellingPrice: 3200,
    stock: 150,
    minimumStock: 20,
    unit: "bks",
    status: "active",
  },
  {
    id: "prod-010",
    sku: "SN-CKLT-001",
    barcode: "8991002100511",
    name: "Silverqueen Cashew 58g",
    categoryId: "snack",
    categoryName: "Snack & Biskuit",
    purchasePrice: 13500,
    sellingPrice: 16500,
    stock: 4,
    minimumStock: 5,
    unit: "pcs",
    status: "active",
  },
];

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch Products
    let products: Product[] = [];
    try {
      const prodSnapshot = await adminDb.collection('products').get();
      if (!prodSnapshot.empty) {
        products = prodSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
      } else {
        products = FALLBACK_PRODUCTS;
      }
    } catch (prodErr) {
      console.warn('[API /api/admin/dashboard] Products Firestore query fallback:', prodErr);
      products = FALLBACK_PRODUCTS;
    }

    // 2. Fetch Transactions (ordered desc by createdAt)
    let transactions: Transaction[] = [];
    try {
      const trxSnapshot = await adminDb
        .collection('transactions')
        .orderBy('createdAt', 'desc')
        .get();

      if (!trxSnapshot.empty) {
        transactions = trxSnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
          const data = doc.data();
          let createdAtDate: Date;
          if (data.createdAt?.toDate) {
            createdAtDate = data.createdAt.toDate();
          } else if (typeof data.createdAt === 'string') {
            createdAtDate = new Date(data.createdAt);
          } else {
            createdAtDate = new Date();
          }

          return {
            id: doc.id,
            ...data,
            createdAt: createdAtDate,
          } as Transaction;
        });
      }
    } catch (trxErr) {
      console.warn('[API /api/admin/dashboard] Transactions Firestore query fallback:', trxErr);
      transactions = [];
    }

    // Filter only completed transactions
    const completedTransactions = transactions.filter(
      (t) => !t.status || t.status === 'COMPLETED'
    );

    // 3. Time Calculations
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // 4. Calculate KPI Metrics
    let todayRevenue = 0;
    let todayOrders = 0;
    let totalRevenue = 0;

    completedTransactions.forEach((trx) => {
      const trxTotal = Number(trx.total || 0);
      totalRevenue += trxTotal;

      const trxDate = new Date(trx.createdAt);
      if (trxDate >= startOfToday) {
        todayRevenue += trxTotal;
        todayOrders += 1;
      }
    });

    const activeProducts = products.filter((p) => !p.status || p.status === 'active');
    const totalProducts = activeProducts.length;

    // Critical Stock Filter
    const lowStockProductsList: LowStockProductItem[] = activeProducts
      .filter((p) => {
        const minStock = p.minimumStock !== undefined ? Number(p.minimumStock) : 5;
        return Number(p.stock ?? 0) <= minStock;
      })
      .sort((a, b) => Number(a.stock ?? 0) - Number(b.stock ?? 0))
      .map((p) => ({
        id: p.id || p.sku,
        name: p.name,
        sku: p.sku,
        stock: Number(p.stock ?? 0),
        minimumStock: p.minimumStock !== undefined ? Number(p.minimumStock) : 5,
        unit: p.unit || 'Pcs',
        categoryName: p.categoryName || 'Umum',
      }));

    const lowStockCount = lowStockProductsList.length;

    // 5. Calculate 7-Day Trend Chart Data (Day -6 to Day 0)
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

      const dayTransactions = completedTransactions.filter((trx) => {
        const d = new Date(trx.createdAt);
        return d >= startOfDay && d <= endOfDay;
      });

      const dayRevenue = dayTransactions.reduce((acc, t) => acc + Number(t.total || 0), 0);
      const dayOrders = dayTransactions.length;

      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayName = DAY_NAMES_ID[targetDate.getDay()];

      chartData.push({
        date: dateStr,
        dayName,
        revenue: dayRevenue,
        orders: dayOrders,
      });
    }

    // 6. Calculate Top 5 Best Selling Products
    const productSalesMap = new Map<
      string,
      { id: string; name: string; sku: string; categoryName: string; quantity: number; revenue: number }
    >();

    completedTransactions.forEach((trx) => {
      if (Array.isArray(trx.items)) {
        trx.items.forEach((item) => {
          const pId = item.productId || item.productName;
          const qty = Number(item.quantity || 0);
          const itemRev = Number(item.subtotal || item.price * qty || 0);

          const existing = productSalesMap.get(pId);
          if (existing) {
            existing.quantity += qty;
            existing.revenue += itemRev;
          } else {
            // Find product details from products collection
            const matchedProd = products.find((p) => p.id === item.productId || p.sku === item.productId);
            productSalesMap.set(pId, {
              id: item.productId,
              name: item.productName || matchedProd?.name || 'Produk',
              sku: matchedProd?.sku || 'SKU-UNKN',
              categoryName: matchedProd?.categoryName || 'Umum',
              quantity: qty,
              revenue: itemRev,
            });
          }
        });
      }
    });

    const topProducts: TopProductItem[] = Array.from(productSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Assembly response payload
    const dashboardData: DashboardData = {
      metrics: {
        todayRevenue,
        todayOrders,
        totalRevenue,
        totalProducts,
        lowStockCount,
      },
      chartData,
      topProducts,
      lowStockProducts: lowStockProductsList,
    };

    return NextResponse.json({ success: true, data: dashboardData }, { status: 200 });
  } catch (error: any) {
    console.error('[API /api/admin/dashboard GET Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Gagal mengambil data dashboard analitik.',
      },
      { status: 500 }
    );
  }
}
