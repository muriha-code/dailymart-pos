import {
  CashierShift,
  OpenShiftPayload,
  CloseShiftPayload,
  ShiftValidationResult,
  CashierShiftApiResponse,
} from '@/types/shift.types';

const isDevMode =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_BYPASS_SHIFT_CHECK === 'true';

export const shiftService = {
  /**
   * Mengecek status shift kasir hari ini (apakah ada shift OPEN atau jadwal aktif)
   */
  async checkShiftStatus(params?: { userId?: string; date?: string }): Promise<ShiftValidationResult> {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.date) searchParams.append('date', params.date);

    const query = searchParams.toString();
    try {
      const res = await fetch(`/api/cashier/shifts${query ? `?${query}` : ''}`, {
        cache: 'no-store',
      });
      const json: CashierShiftApiResponse<ShiftValidationResult> = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Gagal memverifikasi status shift kasir.');
      }

      return json.data!;
    } catch (err: any) {
      if (isDevMode) {
        console.warn('[shiftService] Dev mode bypass activated on fetch error:', err?.message);
        const todayStr = params?.date || new Date().toISOString().split('T')[0];
        return {
          hasActiveShift: false,
          activeShift: null,
          hasScheduleToday: true,
          todaySchedule: {
            id: `SCH_DEV_FALLBACK_${todayStr.replace(/-/g, '')}`,
            date: todayStr,
            shiftType: 'SHIFT_PAGI',
            startTime: '00:00',
            endTime: '23:59',
            userName: 'Dev Cashier',
            notes: 'Development Fallback Shift Bypass',
          },
          isWithinShiftTolerance: true,
          toleranceMessage: '',
          currentExpectedCash: 100000,
          currentCashSales: 0,
          currentNonCashSales: 0,
          currentTransactionsCount: 0,
          lastCompletedShift: null,
        };
      }
      throw err;
    }
  },

  /**
   * Buka Shift Kasir (Clock In & Set Modal Awal)
   */
  async openShift(payload: OpenShiftPayload): Promise<CashierShift> {
    const res = await fetch('/api/cashier/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: CashierShiftApiResponse<CashierShift> = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal membuka shift kasir.');
    }

    return json.data!;
  },

  /**
   * Tutup Shift Kasir (Clock Out & Rekonsiliasi Kas)
   */
  async closeShift(payload: CloseShiftPayload): Promise<CashierShift> {
    const res = await fetch('/api/cashier/shifts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: CashierShiftApiResponse<CashierShift> = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal menutup shift kasir.');
    }

    return json.data!;
  },
};

