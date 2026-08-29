import {
  Schedule,
  CreateSchedulePayload,
  UpdateSchedulePayload,
  SwapShiftPayload,
  ScheduleApiResponse,
} from '@/types/schedule.types';

export const scheduleService = {
  /**
   * Mengambil daftar jadwal kasir berdasarkan rentang tanggal atau tanggal spesifik
   */
  async getSchedules(params?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    userId?: string;
  }): Promise<Schedule[]> {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.append('date', params.date);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.userId && params.userId !== 'ALL') searchParams.append('userId', params.userId);

    const query = searchParams.toString();
    const res = await fetch(`/api/admin/schedules${query ? `?${query}` : ''}`, {
      cache: 'no-store',
    });
    const json: ScheduleApiResponse<Schedule[]> = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memuat daftar jadwal.');
    }

    return json.data || [];
  },

  /**
   * Menambahkan jadwal baru untuk kasir
   */
  async createSchedule(payload: CreateSchedulePayload): Promise<Schedule> {
    const res = await fetch('/api/admin/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: ScheduleApiResponse<Schedule> = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal membuat jadwal baru.');
    }

    return json.data!;
  },

  /**
   * Memperbarui dokumen jadwal kasir
   */
  async updateSchedule(scheduleId: string, payload: UpdateSchedulePayload): Promise<Schedule> {
    const res = await fetch(`/api/admin/schedules?id=${scheduleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: ScheduleApiResponse<Schedule> = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memperbarui jadwal.');
    }

    return json.data!;
  },

  /**
   * Menukar jadwal shift kasir (Otorisasi Admin)
   */
  async swapShifts(payload: SwapShiftPayload): Promise<void> {
    const res = await fetch('/api/admin/schedules/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: ScheduleApiResponse = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal menukar jadwal shift.');
    }
  },

  /**
   * Menghapus dokumen jadwal
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    const res = await fetch(`/api/admin/schedules?id=${scheduleId}`, {
      method: 'DELETE',
    });
    const json: ScheduleApiResponse = await res.json();

    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal menghapus jadwal.');
    }
  },
};
