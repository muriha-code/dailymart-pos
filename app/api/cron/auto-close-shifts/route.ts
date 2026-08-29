import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/src/lib/firebase-admin';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function processAutoCloseStaleShifts() {
  const todayStr = getTodayDateString();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const openShiftsSnap = await adminDb
    .collection('cashier_shifts')
    .where('status', '==', 'OPEN')
    .get();

  if (openShiftsSnap.empty) {
    return { autoClosedCount: 0, details: [] };
  }

  let autoClosedCount = 0;
  const details: any[] = [];
  const now = new Date();

  for (const docSnap of openShiftsSnap.docs) {
    const shiftData = docSnap.data();
    const shiftDate = shiftData.date || '';
    const openedAt = shiftData.openedAt?.toDate ? shiftData.openedAt.toDate() : new Date(shiftData.openedAt || now);

    // Stale condition: Shift date is before today, OR openedAt is before today's 00:00:00
    const isBeforeToday = shiftDate < todayStr || openedAt < startOfToday;

    if (isBeforeToday) {
      // Calculate transactions for this shift
      const trxSnap = await adminDb
        .collection('transactions')
        .where('cashierId', '==', shiftData.userId)
        .where('createdAt', '>=', openedAt)
        .where('createdAt', '<', startOfToday)
        .get();

      let totalCashSales = 0;
      let totalNonCashSales = 0;
      let totalTransactionsCount = 0;

      trxSnap.forEach((tDoc) => {
        const trx = tDoc.data();
        totalTransactionsCount += 1;
        if (trx.paymentMethod === 'CASH') {
          totalCashSales += Number(trx.total || 0);
        } else {
          totalNonCashSales += Number(trx.total || 0);
        }
      });

      const startingCash = Number(shiftData.startingCash || 0);
      const expectedCash = startingCash + totalCashSales;
      const actualCash = 0; // Force closed with 0 cash input
      const cashVariance = actualCash - expectedCash;

      const updatePayload = {
        expectedCash,
        actualCash,
        cashVariance,
        totalCashTransactions: totalCashSales,
        totalNonCashTransactions: totalNonCashSales,
        totalTransactionsCount,
        reconciliationNotes: 'Ditutup otomatis oleh sistem (Auto Force-Close melewati pukul 23:59)',
        status: 'AUTO_CLOSED' as const,
        closedAt: now,
        updatedAt: now,
      };

      await docSnap.ref.update(updatePayload);

      // Create System Warning Log in Firestore
      await adminDb.collection('system_logs').add({
        type: 'AUTO_SHIFT_CLOSED',
        shiftId: docSnap.id,
        userId: shiftData.userId,
        userName: shiftData.userName || 'Kasir',
        shiftDate: shiftData.date,
        title: 'Shift Ditutup Otomatis (Lupa Close Shift)',
        message: `Shift kasir ${shiftData.userName || 'Kasir'} (${shiftData.shiftType || 'SHIFT'}) tanggal ${shiftData.date} ditutup otomatis oleh sistem karena melewati pukul 23:59.`,
        createdAt: now,
      });

      autoClosedCount += 1;
      details.push({
        shiftId: docSnap.id,
        userId: shiftData.userId,
        userName: shiftData.userName,
        shiftDate,
      });
    }
  }

  return { autoClosedCount, details };
}

export async function GET(req: NextRequest) {
  try {
    const result = await processAutoCloseStaleShifts();
    return NextResponse.json({
      success: true,
      message: `Berhasil memproses ${result.autoClosedCount} shift menggantung.`,
      ...result,
    });
  } catch (error: any) {
    console.error('[Cron Auto-Close Shifts Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memproses otomatisasi penutupan shift.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
