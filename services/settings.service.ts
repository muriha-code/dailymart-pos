import { StoreSettings } from '@/types/settings.types';

export const settingsService = {
  /**
   * Mengambil konfigurasi sistem toko dari API
   */
  async getSettings(): Promise<StoreSettings> {
    const res = await fetch('/api/admin/settings', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memuat pengaturan toko.');
    }
    return json.data;
  },

  /**
   * Menyimpan / memperbarui konfigurasi sistem toko ke API
   */
  async updateSettings(payload: StoreSettings): Promise<void> {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal menyimpan pengaturan toko.');
    }
  },
};
