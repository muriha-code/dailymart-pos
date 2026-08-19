import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  SalesReportResponse,
  DailySalesChartData,
  PaymentMethodBreakdown,
  TopSellingProduct,
  TransactionReportItem,
} from '@/types/salesReport.types';
import { PaymentMethod } from '@/types/transaction.types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'all';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const cashierIdParam = searchParams.get('cashierId');
    const paymentMethodParam = searchParams.get('paymentMethod');

    // 1. Fetch transactions from Firestore
    const snapshot = await adminDb.collection('transactions').get();
    let allTransactions: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      allTransactions.push({
        id: doc.id,
        ...data,
      });
    });

    // 2. Date Filtering Logic
    const now = new Date();
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (period === 'today') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === '7days') {
      filterStart = new Date();
      filterStart.setDate(now.getDate() - 6);
      filterStart.setHours(0, 0, 0, 0);
    } else if (period === 'thisMonth') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === 'thisYear') {
      filterStart = new Date(now.getFullYear(), 0, 1);
    } else if (period === 'custom' && startDateParam) {
      filterStart = new Date(startDateParam);
      filterStart.setHours(0, 0, 0, 0);
      if (endDateParam) {
        filterEnd = new Date(endDateParam);
        filterEnd.setHours(23, 59, 59, 999);
      }
    }

    // Apply Filter
    const filtered = allTransactions.filter((tx) => {
      const txDate = tx.createdAt ? new Date(tx.createdAt) : null;
      if (!txDate || isNaN(txDate.getTime())) return true;

      if (filterStart && txDate < filterStart) return false;
      if (filterEnd && txDate > filterEnd) return false;
      if (cashierIdParam && cashierIdParam !== 'ALL' && tx.cashierId !== cashierIdParam) return false;
      if (paymentMethodParam && paymentMethodParam !== 'ALL' && tx.paymentMethod !== paymentMethodParam) return false;

      return true;
    });

    // Sort by date desc
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 3. Compute Summary KPI
    let totalRevenue = 0;
    let totalItemsSold = 0;
    const paymentMap: Record<string, { amount: number; count: number }> = {
      CASH: { amount: 0, count: 0 },
      QRIS: { amount: 0, count: 0 },
      DEBIT: { amount: 0, count: 0 },
    };
    const dailyMap: Record<string, { revenue: number; transactions: number }> = {};
    const productMap: Record<string, TopSellingProduct> = {};

    filtered.forEach((tx) => {
      const grandTotal = tx.grandTotal || tx.subtotal || 0;
      totalRevenue += grandTotal;

      // Payment method breakdown
      const method = (tx.paymentMethod as PaymentMethod) || 'CASH';
      if (!paymentMap[method]) {
        paymentMap[method] = { amount: 0, count: 0 };
      }
      paymentMap[method].amount += grandTotal;
      paymentMap[method].count += 1;

      // Daily chart aggregation
      const d = tx.createdAt ? new Date(tx.createdAt) : new Date();
      const dateKey = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { revenue: 0, transactions: 0 };
      }
      dailyMap[dateKey].revenue += grandTotal;
      dailyMap[dateKey].transactions += 1;

      // Items & Top Products aggregation
      const items = tx.items || [];
      items.forEach((it: any) => {
        const qty = it.quantity || 1;
        totalItemsSold += qty;

        const pId = it.productId || it.productName || 'UNKNOWN';
        if (!productMap[pId]) {
          productMap[pId] = {
            productId: pId,
            sku: it.sku || pId,
            productName: it.productName || 'Produk Non-SKU',
            categoryName: it.categoryName || 'Umum',
            quantitySold: 0,
            totalRevenue: 0,
          };
        }
        productMap[pId].quantitySold += qty;
        productMap[pId].totalRevenue += it.subtotal || it.price * qty;
      });
    });

    const totalTransactions = filtered.length;
    const averageTransactionValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    // Format Daily Chart Data
    const dailyChart: DailySalesChartData[] = Object.keys(dailyMap).map((date) => ({
      date,
      revenue: dailyMap[date].revenue,
      transactions: dailyMap[date].transactions,
    }));

    // Format Payment Breakdown Data
    const paymentBreakdown: PaymentMethodBreakdown[] = (['CASH', 'QRIS', 'DEBIT'] as PaymentMethod[]).map(
      (method) => {
        const item = paymentMap[method] || { amount: 0, count: 0 };
        return {
          method,
          amount: item.amount,
          count: item.count,
          percentage: totalRevenue > 0 ? Math.round((item.amount / totalRevenue) * 100) : 0,
        };
      }
    );

    // Format Top Products Data (Top 5)
    const topProducts: TopSellingProduct[] = Object.values(productMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // Format Transaction Items List
    const transactionList: TransactionReportItem[] = filtered.map((tx) => ({
      id: tx.id,
      invoiceNumber: tx.invoiceNumber || tx.id,
      date: tx.createdAt
        ? new Date(tx.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '-',
      cashierName: tx.cashierName || 'Kasir POS',
      paymentMethod: (tx.paymentMethod as PaymentMethod) || 'CASH',
      subtotal: tx.subtotal || 0,
      discountTotal: tx.discountTotal || 0,
      grandTotal: tx.grandTotal || tx.subtotal || 0,
      itemsCount: (tx.items || []).length,
    }));

    const responseData: SalesReportResponse = {
      summary: {
        totalRevenue,
        totalTransactions,
        totalItemsSold,
        averageTransactionValue,
      },
      dailyChart,
      paymentBreakdown,
      topProducts,
      transactions: transactionList,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('[API /api/admin/reports/sales GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mengambil data laporan penjualan.' },
      { status: 500 }
    );
  }
}
