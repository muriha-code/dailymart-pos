"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { stockAlertService } from "@/services/stockAlert.service";
import {
  StockAlertItem,
  StockAlertSummary,
  StockAlertUrgency,
} from "@/app/api/warehouse/stock-alerts/route";
import Pagination from "@/components/common/Pagination";

const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

export default function StockAlertsPage() {
  // Main Data States
  const [items, setItems] = useState<StockAlertItem[]>([]);
  const [summary, setSummary] = useState<StockAlertSummary>({
    totalCritical: 0,
    outOfStock: 0,
    criticalStock: 0,
    lowStock: 0,
    mostImpactedCategory: "-",
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 10;

  // Fetch Data Function
  const loadStockAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await stockAlertService.getStockAlerts({
        search: searchQuery,
        urgency: urgencyFilter,
      });
      setItems(data.items);
      setSummary(data.summary);
    } catch (err: any) {
      console.error("Gagal memuat data peringatan stok minimum:", err);
      setError(
        err.message || "Gagal terhubung ke database. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, urgencyFilter]);

  useEffect(() => {
    loadStockAlerts();
  }, [loadStockAlerts]);

  // Auto-Reset Halaman ke 1 saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, urgencyFilter]);

  // Slice Items for Current Page
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return items.slice(start, start + ITEMS_PER_PAGE);
  }, [items, currentPage]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER & QUICK ACTIONS                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-[11px] uppercase tracking-wider">
                Manajemen Gudang
              </span>
              <span className="text-xs text-slate-400">• Stock Alerts</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Peringatan Stok Minimum
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Monitoring otomatis SKU produk yang berada di bawah batas stok minimum untuk tindakan restok dan audit cepat.
            </p>
          </div>

          {/* Shortcut Quick Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
            <Link
              href="/warehouse/stock-in"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Buat Restok (Stock-In)</span>
            </Link>

            <Link
              href="/warehouse/stock-audit"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Audit Opname</span>
            </Link>

            <button
              type="button"
              onClick={loadStockAlerts}
              title="Refresh Data"
              className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. HEADER KPI METRICS CARDS                                               */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Total Item Kritis & Menipis */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total SKU Perlu Restok
              </span>
              <span className="text-2xl font-black text-rose-600 mt-1 block font-mono">
                {summary.totalCritical}{" "}
                <span className="text-xs font-normal text-slate-400">produk</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* Card 2: Stok Habis (0 Unit) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Stok Kosong (0 Unit)
              </span>
              <span className="text-2xl font-black text-red-950 mt-1 block font-mono">
                {summary.outOfStock}{" "}
                <span className="text-xs font-normal text-slate-400">SKU habis</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-red-900 text-white flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>

          {/* Card 3: Kategori Paling Terdampak */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Kategori Paling Terdampak
              </span>
              <span className="text-base font-extrabold text-amber-700 mt-1 block truncate max-w-[200px]">
                {summary.mostImpactedCategory}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TOOLBAR SEARCH & FILTER                                                */}
        {/* ========================================================================= */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <svg
              className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari SKU produk, Nama Barang, atau Kategori..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 focus:border-slate-900 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Urgency Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Level Urgensi:
            </label>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none min-w-[160px]"
            >
              <option value="ALL">Semua Alert ({summary.totalCritical})</option>
              <option value="HABIS">STOK HABIS ({summary.outOfStock})</option>
              <option value="KRITIS">KRITIS ({summary.criticalStock})</option>
              <option value="MENIPIS">MENIPIS ({summary.lowStock})</option>
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TABEL PERINGATAN STOK MINIMUM                                           */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Memuat data produk stok kritis...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600 space-y-3">
              <p className="text-sm font-bold">{error}</p>
              <button
                type="button"
                onClick={loadStockAlerts}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Coba Lagi
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <span className="text-2xl block">🎉</span>
              <p className="text-sm font-bold text-slate-800">
                Semua stok produk berada di tingkat aman!
              </p>
              <p className="text-xs text-slate-400">
                Tidak ada barang dengan stok di bawah batas minimum yang membutuhkan tindakan restok saat ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Produk & SKU</th>
                    <th className="py-3.5 px-4">Kategori</th>
                    <th className="py-3.5 px-4 text-center">Stok Fisik / Min</th>
                    <th className="py-3.5 px-4 text-center">Disarankan Restok</th>
                    <th className="py-3.5 px-4 text-center">Status Urgensi</th>
                    <th className="py-3.5 px-4 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {paginatedItems.map((item) => {
                    const isOut = item.urgency === "HABIS";
                    const isCritical = item.urgency === "KRITIS";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Produk & SKU */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">
                            {item.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            SKU: {item.sku}
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                            {item.categoryName || "Umum"}
                          </span>
                        </td>

                        {/* Stok Fisik vs Min */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                          <span
                            className={`font-black text-sm ${isOut
                              ? "text-red-700"
                              : isCritical
                                ? "text-rose-600"
                                : "text-amber-600"
                              }`}
                          >
                            {item.stock} {item.unit}
                          </span>
                          <span className="text-slate-400 text-xs block">
                            (Min: {item.minStock} {item.unit})
                          </span>
                        </td>

                        {/* Disarankan Restok */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-xs">
                            +{item.suggestedRestockQty} {item.unit}
                          </span>
                        </td>

                        {/* Status Urgensi Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isOut && (
                            <span className="px-3 py-1 rounded-full bg-red-950 text-red-100 font-black text-[10px] uppercase tracking-wider border border-red-800 shadow-xs inline-block">
                              STOK HABIS (0 Unit)
                            </span>
                          )}
                          {isCritical && (
                            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-extrabold text-[10px] uppercase tracking-wider border border-rose-300 inline-block">
                              KRITIS (≤ 50% Min)
                            </span>
                          )}
                          {item.urgency === "MENIPIS" && (
                            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-extrabold text-[10px] uppercase tracking-wider border border-amber-300 inline-block">
                              MENIPIS
                            </span>
                          )}
                        </td>

                        {/* Aksi Cepat */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href="/warehouse/stock-in"
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] shadow-2xs transition-all"
                            >
                              + Restok
                            </Link>

                            <Link
                              href="/warehouse/stock-audit"
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition-colors"
                            >
                              Opname
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Integrated Reusable Pagination */}
          <Pagination
            currentPage={currentPage}
            totalItems={items.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
