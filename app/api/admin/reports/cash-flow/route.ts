import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  CashFlowReportResponse,
  CashFlowSummary,
  CashFlowChartItem,
  CategoryProfitItem,
  DailyCashFlowBreakdown,
  CategoryFilterOption,
} from '@/types/cashFlowReport.types';

// Helper parsing Firestore Date
function parseFirestoreDate(rawDate: any): Date {
  if (!rawDate) return new Date();
  if (typeof rawDate.toDate === 'function') {
    return rawDate.toDate();
  }
  if (typeof rawDate === 'object') {
    if (rawDate.seconds !== undefined) return new Date(rawDate.seconds * 1000);
    if (rawDate._seconds !== undefined) return new Date(rawDate._seconds * 1000);
  }
  const d = new Date(rawDate);
  return isNaN(d.getTime()) ? new Date() : d;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'all';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const categoryIdParam = searchParams.get('categoryId');

    // 1. Fetch Products & Categories to map purchasePrice (HPP) & categories
    const productsSnapshot = await adminDb.collection('products').get();
    const productMap: Record<
      string,
      { purchasePrice: number; categoryId: string; categoryName: string; name: string }
    > = {};
    const productNameMap: Record<
      string,
      { purchasePrice: number; categoryId: string; categoryName: string }
    > = {};

    productsSnapshot.forEach((doc) => {
      const data = doc.data();
      const pId = doc.id;
      const purchasePrice = Number(data.purchasePrice ?? data.costPrice ?? 0);
      const categoryId = data.categoryId || '';
      const categoryName = data.categoryName || 'Umum';
      const name = data.name || data.productName || '';

      const info = { purchasePrice, categoryId, categoryName, name };
      productMap[pId] = info;
      if (name) {
        productNameMap[name.toLowerCase()] = info;
      }
    });

    // Fetch categories collection if available
    const categoriesSnapshot = await adminDb.collection('categories').get();
    const categoriesMap: Record<string, string> = {};
    categoriesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name) {
        categoriesMap[doc.id] = data.name;
      }
    });

    // Compile dynamic categories list
    const categoryOptionsMap: Record<string, string> = {};
    Object.keys(categoriesMap).forEach((id) => {
      categoryOptionsMap[id] = categoriesMap[id];
    });
    Object.values(productMap).forEach((p) => {
      if (p.categoryId && p.categoryName) {
        categoryOptionsMap[p.categoryId] = p.categoryName;
      }
    });

    const categories: CategoryFilterOption[] = [
      { id: 'ALL', name: 'Semua Kategori' },
      ...Object.entries(categoryOptionsMap).map(([id, name]) => ({ id, name })),
    ];

    // 2. Fetch Transactions & Operating Expenses from Firestore
    const [transactionsSnapshot, expensesSnapshot] = await Promise.all([
      adminDb.collection('transactions').get(),
      adminDb.collection('operating_expenses').get().catch(() => ({ docs: [], empty: true })),
    ]);

    let allTransactions: any[] = [];
    transactionsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === 'CANCELLED') return; // Exclude cancelled
      allTransactions.push({
        id: doc.id,
        ...data,
        parsedCreatedAt: parseFirestoreDate(data.createdAt),
      });
    });

    let allExpenses: any[] = [];
    if (!expensesSnapshot.empty && Array.isArray((expensesSnapshot as any).docs)) {
      (expensesSnapshot as any).docs.forEach((doc: any) => {
        const data = doc.data();
        const parsedDate = parseFirestoreDate(data.date || data.createdAt);
        allExpenses.push({
          id: doc.id,
          name: data.name,
          category: data.category,
          amount: Number(data.amount || 0),
          parsedDate,
        });
      });
    }

    // 3. Date Filtering
    const now = new Date();
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (period === 'today') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === '7days') {
      filterStart = new Date();
      filterStart.setDate(now.getDate() - 6);
      filterStart.setHours(0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === '30days') {
      filterStart = new Date();
      filterStart.setDate(now.getDate() - 29);
      filterStart.setHours(0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'thisMonth') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'custom' && startDateParam) {
      filterStart = new Date(startDateParam);
      filterStart.setHours(0, 0, 0, 0);
      if (endDateParam) {
        filterEnd = new Date(endDateParam);
        filterEnd.setHours(23, 59, 59, 999);
      }
    }

    const filteredTransactions = allTransactions.filter((tx) => {
      const txDate: Date = tx.parsedCreatedAt;
      if (filterStart && txDate < filterStart) return false;
      if (filterEnd && txDate > filterEnd) return false;
      return true;
    });

    const filteredExpenses = allExpenses.filter((exp) => {
      const expDate: Date = exp.parsedDate;
      if (filterStart && expDate < filterStart) return false;
      if (filterEnd && expDate > filterEnd) return false;
      return true;
    });

    // 4. Agregasi data Arus Kas & Pendapatan
    let totalGrossRevenue = 0;
    let totalCogs = 0;
    let totalOperatingExpenses = 0;

    const dailyMap: Record<
      string,
      {
        isoDate: string;
        formattedDate: string;
        chartLabel: string;
        transactionCount: number;
        grossRevenue: number;
        totalCogs: number;
        grossProfit: number;
        operatingExpenses: number;
        netProfit: number;
        txIds: Set<string>;
      }
    > = {};

    const categoryProfitMap: Record<string, number> = {};

    filteredTransactions.forEach((tx) => {
      const txDate: Date = tx.parsedCreatedAt;
      const year = txDate.getFullYear();
      const month = String(txDate.getMonth() + 1).padStart(2, '0');
      const day = String(txDate.getDate()).padStart(2, '0');
      const isoDate = `${year}-${month}-${day}`;

      const chartLabel = txDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
      });
      const formattedDate = txDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const items = tx.items || [];
      items.forEach((item: any) => {
        const qty = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        const itemDiscount = Number(item.discount || 0);
        const itemRevenue = item.subtotal !== undefined ? Number(item.subtotal) : price * qty - itemDiscount;

        // Determine product info
        const pId = item.productId || '';
        const pName = (item.productName || '').toLowerCase();
        const pInfo = productMap[pId] || productNameMap[pName] || null;

        const catId = item.categoryId || pInfo?.categoryId || '';
        const catName = item.categoryName || pInfo?.categoryName || categoryOptionsMap[catId] || 'Lainnya';

        // Filter category if specified
        if (categoryIdParam && categoryIdParam !== 'ALL' && catId !== categoryIdParam) {
          return;
        }

        // HPP / COGS calculation (Priority: snapshot costPrice -> purchasePrice -> master product purchasePrice -> 72% estimate)
        let unitCostPrice = 0;
        if (item.costPrice !== undefined && item.costPrice !== null) {
          unitCostPrice = Number(item.costPrice);
        } else if (item.purchasePrice !== undefined && item.purchasePrice !== null) {
          unitCostPrice = Number(item.purchasePrice);
        } else if (pInfo && pInfo.purchasePrice > 0) {
          unitCostPrice = pInfo.purchasePrice;
        } else {
          unitCostPrice = Math.round(price * 0.72);
        }

        const itemCogs = unitCostPrice * qty;
        const itemProfit = itemRevenue - itemCogs;

        totalGrossRevenue += itemRevenue;
        totalCogs += itemCogs;

        // Daily breakdown aggregation
        if (!dailyMap[isoDate]) {
          dailyMap[isoDate] = {
            isoDate,
            formattedDate,
            chartLabel,
            transactionCount: 0,
            grossRevenue: 0,
            totalCogs: 0,
            grossProfit: 0,
            operatingExpenses: 0,
            netProfit: 0,
            txIds: new Set<string>(),
          };
        }

        dailyMap[isoDate].grossRevenue += itemRevenue;
        dailyMap[isoDate].totalCogs += itemCogs;
        dailyMap[isoDate].grossProfit += itemProfit;
        if (tx.id || tx.invoiceNumber) {
          dailyMap[isoDate].txIds.add(tx.id || tx.invoiceNumber);
        }
      });
    });

    // Aggregate Operating Expenses per day
    filteredExpenses.forEach((exp) => {
      const expDate: Date = exp.parsedDate;
      const year = expDate.getFullYear();
      const month = String(expDate.getMonth() + 1).padStart(2, '0');
      const day = String(expDate.getDate()).padStart(2, '0');
      const isoDate = `${year}-${month}-${day}`;

      const expAmount = Number(exp.amount || 0);
      totalOperatingExpenses += expAmount;

      const chartLabel = expDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
      });
      const formattedDate = expDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      if (!dailyMap[isoDate]) {
        dailyMap[isoDate] = {
          isoDate,
          formattedDate,
          chartLabel,
          transactionCount: 0,
          grossRevenue: 0,
          totalCogs: 0,
          grossProfit: 0,
          operatingExpenses: 0,
          netProfit: 0,
          txIds: new Set<string>(),
        };
      }

      dailyMap[isoDate].operatingExpenses += expAmount;
    });

    // Update daily transaction count and Net Profit
    Object.keys(dailyMap).forEach((dateKey) => {
      const d = dailyMap[dateKey];
      d.transactionCount = d.txIds.size;
      d.netProfit = d.grossProfit - d.operatingExpenses;
    });

    const totalGrossProfit = totalGrossRevenue - totalCogs;
    const netProfit = totalGrossProfit - totalOperatingExpenses;
    const marginPercentage =
      totalGrossRevenue > 0
        ? Number(((totalGrossProfit / totalGrossRevenue) * 100).toFixed(2))
        : 0;

    // Build Chart Data (sorted by date ascending)
    const sortedDatesAsc = Object.keys(dailyMap).sort((a, b) => a.localeCompare(b));
    const chartData: CashFlowChartItem[] = sortedDatesAsc.map((dateKey) => {
      const d = dailyMap[dateKey];
      return {
        date: d.chartLabel,
        revenue: d.grossRevenue,
        cogs: d.totalCogs,
        profit: d.grossProfit,
        operatingExpenses: d.operatingExpenses,
        netProfit: d.netProfit,
      };
    });

    // Build Category Profit Distribution (Donut Chart)
    filteredTransactions.forEach((tx) => {
      const items = tx.items || [];
      items.forEach((item: any) => {
        const qty = Number(item.quantity || 1);
        const price = Number(item.price || 0);
        const itemDiscount = Number(item.discount || 0);
        const itemRevenue = item.subtotal !== undefined ? Number(item.subtotal) : price * qty - itemDiscount;

        const pId = item.productId || '';
        const pName = (item.productName || '').toLowerCase();
        const pInfo = productMap[pId] || productNameMap[pName] || null;

        const catId = item.categoryId || pInfo?.categoryId || '';
        const catName = item.categoryName || pInfo?.categoryName || categoryOptionsMap[catId] || 'Lainnya';

        if (categoryIdParam && categoryIdParam !== 'ALL' && catId !== categoryIdParam) {
          return;
        }

        let unitCostPrice = 0;
        if (item.costPrice !== undefined && item.costPrice !== null) {
          unitCostPrice = Number(item.costPrice);
        } else if (item.purchasePrice !== undefined && item.purchasePrice !== null) {
          unitCostPrice = Number(item.purchasePrice);
        } else if (pInfo && pInfo.purchasePrice > 0) {
          unitCostPrice = pInfo.purchasePrice;
        } else {
          unitCostPrice = Math.round(price * 0.72);
        }

        const itemCogs = unitCostPrice * qty;
        const itemProfit = itemRevenue - itemCogs;

        categoryProfitMap[catName] = (categoryProfitMap[catName] || 0) + itemProfit;
      });
    });

    const categoryProfit: CategoryProfitItem[] = Object.entries(categoryProfitMap)
      .map(([name, value]) => ({ name, value: Math.max(0, value) }))
      .sort((a, b) => b.value - a.value);

    // Build Daily Breakdown (sorted by date descending for table)
    const sortedDatesDesc = Object.keys(dailyMap).sort((a, b) => b.localeCompare(a));
    const dailyBreakdown: DailyCashFlowBreakdown[] = sortedDatesDesc.map((dateKey) => {
      const d = dailyMap[dateKey];
      const margin =
        d.grossRevenue > 0 ? Number(((d.grossProfit / d.grossRevenue) * 100).toFixed(2)) : 0;
      return {
        date: d.isoDate,
        formattedDate: d.formattedDate,
        transactionCount: d.transactionCount,
        grossRevenue: d.grossRevenue,
        totalCogs: d.totalCogs,
        grossProfit: d.grossProfit,
        operatingExpenses: d.operatingExpenses,
        netProfit: d.netProfit,
        margin,
      };
    });

    const summary: CashFlowSummary = {
      grossRevenue: totalGrossRevenue,
      totalCogs,
      grossProfit: totalGrossProfit,
      totalOperatingExpenses,
      netProfit,
      marginPercentage,
    };

    const responseData: CashFlowReportResponse = {
      summary,
      chartData,
      categoryProfit,
      dailyBreakdown,
      categories,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('[API /api/admin/reports/cash-flow GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mengambil data laporan arus kas.' },
      { status: 500 }
    );
  }
}
