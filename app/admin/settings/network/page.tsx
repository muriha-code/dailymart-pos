"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { NetworkSettings } from "@/types/network.types";
import { networkSettingsService } from "@/services/networkSettings.service";

// Regex validation for IPv4 & IPv6 addresses
const IP_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

export default function SuperAdminNetworkSettingsPage() {
  const [settings, setSettings] = useState<NetworkSettings>({
    ipProtectionEnabled: false,
    allowedIPs: [],
    updatedAt: new Date().toISOString(),
    updatedBy: "Super Admin",
  });

  const [newIpInput, setNewIpInput] = useState<string>("");
  const [currentClientIp, setCurrentClientIp] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  // Load current Network Settings & detect current client IP
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [netData, myIp] = await Promise.all([
        networkSettingsService.getSettings(),
        networkSettingsService.detectMyIp().catch(() => "127.0.0.1"),
      ]);
      setSettings(netData);
      setCurrentClientIp(myIp);
      setNewIpInput((prev) => (prev ? prev : myIp !== "127.0.0.1" ? myIp : ""));
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat konfigurasi jaringan.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Auto-Detect IP
  const handleAutoDetectIp = async () => {
    setIsDetecting(true);
    try {
      const ip = await networkSettingsService.detectMyIp();
      setCurrentClientIp(ip);
      setNewIpInput(ip);
      toast.success(`IP Publik Terdeteksi: ${ip}`);
    } catch (err: any) {
      toast.error("Gagal mendeteksi IP otomatis: " + (err.message || "Error server"));
    } finally {
      setIsDetecting(false);
    }
  };

  // Add IP to Whitelist List
  const handleAddIp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmedIp = newIpInput.trim();
    if (!trimmedIp) {
      toast.error("Silakan masukkan alamat IP terlebih dahulu.");
      return;
    }

    if (!IP_REGEX.test(trimmedIp) && trimmedIp !== "127.0.0.1" && trimmedIp !== "::1") {
      toast.error("Format alamat IP tidak valid! (Contoh valid: 180.252.12.34)");
      return;
    }

    if (settings.allowedIPs.includes(trimmedIp)) {
      toast.error("Alamat IP ini sudah ada di dalam daftar Whitelist.");
      return;
    }

    setSettings((prev) => ({
      ...prev,
      allowedIPs: [...prev.allowedIPs, trimmedIp],
    }));

    setNewIpInput("");
    toast.success(`IP ${trimmedIp} ditambahkan ke daftar sementara.`);
  };

  // Remove IP from Whitelist List
  const handleRemoveIp = (ipToRemove: string) => {
    setSettings((prev) => ({
      ...prev,
      allowedIPs: prev.allowedIPs.filter((ip) => ip !== ipToRemove),
    }));
    toast.success(`IP ${ipToRemove} dihapus dari daftar.`);
  };

  // Toggle IP Protection Switch
  const handleToggleProtection = () => {
    setSettings((prev) => ({
      ...prev,
      ipProtectionEnabled: !prev.ipProtectionEnabled,
    }));
  };

  // Save Settings to Firestore
  const handleSaveSettings = async () => {
    if (settings.ipProtectionEnabled && settings.allowedIPs.length === 0) {
      toast.error("Peringatan: Aktifkan Whitelist memerlukan minimal 1 Alamat IP terdaftar agar tidak mengunci seluruh sistem!");
      return;
    }

    setIsSaving(true);
    try {
      const updated = await networkSettingsService.updateSettings({
        ...settings,
        updatedBy: "Super Admin",
      });
      setSettings(updated);
      toast.success("Pengaturan Jaringan Whitelist IP Berhasil Disimpan!");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pengaturan jaringan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-100 dark:bg-[#0F172A] p-4 lg:p-6 font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ==================== HEADER & NAV BAR ==================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#6366F1] border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                  Pengaturan Jaringan (IP Whitelist)
                </h1>
                <span className="bg-[#FFB800] text-slate-950 border border-slate-900 text-[10px] font-black px-2 py-0.5 rounded font-mono uppercase">
                  SUPER ADMIN
                </span>
              </div>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Batasi lokasi login operasional Kasir, Gudang, & Admin hanya dari Wi-Fi / IP Resmi Toko
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/admin/users"
              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-100 px-3.5 py-2.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-slate-900 dark:text-slate-100 font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Kembali
            </Link>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving || isLoading}
              className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs px-4 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Simpan Pengaturan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-2xl p-12 text-center text-xs font-black shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            Memuat data konfigurasi jaringan Firestore...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN: PROTECTION SWITCH & CURRENT IP CARD */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* TOGGLE SWITCH CARD */}
              <div className="bg-white dark:bg-slate-900 border-3 border-slate-900 dark:border-slate-100 rounded-2xl p-5 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    STATUS OPERASIONAL IP
                  </span>
                  <span
                    className={`text-[10px] font-black font-mono px-2.5 py-1 rounded-full border border-slate-900 uppercase ${
                      settings.ipProtectionEnabled
                        ? "bg-emerald-400 text-slate-950"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {settings.ipProtectionEnabled ? "SYSTEM ENFORCED" : "PROTECTION OFF"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-50">
                      Proteksi Jaringan Wi-Fi Toko
                    </h3>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 pt-0.5">
                      Wajibkan IP Whitelist untuk Admin, Kasir, & Gudang
                    </p>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={handleToggleProtection}
                    className={`w-14 h-8 flex items-center rounded-full p-1 border-2 border-slate-900 transition-colors cursor-pointer shrink-0 ${
                      settings.ipProtectionEnabled ? "bg-[#6366F1]" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <div
                      className={`bg-white w-6 h-6 rounded-full border border-slate-900 shadow-md transform transition-transform ${
                        settings.ipProtectionEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Status Notice Banner */}
                <div
                  className={`p-3.5 rounded-xl border-2 border-slate-900 text-xs font-bold ${
                    settings.ipProtectionEnabled
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-900"
                      : "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-900"
                  }`}
                >
                  {settings.ipProtectionEnabled ? (
                    <div className="flex items-start gap-2">
                      <span className="text-base">🛡️</span>
                      <p>
                        <strong>Sistem Terlindungi:</strong> Pengguna bertipe Admin, Kasir, dan Gudang yang mencoba mengakses dari luar IP Whitelist akan otomatis diblokir dan di-redirect ke halaman <em>Access Denied</em>. Super Admin tetap memiliki akses penuh (Bypass).
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <span className="text-base">⚠️</span>
                      <p>
                        <strong>Mode Pengujian (Bebas):</strong> Pembatasan IP sedang dinonaktifkan. Seluruh role dapat mengakses sistem dari koneksi internet mana saja.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* CURRENT CLIENT IP CARD */}
              <div className="bg-white dark:bg-slate-900 border-3 border-slate-900 dark:border-slate-100 rounded-2xl p-5 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)] space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  ALAMAT IP KLIEN SAAT INI
                </h3>

                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border-2 border-slate-900 dark:border-slate-700 font-mono">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">IP Address Anda:</span>
                    <span className="text-sm font-black text-[#6366F1] dark:text-indigo-400">
                      {currentClientIp || "127.0.0.1"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoDetectIp}
                    disabled={isDetecting}
                    className="bg-[#FFB800] hover:bg-amber-400 text-slate-950 font-black text-[11px] px-3 py-1.5 rounded-lg border-1.5 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isDetecting ? "Memeriksa..." : "🔍 Detect IP"}
                  </button>
                </div>

                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  Gunakan tombol <strong>Detect IP</strong> untuk otomatis menyalin IP jaringan Wi-Fi Anda saat ini ke form pendaftaran Whitelist.
                </p>
              </div>

            </div>

            {/* RIGHT COLUMN: MANUAL ADD IP FORM & WHITELISTED LIST */}
            <div className="lg:col-span-7 space-y-6">

              {/* FORM INPUT IP BARU */}
              <div className="bg-white dark:bg-slate-900 border-3 border-slate-900 dark:border-slate-100 rounded-2xl p-5 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)] space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  TAMBAH ALAMAT IP TERBATAS
                </h3>

                <form onSubmit={handleAddIp} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={newIpInput}
                      onChange={(e) => setNewIpInput(e.target.value)}
                      placeholder="Contoh: 180.252.12.34 atau 114.124.56.78"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-emerald-400 hover:bg-emerald-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer shrink-0 flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>+ Tambah IP</span>
                  </button>
                </form>
              </div>

              {/* DAFTAR IP TERDAFTAR (WHITELIST LIST) */}
              <div className="bg-white dark:bg-slate-900 border-3 border-slate-900 dark:border-slate-100 rounded-2xl p-5 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[5px_5px_0px_0px_rgba(255,255,255,1)] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    DAFTAR IP WHITELISTED ({settings.allowedIPs.length})
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    Diperbarui: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleString("id-ID") : "-"}
                  </span>
                </div>

                {settings.allowedIPs.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center space-y-2">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Belum ada alamat IP terdaftar pada Whitelist.
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Tambahkan IP Wi-Fi Toko di atas agar staf dapat mengakses sistem saat proteksi diaktifkan.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {settings.allowedIPs.map((ip, idx) => {
                      const isCurrent = ip === currentClientIp;

                      return (
                        <div
                          key={ip + idx}
                          className="bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-900 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all"
                        >
                          <div className="flex items-center gap-3 font-mono">
                            <span className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-black text-[11px] flex items-center justify-center">
                              {idx + 1}
                            </span>

                            <div>
                              <span className="text-xs font-black text-slate-900 dark:text-slate-100 block">
                                {ip}
                              </span>
                              {isCurrent && (
                                <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-indigo-400 inline-block mt-0.5">
                                  ✓ IP Anda Saat Ini
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveIp(ip)}
                            className="bg-rose-100 hover:bg-rose-500 text-rose-700 hover:text-white border border-rose-900 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                            title="Hapus IP dari Whitelist"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Hapus</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
