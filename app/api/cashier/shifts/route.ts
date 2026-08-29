import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { OpenShiftPayload, CloseShiftPayload } from '@/types/shift.types';

// Helper to get today's date formatted as YYYY-MM-DD
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to resolve cashier identity from session cookie or query/body
async function resolveCashier(req: NextRequest, fallbackUid?: string, fallbackName?: string) {
  const sessionCookie = req.cookies.get('session')?.value;
  if (sessionCookie) {
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
      const userData = userDoc.data();
      return {
        uid: decoded.uid,
        displayName: userData?.displayName || decoded.name || decoded.email?.split('@')[0] || 'Kasir',
        email: userData?.email || decoded.email || '',
        role: (userData?.role || decoded.role || 'CASHIER').toUpperCase(),
      };
    } catch (err) {
      console.warn('[Resolve Cashier Auth Warning]:', err);
    }
  }

  if (fallbackUid) {
    return {
      uid: fallbackUid,
      displayName: fallbackName || 'Kasir',
      email: '',
      role: 'CASHIER',
    };
  }

  return null;
}

// Helper to check shift time tolerance (30 mins before startTime until endTime)
function checkTimeTolerance(startTimeStr: string, endTimeStr: string): { isWithin: boolean; message?: string } {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startTimeStr.split(':').map(Number);
    const [endH, endM] = endTimeStr.split(':').map(Number);

    const shiftStartMinutes = startH * 60 + startM;
    let shiftEndMinutes = endH * 60 + endM;

    // Handle shift crossing midnight (e.g. 15:00 - 23:00 or 16:00 - 00:00)
    if (shiftEndMinutes <= shiftStartMinutes) {
      shiftEndMinutes += 24 * 60;
    }

    // 30-minute early clock-in tolerance
    const earlyToleranceMinutes = shiftStartMinutes - 30;

    // If current time is earlier than 30 mins before shift
    if (currentMinutes < earlyToleranceMinutes) {
      const diff = earlyToleranceMinutes - currentMinutes;
      return {
        isWithin: false,
        message: `Shift Anda dimulai pukul ${startTimeStr}. Clock In baru dibuka 30 menit sebelumnya (pukul ${String(Math.floor(earlyToleranceMinutes / 60)).padStart(2, '0')}:${String(earlyToleranceMinutes % 60).padStart(2, '0')}).`,
      };
    }

    // If current time is past shift end time (+ 120 mins grace period to close shift)
    if (currentMinutes > shiftEndMinutes + 120) {
      return {
        isWithin: true, // Allow cashier to still open/finish or prompt
        message: `Waktu kerja telah melampaui jam selesai shift (${endTimeStr}). Harap segera lakukan penutupan kasir.`,
      };
    }

    return { isWithin: true };
  } catch (e) {
    return { isWithin: true };
  }
}

