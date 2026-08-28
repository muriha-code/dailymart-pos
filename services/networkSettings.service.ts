import { NetworkSettings } from '@/types/network.types';

export const networkSettingsService = {
  /**
   * Fetch system network settings from API
   */
  async getSettings(): Promise<NetworkSettings> {
    const res = await fetch('/api/admin/settings/network', {
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal memuat pengaturan jaringan.');
    }
    return json.data as NetworkSettings;
  },

  /**
   * Save / update system network settings
   */
  async updateSettings(data: NetworkSettings): Promise<NetworkSettings> {
    const res = await fetch('/api/admin/settings/network', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal menyimpan pengaturan jaringan.');
    }
    return json.data as NetworkSettings;
  },

  /**
   * Auto-detect client current public IP address
   */
  async detectMyIp(): Promise<string> {
    try {
      const publicRes = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
      if (publicRes.ok) {
        const data = await publicRes.json();
        if (data?.ip) return data.ip as string;
      }
    } catch {
      // Fallback downstream if client fetch fails
    }

    const res = await fetch('/api/network/my-ip', {
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Gagal mendeteksi IP saat ini.');
    }
    return json.ip as string;
  },
};
