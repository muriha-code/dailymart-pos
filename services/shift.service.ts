import {
  CashierShift,
  OpenShiftPayload,
  CloseShiftPayload,
  ShiftValidationResult,
  CashierShiftApiResponse,
} from '@/types/shift.types';

export const shiftService = {
  /**
   * Mengecek status shift kasir hari ini (apakah ada shift OPEN atau jadwal aktif)
   */
  async checkShiftStatus(params?: { userId?: string; date?: string }): Promise<ShiftValidationResult> {
    const searchParams = new URLSearchParams();
    if (params?.userId) searchParams.append('userId', params.userId);
    if (params?.date) searchParams.append('date', params.date);

    const query = searchParams.toString();
    const res = await fetch(`/api/cashier/shifts${query ? `?${query}` : ''}`, {
      cache: 'no-store',
    });
    const json: CashierShiftApiResponse<ShiftValidationResult> = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memverifikasi status shift kasir.');
    }

    return json.data!;
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
