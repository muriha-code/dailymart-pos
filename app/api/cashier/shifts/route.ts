import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/src/lib/firebase-admin';
import { OpenShiftPayload, CloseShiftPayload } from '@/types/shift.types';
import { processAutoCloseStaleShifts } from '@/app/api/cron/auto-close-shifts/route';

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

// Helper to check shift time tolerance (30 mins before startTime, 60 mins after startTime)
function checkTimeTolerance(startTimeStr: string, endTimeStr: string): { isWithin: boolean; message?: string } {
  try {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startTimeStr.split(':').map(Number);
    const shiftStartMinutes = startH * 60 + startM;

    // Toleransi: 30 menit sebelum startTime s/d 60 menit setelah startTime
    const earlyToleranceMinutes = shiftStartMinutes - 30;
    const lateToleranceMinutes = shiftStartMinutes + 60;

    if (currentMinutes < earlyToleranceMinutes) {
      return {
        isWithin: false,
        message: `Belum memasuki jam shift Anda (Toleransi 30 menit sebelum jadwal pukul ${startTimeStr}).`,
      };
    }

    if (currentMinutes > lateToleranceMinutes) {
      return {
        isWithin: false,
        message: `Waktu buka shift telah melampaui batas toleransi (Maksimal 60 menit setelah jam jadwal ${startTimeStr}). Harap hubungi Admin.`,
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

    // Auto-close any stale shifts from previous days asynchronously
    processAutoCloseStaleShifts().catch((cErr) => {
      console.warn('[Auto-Close Stale Shift Background Warning]:', cErr);
    });

    // Query last completed shift for relay cash option
    let lastCompletedShift: any = null;
    try {
      const lastCompletedSnap = await adminDb
        .collection('cashier_shifts')
        .where('status', '==', 'COMPLETED')
        .orderBy('closedAt', 'desc')
        .limit(1)
        .get();

      if (!lastCompletedSnap.empty) {
        const lastDoc = lastCompletedSnap.docs[0].data();
        lastCompletedShift = {
          actualCash: Number(lastDoc.actualCash || 0),
          closedAt: lastDoc.closedAt?.toDate ? lastDoc.closedAt.toDate().toISOString() : lastDoc.closedAt,
          userName: lastDoc.userName || 'Kasir Sebelumnya',
          shiftType: lastDoc.shiftType || 'SHIFT_PAGI',
        };
      }
    } catch (lcErr) {
      console.warn('Gagal mengambil data lastCompletedShift:', lcErr);
    }

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
          lastCompletedShift,
        },
      });
    }

    // 2. Jika user adalah ADMIN / SUPER_ADMIN -> Bypass jadwal secara penuh
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
          lastCompletedShift,
        },
      });
    }

    // 3. Untuk role CASHIER -> Pengecekan Jadwal
    const DAY_INDEX_MAP: ('sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday')[] = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];

    const [y, m, d] = dateParam.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayOfWeekName = DAY_INDEX_MAP[dateObj.getUTCDay()];

    const scheduleSnapshot = await adminDb
      .collection('schedules')
      .where('date', '==', dateParam)
      .get();

    const todayOverrides = scheduleSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    let hasScheduleToday = false;
    let todaySchedule: any = null;
    let isWithinShiftTolerance = true;
    let toleranceMessage = '';

    const directUserOverride = todayOverrides.find((s) => s.userId === cashier.uid);

    if (directUserOverride) {
      hasScheduleToday = true;
      todaySchedule = {
        id: directUserOverride.id,
        date: dateParam,
        shiftType: directUserOverride.shiftType || 'SHIFT_PAGI',
        startTime: directUserOverride.startTime || (directUserOverride.shiftType === 'SHIFT_SORE' ? '15:00' : '07:00'),
        endTime: directUserOverride.endTime || (directUserOverride.shiftType === 'SHIFT_SORE' ? '23:00' : '15:00'),
        userId: cashier.uid,
        userName: directUserOverride.userName || cashier.displayName,
        notes: directUserOverride.notes || 'Pengecualian Jadwal Tanggal (Tukar/Manual)',
        isOverride: true,
        source: 'OVERRIDE',
        createdAt: directUserOverride.createdAt?.toDate ? directUserOverride.createdAt.toDate().toISOString() : directUserOverride.createdAt,
      };
    } else {
      try {
        const templateDoc = await adminDb.collection('schedule_templates').doc('default').get();
        if (templateDoc.exists) {
          const templateData = templateDoc.data();
          const dayTemplate = templateData?.days?.[dayOfWeekName];

          if (dayTemplate) {
            const isAssignedPagi = dayTemplate.pagi?.userId === cashier.uid;
            const isPagiOverriddenByOther = todayOverrides.some((s) => s.shiftType === 'SHIFT_PAGI' && s.userId !== cashier.uid);

            const isAssignedSore = dayTemplate.sore?.userId === cashier.uid;
            const isSoreOverriddenByOther = todayOverrides.some((s) => s.shiftType === 'SHIFT_SORE' && s.userId !== cashier.uid);

            if (isAssignedPagi && !isPagiOverriddenByOther) {
              hasScheduleToday = true;
              const pagiInfo = dayTemplate.pagi;
              todaySchedule = {
                id: `SCH_TMPL_${dateParam.replace(/-/g, '')}_PAGI_${cashier.uid.substring(0, 6)}`,
                date: dateParam,
                shiftType: 'SHIFT_PAGI',
                startTime: pagiInfo.startTime || '07:00',
                endTime: pagiInfo.endTime || '15:00',
                userId: cashier.uid,
                userName: pagiInfo.userName || cashier.displayName,
                notes: pagiInfo.notes || 'Jadwal Tetap Kasir (Shift Pagi)',
                isOverride: false,
                source: 'TEMPLATE',
              };
            } else if (isAssignedSore && !isSoreOverriddenByOther) {
              hasScheduleToday = true;
              const soreInfo = dayTemplate.sore;
              todaySchedule = {
                id: `SCH_TMPL_${dateParam.replace(/-/g, '')}_SORE_${cashier.uid.substring(0, 6)}`,
                date: dateParam,
                shiftType: 'SHIFT_SORE',
                startTime: soreInfo.startTime || '15:00',
                endTime: soreInfo.endTime || '23:00',
                userId: cashier.uid,
                userName: soreInfo.userName || cashier.displayName,
                notes: soreInfo.notes || 'Jadwal Tetap Kasir (Shift Sore)',
                isOverride: false,
                source: 'TEMPLATE',
              };
            }
          }
        }
      } catch (tmplErr) {
        console.warn('[Cashier Shift Template Fallback Warning]:', tmplErr);
      }
    }

    if (hasScheduleToday && todaySchedule) {
      const tolerance = checkTimeTolerance(todaySchedule.startTime || '07:00', todaySchedule.endTime || '15:00');
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
        lastCompletedShift,
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
    const cashVariance = finalActualCash - expectedCash;
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