// GET /api/cashier/shifts -> Check Active Shift & Today's Schedule
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryUserId = searchParams.get('userId');
    const dateParam = searchParams.get('date') || getTodayDateString();

    const cashier = await resolveCashier(req, queryUserId || undefined);
    if (!cashier) {
      return NextResponse.json(
        { success: false, message: 'Sesi kasir tidak valid atau tidak terautentikasi.' },
        { status: 401 }
      );
    }

    const isAdmin = cashier.role === 'ADMIN' || cashier.role === 'SUPER_ADMIN';

    // 1. Cek apakah ada shift berstatus OPEN untuk kasir ini
    const activeShiftSnapshot = await adminDb
      .collection('cashier_shifts')
      .where('userId', '==', cashier.uid)
      .where('status', '==', 'OPEN')
      .limit(1)
      .get();

    if (!activeShiftSnapshot.empty) {
      const activeDoc = activeShiftSnapshot.docs[0];
      const shiftData = activeDoc.data();
      const shiftId = activeDoc.id;

      // Hitung live cash & non-cash transactions sejak openedAt
      const openedAtDate = shiftData.openedAt?.toDate ? shiftData.openedAt.toDate() : new Date(shiftData.openedAt);

      const trxSnapshot = await adminDb
        .collection('transactions')
        .where('cashierId', '==', cashier.uid)
        .where('createdAt', '>=', openedAtDate)
        .get();

      let totalCashSales = 0;
      let totalNonCashSales = 0;
      let totalTransactionsCount = 0;

      trxSnapshot.forEach((doc) => {
        const trx = doc.data();
        totalTransactionsCount += 1;
        if (trx.paymentMethod === 'CASH') {
          totalCashSales += Number(trx.total || 0);
        } else {
          totalNonCashSales += Number(trx.total || 0);
        }
      });

      const startingCash = Number(shiftData.startingCash || 0);
      const expectedCash = startingCash + totalCashSales;

      const activeShift = {
        id: shiftId,
        ...shiftData,
        startingCash,
        expectedCash,
        totalCashTransactions: totalCashSales,
        totalNonCashTransactions: totalNonCashSales,
        totalTransactionsCount,
        openedAt: openedAtDate.toISOString(),
      };

      return NextResponse.json({
        success: true,
        data: {
          hasActiveShift: true,
          activeShift,
          hasScheduleToday: true,
          todaySchedule: null,
          isWithinShiftTolerance: true,
          currentExpectedCash: expectedCash,
          currentCashSales: totalCashSales,
          currentNonCashSales: totalNonCashSales,
          currentTransactionsCount: totalTransactionsCount,
        },
      });
    }

    // 2. Jika user adalah ADMIN / SUPER_ADMIN -> Bypass jadwal secara penuh (Bisa Open Shift kapan saja untuk kondisi emergency)
    if (isAdmin) {
      return NextResponse.json({
        success: true,
        data: {
          hasActiveShift: false,
          activeShift: null,
          hasScheduleToday: true,
          todaySchedule: {
            id: `SCH_EMERGENCY_${dateParam.replace(/-/g, '')}_${cashier.uid.substring(0, 6)}`,
            date: dateParam,
            shiftType: 'SHIFT_PAGI',
            startTime: '00:00',
            endTime: '23:59',
            userId: cashier.uid,
            userName: cashier.displayName,
            notes: 'Akses Darurat Admin / Super Admin (Bypass Jadwal)',
          },
          isWithinShiftTolerance: true,
          toleranceMessage: '',
        },
      });
    }

    // 3. Untuk role CASHIER -> Jalankan pengecekan dokumen /schedules sesuai tanggal dan jam shift
    const scheduleSnapshot = await adminDb
      .collection('schedules')
      .where('date', '==', dateParam)
      .where('userId', '==', cashier.uid)
      .limit(1)
      .get();

    let hasScheduleToday = false;
    let todaySchedule: any = null;
    let isWithinShiftTolerance = true;
    let toleranceMessage = '';

    if (!scheduleSnapshot.empty) {
      hasScheduleToday = true;
      const schedDoc = scheduleSnapshot.docs[0];
      const schedData = schedDoc.data();
      todaySchedule = {
        id: schedDoc.id,
        ...schedData,
        createdAt: schedData.createdAt?.toDate ? schedData.createdAt.toDate().toISOString() : schedData.createdAt,
      };

      // Validasi toleransi waktu jam shift (30 menit sebelum shift)
      const tolerance = checkTimeTolerance(schedData.startTime || '07:00', schedData.endTime || '15:00');
      isWithinShiftTolerance = tolerance.isWithin;
      toleranceMessage = tolerance.message || '';
    }

    return NextResponse.json({
      success: true,
      data: {
        hasActiveShift: false,
        activeShift: null,
        hasScheduleToday,
        todaySchedule,
        isWithinShiftTolerance,
        toleranceMessage,
      },
    });
  } catch (error: any) {
    console.error('[API /api/cashier/shifts GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memverifikasi status shift kasir.' },
      { status: 500 }
    );
  }
}

