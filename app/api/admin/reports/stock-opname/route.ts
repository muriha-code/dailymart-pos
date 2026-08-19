import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import {
  StockOpnameReportResponse,
  StockOpnameAuditItem,
  TopDiscrepancyProduct,
} from '@/types/stockOpnameReport.types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'all';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const statusFilter = searchParams.get('statusFilter') || 'ALL';
    const search = searchParams.get('search') || '';

    // 1. Fetch products map for purchase price / HPP calculation
    const productsSnap = await adminDb.collection('products').get();
    const productPriceMap: Record<string, number> = {};
    productsSnap.forEach((doc) => {
      const data = doc.data();
      const hpp = data.purchasePrice || (data.sellingPrice ? Math.round(data.sellingPrice * 0.75) : 15000);
      productPriceMap[doc.id] = hpp;
      if (data.sku) productPriceMap[data.sku] = hpp;
    });

    // 2. Fetch stock_audits from Firestore
    const snapshot = await adminDb.collection('stock_audits').get();
    let rawAudits: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      rawAudits.push({
        id: doc.id,
        ...data,
      });
    });

    // 3. Date Filtering
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
    } else if (period === 'custom' && startDateParam) {
      filterStart = new Date(startDateParam);
      filterStart.setHours(0, 0, 0, 0);
      if (endDateParam) {
        filterEnd = new Date(endDateParam);
        filterEnd.setHours(23, 59, 59, 999);
      }
    }

    // Apply Filter Logic
    const filtered = rawAudits.filter((audit) => {
      // Date Check
      let auditDate: Date | null = null;
      if (audit.createdAt) {
        if (typeof audit.createdAt === 'string') {
          auditDate = new Date(audit.createdAt);
        } else if (audit.createdAt.toDate) {
          auditDate = audit.createdAt.toDate();
        }
      }
      if (auditDate && !isNaN(auditDate.getTime())) {
        if (filterStart && auditDate < filterStart) return false;
        if (filterEnd && auditDate > filterEnd) return false;
      }

      // Status Check
      const diff = audit.difference ?? audit.diff ?? (audit.physicalStock - audit.systemStock) ?? 0;
      if (statusFilter === 'MATCHED' && diff !== 0) return false;
      if (statusFilter === 'DEFICIT' && diff >= 0) return false;
      if (statusFilter === 'SURPLUS' && diff <= 0) return false;

      // Search Query Check
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const pName = (audit.productName || '').toLowerCase();
        const sku = (audit.sku || '').toLowerCase();
        const auditor = (audit.auditorName || '').toLowerCase();
        const notes = (audit.notes || audit.reason || '').toLowerCase();

        if (!pName.includes(query) && !sku.includes(query) && !auditor.includes(query) && !notes.includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Sort by date desc
    filtered.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // 4. Aggregations
    let totalLossRp = 0;
    let totalSurplusRp = 0;
    let matchedCount = 0;
    let deficitCount = 0;
    let surplusCount = 0;

    const discrepancyMap: Record<string, number> = {};

    const auditsList: StockOpnameAuditItem[] = filtered.map((audit, idx) => {
      const diff = audit.difference ?? audit.diff ?? (audit.physicalStock - audit.systemStock) ?? 0;
      const hpp = productPriceMap[audit.productId] || productPriceMap[audit.sku] || 15000;
      const impactValueRp = Math.abs(diff) * hpp;

      if (diff === 0) {
        matchedCount++;
      } else if (diff < 0) {
        deficitCount++;
        totalLossRp += impactValueRp;
      } else {
        surplusCount++;
        totalSurplusRp += impactValueRp;
      }

      // Top discrepancy aggregation
      if (diff !== 0) {
        const pName = audit.productName || 'Produk Non-Nama';
        discrepancyMap[pName] = (discrepancyMap[pName] || 0) + impactValueRp;
      }

      // Formatting date
      let formattedDate = '-';
      if (audit.createdAt) {
        const d = audit.createdAt.toDate ? audit.createdAt.toDate() : new Date(audit.createdAt);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      }

      return {
        id: audit.id,
        auditCode: audit.auditCode || `AUD-${(idx + 1).toString().padStart(4, '0')}`,
        date: formattedDate,
        sku: audit.sku || 'DM-UMM-001',
        productName: audit.productName || 'Produk',
        auditorName: audit.auditorName || 'Staff Gudang',
        systemStock: audit.systemStock ?? 0,
        physicalStock: audit.physicalStock ?? 0,
        diff,
        impactValueRp,
        notes: audit.notes || audit.reason || 'Pemeriksaan stok fisik rutin.',
        reason: audit.reason || 'Opname Rutin',
        categoryName: audit.categoryName || 'Umum',
      };
    });

    const totalAudited = filtered.length;
    const accuracyRate = totalAudited > 0 ? parseFloat(((matchedCount / totalAudited) * 100).toFixed(1)) : 0;

    // Status Distribution (Recharts Donut)
    const statusDistribution = [
      { name: 'Sesuai', value: matchedCount, color: '#10b981' },
      { name: 'Selisih Kurang', value: deficitCount, color: '#ef4444' },
      { name: 'Selisih Lebih', value: surplusCount, color: '#3b82f6' },
    ];

    // Top Discrepancies (Recharts Horizontal Bar)
    const topDiscrepancies: TopDiscrepancyProduct[] = Object.keys(discrepancyMap)
      .map((pName) => ({
        productName: pName,
        discrepancyValue: discrepancyMap[pName],
      }))
      .sort((a, b) => b.discrepancyValue - a.discrepancyValue)
      .slice(0, 5);

    const responseData: StockOpnameReportResponse = {
      summary: {
        totalAudited,
        accuracyRate,
        totalLossRp,
        totalSurplusRp,
      },
      statusDistribution,
      topDiscrepancies,
      audits: auditsList,
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error: any) {
    console.error('[API /api/admin/reports/stock-opname GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memuat laporan stock opname.' },
      { status: 500 }
    );
  }
}
