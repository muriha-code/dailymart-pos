"use client";

import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { StoreSettings } from "@/types/settings.types";
import { settingsService } from "@/services/settings.service";

const DEFAULT_FORM: StoreSettings = {
  storeName: "DailyMart Retail",
  storeBranch: "Cabang Utama",
  storeAddress: "Jl. Slamet Riyadi No. 182, Surakarta",
  storePhone: "0271-712345",
  storeEmail: "admin@dailymart.com",
  enableTax: true,
  taxRate: 11,
  currencySymbol: "Rp",
  defaultMinStockAlert: 5,
  autoHideOutOfStock: false,
  receiptPaperWidth: "58mm",
  receiptHeaderNote: "Selamat Datang di DailyMart",
  receiptFooterNote: "Barang yang sudah dibeli tidak dapat ditukar. Terima kasih!",
  showCashierName: true,
  showTaxDetails: true,
};

export default function AdminSettingsPage() {
  const [formData, setFormData] = useState<StoreSettings>(DEFAULT_FORM);
  const [activeTab, setActiveTab] = useState<"profile" | "tax" | "receipt" | "inventory">("profile");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load Settings from API
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await settingsService.getSettings();
      setFormData(data);
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat pengaturan toko.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Handle Save
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await settingsService.updateSettings(formData);
      toast.success("Pengaturan sistem berhasil disimpan");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Form Field Changers
  const handleChange = (field: keyof StoreSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-4 lg:p-6 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ==================== HEADER & TOP ACTION BAR ==================== */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFB800] border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-slate-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Pengaturan Sistem & Toko
              </h1>
              <p className="text-xs font-bold text-slate-500">
                Kelola profil toko, skema pajak PPN, struk printer thermal, dan parameter stok
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFormData(DEFAULT_FORM)}
              className="bg-white hover:bg-slate-100 border-2 border-slate-900 px-3.5 py-2.5 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-slate-900 font-bold text-xs transition-all cursor-pointer"
            >
              Reset Default
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={isSaving || isLoading}
              className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs px-4 py-2.5 rounded-xl border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
                  <span>✓ Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ==================== TAB NAVIGATION BAR ==================== */}
        <div className="bg-white border-2 border-slate-900 rounded-xl p-1.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={
              activeTab === "profile"
                ? "bg-[#6366F1] text-white font-black text-xs px-3.5 py-2 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-2 transition-all cursor-pointer"
                : "bg-transparent hover:bg-slate-100 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-lg border-2 border-transparent hover:border-slate-900 flex items-center gap-2 transition-all cursor-pointer"
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Profil & Informasi Toko
          </button>

          <button
            onClick={() => setActiveTab("tax")}
            className={
              activeTab === "tax"
                ? "bg-[#6366F1] text-white font-black text-xs px-3.5 py-2 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-2 transition-all cursor-pointer"
                : "bg-transparent hover:bg-slate-100 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-lg border-2 border-transparent hover:border-slate-900 flex items-center gap-2 transition-all cursor-pointer"
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pajak & Transaksi
          </button>

          <button
            onClick={() => setActiveTab("receipt")}
            className={
              activeTab === "receipt"
                ? "bg-[#6366F1] text-white font-black text-xs px-3.5 py-2 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-2 transition-all cursor-pointer"
                : "bg-transparent hover:bg-slate-100 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-lg border-2 border-transparent hover:border-slate-900 flex items-center gap-2 transition-all cursor-pointer"
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Struk Kasir Thermal
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={
              activeTab === "inventory"
                ? "bg-[#6366F1] text-white font-black text-xs px-3.5 py-2 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] flex items-center gap-2 transition-all cursor-pointer"
                : "bg-transparent hover:bg-slate-100 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-lg border-2 border-transparent hover:border-slate-900 flex items-center gap-2 transition-all cursor-pointer"
            }
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Inventaris & Stok
          </button>
        </div>

        {/* ==================== TAB CONTENT AREA ==================== */}
        {isLoading ? (
          <div className="bg-white border-2 border-slate-900 rounded-xl p-12 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] text-center text-xs font-black text-slate-600 mb-6">
            Memuat konfigurasi toko...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* MAIN FORM PANEL */}
            <div className={`${activeTab === "receipt" ? "lg:col-span-7" : "lg:col-span-12"} bg-white border-2 border-slate-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-6`}>
              
              {/* TAB 1: PROFIL & INFORMASI TOKO */}
              {activeTab === "profile" && (
                <div>
                  <div className="mb-6 pb-3 border-b-2 border-slate-900/10">
                    <h3 className="text-sm font-black text-slate-900 mb-1">Grup 1: Profil & Informasi Toko</h3>
                    <p className="text-xs text-slate-500 font-medium">Informasi resmi identitas toko yang akan tampil pada laporan dan struk</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Nama Toko / Brand</label>
                      <input
                        type="text"
                        value={formData.storeName}
                        onChange={(e) => handleChange("storeName", e.target.value)}
                        placeholder="Contoh: DailyMart Retail"
                        className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Nama Cabang</label>
                      <input
                        type="text"
                        value={formData.storeBranch}
                        onChange={(e) => handleChange("storeBranch", e.target.value)}
                        placeholder="Contoh: Cabang Utama"
                        className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full transition-all"
                      />
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Alamat Lengkap Toko</label>
                    <textarea
                      rows={3}
                      value={formData.storeAddress}
                      onChange={(e) => handleChange("storeAddress", e.target.value)}
                      placeholder="Alamat fisik toko..."
                      className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Nomor Telepon / WhatsApp</label>
                      <input
                        type="text"
                        value={formData.storePhone}
                        onChange={(e) => handleChange("storePhone", e.target.value)}
                        placeholder="Contoh: 0271-712345"
                        className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full transition-all"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Email Resmi Toko</label>
                      <input
                        type="email"
                        value={formData.storeEmail}
                        onChange={(e) => handleChange("storeEmail", e.target.value)}
                        placeholder="admin@dailymart.com"
                        className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PAJAK & TRANSAKSI */}
              {activeTab === "tax" && (
                <div>
                  <div className="mb-6 pb-3 border-b-2 border-slate-900/10">
                    <h3 className="text-sm font-black text-slate-900 mb-1">Grup 2: Pengaturan Transaksi, Pajak & Mata Uang</h3>
                    <p className="text-xs text-slate-500 font-medium">Konfigurasi PPN penjualan, persen tarif, dan format mata uang</p>
                  </div>

                  {/* Toggle Aktifkan Pajak */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] mb-5">
                    <div>
                      <p className="text-xs font-black text-slate-900">Aktifkan Pajak Pertambahan Nilai (PPN)</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">Otomatis menghitung PPN pada setiap transaksi di kasir</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableTax}
                        onChange={(e) => handleChange("enableTax", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-lg border-2 border-slate-900 peer peer-checked:bg-[#6366F1] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-2 after:border-slate-900 after:rounded-md after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-6"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Tarif Pajak PPN (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          disabled={!formData.enableTax}
                          value={formData.taxRate}
                          onChange={(e) => handleChange("taxRate", Number(e.target.value))}
                          className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full transition-all disabled:bg-slate-200 disabled:text-slate-400"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs font-black text-slate-500">%</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Simbol Mata Uang</label>
                      <input
                        type="text"
                        value={formData.currencySymbol}
                        onChange={(e) => handleChange("currencySymbol", e.target.value)}
                        placeholder="Rp"
                        className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: STRUK KASIR THERMAL */}
              {activeTab === "receipt" && (
                <div>
                  <div className="mb-6 pb-3 border-b-2 border-slate-900/10">
                    <h3 className="text-sm font-black text-slate-900 mb-1">Grup 3: Pengaturan Struk Kasir Thermal</h3>
                    <p className="text-xs text-slate-500 font-medium">Format cetak cetakan printer thermal 58mm / 80mm dan pesan struk</p>
                  </div>

                  {/* Radio Paper Width */}
                  <div className="mb-5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-2 block">Ukuran Kertas Thermal Printer</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => handleChange("receiptPaperWidth", "58mm")}
                        className={`p-3.5 rounded-xl border-2 border-slate-900 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          formData.receiptPaperWidth === "58mm"
                            ? "bg-[#6366F1] text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                            : "bg-white text-slate-700 hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border-2 border-slate-900 flex items-center justify-center ${formData.receiptPaperWidth === "58mm" ? "bg-white" : "bg-transparent"}`}>
                          {formData.receiptPaperWidth === "58mm" && <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />}
                        </span>
                        Standard Thermal 58mm
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange("receiptPaperWidth", "80mm")}
                        className={`p-3.5 rounded-xl border-2 border-slate-900 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          formData.receiptPaperWidth === "80mm"
                            ? "bg-[#6366F1] text-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                            : "bg-white text-slate-700 hover:bg-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border-2 border-slate-900 flex items-center justify-center ${formData.receiptPaperWidth === "80mm" ? "bg-white" : "bg-transparent"}`}>
                          {formData.receiptPaperWidth === "80mm" && <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />}
                        </span>
                        Wide Thermal 80mm
                      </button>
                    </div>
                  </div>

                  {/* Header & Footer Note */}
                  <div className="mb-5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Catatan Header Struk</label>
                    <input
                      type="text"
                      value={formData.receiptHeaderNote}
                      onChange={(e) => handleChange("receiptHeaderNote", e.target.value)}
                      placeholder="Selamat Datang di DailyMart"
                      className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full transition-all"
                    />
                  </div>

                  <div className="mb-5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">Catatan Footer Struk</label>
                    <textarea
                      rows={2}
                      value={formData.receiptFooterNote}
                      onChange={(e) => handleChange("receiptFooterNote", e.target.value)}
                      placeholder="Pesan ucapan terima kasih di bagian bawah..."
                      className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full transition-all"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                      <span className="text-xs font-black text-slate-900">Tampilkan Nama Kasir di Struk</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.showCashierName}
                          onChange={(e) => handleChange("showCashierName", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-lg border-2 border-slate-900 peer peer-checked:bg-[#6366F1] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-2 after:border-slate-900 after:rounded-md after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-6"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                      <span className="text-xs font-black text-slate-900">Tampilkan Rincian Pajak (PPN) di Struk</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.showTaxDetails}
                          onChange={(e) => handleChange("showTaxDetails", e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-lg border-2 border-slate-900 peer peer-checked:bg-[#6366F1] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-2 after:border-slate-900 after:rounded-md after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-6"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: INVENTARIS & STOK */}
              {activeTab === "inventory" && (
                <div>
                  <div className="mb-6 pb-3 border-b-2 border-slate-900/10">
                    <h3 className="text-sm font-black text-slate-900 mb-1">Grup 4: Parameter Inventaris & Stok</h3>
                    <p className="text-xs text-slate-500 font-medium">Pengaturan ambang batas stok minimum dan visibilitas di kasir POS</p>
                  </div>

                  <div className="mb-5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5 block">
                      Batas Peringatan Stok Kritis Default (Min Stock Alert)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.defaultMinStockAlert}
                      onChange={(e) => handleChange("defaultMinStockAlert", Number(e.target.value))}
                      className="bg-slate-50 border-2 border-slate-900 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] w-full md:w-1/2 transition-all"
                    />
                    <p className="text-[11px] font-medium text-slate-500 mt-1">
                      Produk dengan jumlah stok di bawah batas ini akan otomatis memicu peringatan stok di gudang.
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                    <div>
                      <p className="text-xs font-black text-slate-900">Sembunyikan Produk Habis dari Mesin Kasir (POS)</p>
                      <p className="text-[11px] font-medium text-slate-500 mt-1">Produk dengan stok 0 tidak akan ditampilkan pada katalog kasir</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.autoHideOutOfStock}
                        onChange={(e) => handleChange("autoHideOutOfStock", e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-lg border-2 border-slate-900 peer peer-checked:bg-[#6366F1] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-2 after:border-slate-900 after:rounded-md after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-6"></div>
                    </label>
                  </div>
                </div>
              )}

            </div>

            {/* LIVE RECEIPT PREVIEW PANEL */}
            {activeTab === "receipt" && (
              <div className="lg:col-span-5 bg-white border-2 border-slate-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] mb-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900/10">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFB800] border border-slate-900 animate-pulse" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Live Preview Struk Thermal</h3>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-[#FFB800] text-slate-900 border-2 border-slate-900 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                    {formData.receiptPaperWidth}
                  </span>
                </div>

                {/* Simulated Thermal Receipt Container */}
                <div className="bg-slate-100 p-4 rounded-xl border-2 border-slate-900 flex justify-center">
                  <div
                    className={`bg-white p-4 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] font-mono text-[11px] leading-tight text-slate-900 border-2 border-slate-900 transition-all ${
                      formData.receiptPaperWidth === "80mm" ? "w-72" : "w-56"
                    }`}
                  >
                    {/* Receipt Header */}
                    <div className="text-center space-y-1 mb-3">
                      <p className="font-extrabold text-sm uppercase tracking-tight">{formData.storeName}</p>
                      <p className="text-[10px] text-slate-600">{formData.storeBranch}</p>
                      <p className="text-[9px] text-slate-500">{formData.storeAddress}</p>
                      <p className="text-[9px] text-slate-500">Telp: {formData.storePhone}</p>
                      {formData.receiptHeaderNote && (
                        <p className="text-[10px] italic font-semibold mt-1 border-t border-b border-dashed border-slate-300 py-1">
                          "{formData.receiptHeaderNote}"
                        </p>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="border-b border-dashed border-slate-300 pb-2 mb-2 text-[9px] space-y-0.5 text-slate-600">
                      <div className="flex justify-between">
                        <span>No: INV/20260820/001</span>
                        <span>{new Date().toLocaleDateString("id-ID")}</span>
                      </div>
                      {formData.showCashierName && (
                        <div className="flex justify-between">
                          <span>Kasir: Siti Aminah</span>
                          <span>Shift #1</span>
                        </div>
                      )}
                    </div>

                    {/* Sample Items */}
                    <div className="border-b border-dashed border-slate-300 pb-2 mb-2 space-y-1">
                      <div>
                        <p className="font-semibold truncate">Beras Premium 5kg</p>
                        <div className="flex justify-between text-[10px] text-slate-600">
                          <span>1 x {formData.currencySymbol} 75.000</span>
                          <span className="font-medium text-slate-900">{formData.currencySymbol} 75.000</span>
                        </div>
                      </div>
                      <div>
                        <p className="font-semibold truncate">Minyak Goreng Bimoli 2L</p>
                        <div className="flex justify-between text-[10px] text-slate-600">
                          <span>2 x {formData.currencySymbol} 34.000</span>
                          <span className="font-medium text-slate-900">{formData.currencySymbol} 68.000</span>
                        </div>
                      </div>
                    </div>

                    {/* Totals & Tax */}
                    <div className="space-y-0.5 text-[10px] mb-3">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formData.currencySymbol} 143.000</span>
                      </div>
                      {formData.enableTax && formData.showTaxDetails && (
                        <div className="flex justify-between text-slate-600">
                          <span>PPN ({formData.taxRate}%)</span>
                          <span>{formData.currencySymbol} {Math.round(143000 * (formData.taxRate / 100)).toLocaleString("id-ID")}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                        <span>TOTAL</span>
                        <span>
                          {formData.currencySymbol}{" "}
                          {(
                            143000 + (formData.enableTax && formData.showTaxDetails ? Math.round(143000 * (formData.taxRate / 100)) : 0)
                          ).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>

                    {/* Receipt Footer */}
                    <div className="text-center text-[9px] text-slate-600 pt-2 border-t border-dashed border-slate-300 space-y-1">
                      <p>{formData.receiptFooterNote || "Terima kasih atas kunjungan Anda!"}</p>
                      <p className="text-[8px] text-slate-400">=== DailyMart POS System ===</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