// POST /api/cashier/shifts -> Clock In / Open Shift
export async function POST(req: NextRequest) {
  try {
    const body: OpenShiftPayload = await req.json();
    const { scheduleId, shiftType, startingCash, userId: bodyUid, userName: bodyName } = body;

    const cashier = await resolveCashier(req, bodyUid, bodyName);
    if (!cashier) {
      return NextResponse.json(
        { success: false, message: 'Sesi kasir tidak valid.' },
        { status: 401 }
      );
    }

    if (startingCash === undefined || startingCash === null || isNaN(startingCash) || startingCash < 0) {
      return NextResponse.json(
        { success: false, message: 'Modal awal kasir harus berupa nominal angka valid (>= 0).' },
        { status: 400 }
      );
    }

    // 1. Cek apakah kasir ini sudah punya shift OPEN
    const existingOpenSnap = await adminDb
      .collection('cashier_shifts')
      .where('userId', '==', cashier.uid)
      .where('status', '==', 'OPEN')
      .limit(1)
      .get();

    if (!existingOpenSnap.empty) {
      const doc = existingOpenSnap.docs[0];
      return NextResponse.json({
        success: true,
        message: 'Shift kasir sudah berstatus buka (OPEN).',
        data: { id: doc.id, ...doc.data() },
      });
    }

    const now = new Date();
    const today = getTodayDateString();
    const shiftRef = adminDb.collection('cashier_shifts').doc();

    const newShiftData = {
      userId: cashier.uid,
      userName: cashier.displayName,
      userEmail: cashier.email || '',
      scheduleId: scheduleId || '',
      shiftType: shiftType || 'SHIFT_PAGI',
      date: today,
      startingCash: Number(startingCash),
      expectedCash: Number(startingCash),
      actualCash: 0,
      cashVariance: 0,
      totalCashTransactions: 0,
      totalNonCashTransactions: 0,
      totalTransactionsCount: 0,
      status: 'OPEN' as const,
      openedAt: now,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await shiftRef.set(newShiftData);

    return NextResponse.json(
      {
        success: true,
        message: `Shift ${shiftType === 'SHIFT_PAGI' ? 'Pagi' : 'Sore'} berhasil dibuka. Selamat bertugas!`,
        data: {
          id: shiftRef.id,
          ...newShiftData,
          openedAt: now.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API /api/cashier/shifts POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal membuka shift kasir.' },
      { status: 500 }
    );
  }
}

// PATCH /api/cashier/shifts -> Clock Out / Close Shift (Cash Reconciliation)
export async function PATCH(req: NextRequest) {
  try {
    const body: CloseShiftPayload = await req.json();
    const { shiftId, actualCash, reconciliationNotes } = body;

    if (!shiftId) {
      return NextResponse.json(
        { success: false, message: 'ID Shift diperlukan untuk rekonsiliasi kas.' },
        { status: 400 }
      );
    }

    if (actualCash === undefined || actualCash === null || isNaN(actualCash) || actualCash < 0) {
      return NextResponse.json(
        { success: false, message: 'Nominal fisik kas akhir harus valid (>= 0).' },
        { status: 400 }
      );
    }

    const shiftRef = adminDb.collection('cashier_shifts').doc(shiftId);
    const shiftSnap = await shiftRef.get();

    if (!shiftSnap.exists) {
      return NextResponse.json(
        { success: false, message: 'Dokumen shift kasir tidak ditemukan.' },
        { status: 404 }
      );
    }

    const shiftData = shiftSnap.data()!;
    if (shiftData.status !== 'OPEN') {
      return NextResponse.json(
        { success: false, message: 'Shift ini sudah ditutup sebelumnya.' },
        { status: 400 }
      );
    }

    // Hitung total transaksi kasir selama shift ini
    const openedAtDate = shiftData.openedAt?.toDate ? shiftData.openedAt.toDate() : new Date(shiftData.openedAt);

    const trxSnapshot = await adminDb
      .collection('transactions')
      .where('cashierId', '==', shiftData.userId)
      .where('createdAt', '>=', openedAtDate)
      .get();

    let totalCashSales = 0;
    let totalNonCashSales = 0;
    let totalTransactionsCount = 0;

    trxSnapshot.forEach((doc) => {
      const trx = doc.data();
      totalTransactionsCount += 1;
      if (trx.paymentMethod === 'CASH') {
        totalCashSales += Number(trx.total || 0);
      } else {
        totalNonCashSales += Number(trx.total || 0);
      }
    });

    const startingCash = Number(shiftData.startingCash || 0);
    const expectedCash = startingCash + totalCashSales;
    const finalActualCash = Number(actualCash);
    const cashVariance = finalActualCash - expectedCash; // 0 = Pas, >0 = Lebih, <0 = Kurang
    const now = new Date();

    const updatePayload = {
      expectedCash,
      actualCash: finalActualCash,
      cashVariance,
      totalCashTransactions: totalCashSales,
      totalNonCashTransactions: totalNonCashSales,
      totalTransactionsCount,
      reconciliationNotes: reconciliationNotes || '',
      status: 'COMPLETED' as const,
      closedAt: now,
      updatedAt: now,
    };

    await shiftRef.update(updatePayload);

    return NextResponse.json({
      success: true,
      message: 'Rekonsiliasi kas berhasil. Shift kasir telah ditutup.',
      data: {
        id: shiftId,
        ...shiftData,
        ...updatePayload,
        openedAt: openedAtDate.toISOString(),
        closedAt: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API /api/cashier/shifts PATCH Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menutup shift kasir.' },
      { status: 500 }
    );
  }
}
