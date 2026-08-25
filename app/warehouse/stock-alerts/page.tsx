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
    <div className="min-h-screen bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        {/* ========================================================================= */}
        {/* 1. PAGE HEADER COMPACT & CLEAN (HAPUS BADGE)                             */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-slate-50 tracking-tight">
              Peringatan Stok Minimum
            </h1>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-0.5">
              Monitoring otomatis SKU produk yang berada di bawah batas stok minimum untuk tindakan restok dan audit cepat.
            </p>
          </div>

          {/* Shortcut Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <Link
              href="/warehouse/stock-in"
              className="bg-[#FFB800] hover:bg-[#FFA800] text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-100 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Restock</span>
            </Link>

            <Link
              href="/warehouse/stock-audit"
              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-100 px-3 py-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-slate-900 dark:text-slate-100 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-900 dark:text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Audit Opname</span>
            </Link>

            <button
              type="button"
              onClick={loadStockAlerts}
              title="Refresh Data"
              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-100 p-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-slate-900 dark:text-slate-100 transition-all cursor-pointer flex items-center justify-center"
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
                  strokeWidth="2.5"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. KPI STOCK ALERT CARDS (3 GRID METRICS - COMPACT)                       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* Card 1: Total Item Kritis & Menipis */}
          <div className="bg-[#FFE4E6] dark:bg-rose-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center min-h-[72px] transition-all">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#E11D48] dark:text-rose-400 block mb-1">
              Total SKU Perlu Restok
            </span>
            <span className="text-[#E11D48] dark:text-rose-400 font-mono font-black text-lg block">
              {summary.totalCritical}{" "}
              <span className="text-xs font-bold text-[#E11D48]/80 dark:text-rose-400/80">produk</span>
            </span>
          </div>

          {/* Card 2: Stok Habis (0 Unit) */}
          <div className="bg-[#FEF2F2] dark:bg-red-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center min-h-[72px] transition-all">
            <span className="text-[10px] font-black uppercase tracking-wider text-red-700 dark:text-red-400 block mb-1">
              Stok Kosong (0 Unit)
            </span>
            <span className="text-red-700 dark:text-red-400 font-mono font-black text-lg block">
              {summary.outOfStock}{" "}
              <span className="text-xs font-bold text-red-700/80 dark:text-red-400/80">SKU habis</span>
            </span>
          </div>

          {/* Card 3: Kategori Paling Terdampak */}
          <div className="bg-[#FEF3C7] dark:bg-amber-950/40 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex flex-col justify-center min-h-[72px] transition-all">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#B45309] dark:text-amber-300 block mb-1">
              Kategori Paling Terdampak
            </span>
            <span className="text-xs sm:text-sm font-black font-mono text-[#B45309] dark:text-amber-300 leading-tight break-words">
              {summary.mostImpactedCategory}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. INLINE FILTER BAR                                                      */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl p-2 shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] flex items-center gap-2 mb-4 flex-wrap sm:flex-nowrap transition-colors">
          {/* Search Bar (Oval Pill Style) */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari SKU produk, Nama Barang, atau Kategori..."
              className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-4 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:bg-white dark:focus:bg-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex-1 w-full placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-400"
              >
                ✕
              </button>
            )}
          </div>

          {/* Urgency Filter Dropdown (Oval Pill Style) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 whitespace-nowrap">
              Level Urgensi:
            </label>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-full px-4 py-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] cursor-pointer min-w-[150px]"
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
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-xl shadow-[3.5px_3.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3.5px_3.5px_0px_0px_rgba(255,255,255,1)] overflow-hidden transition-colors">
          {isLoading ? (
            <div className="p-12 text-center text-slate-700 dark:text-slate-300 space-y-2">
              <div className="w-8 h-8 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs font-black">Memuat data produk stok kritis...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-rose-600 dark:text-rose-400 space-y-2">
              <p className="text-sm font-black">{error}</p>
              <button
                type="button"
                onClick={loadStockAlerts}
                className="px-4 py-2 bg-[#6366F1] text-white border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-[#4F46E5] cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-slate-900 dark:text-slate-100 space-y-1">
              <span className="text-2xl block">🎉</span>
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                Semua stok produk berada di tingkat aman!
              </p>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Tidak ada barang dengan stok di bawah batas minimum yang membutuhkan tindakan restok saat ini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-black text-[10px] uppercase tracking-wider">
                    <th className="py-3 px-4">Produk & SKU</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-center">Stok Fisik / Min</th>
                    <th className="py-3 px-4 text-center">Disarankan Restok</th>
                    <th className="py-3 px-4 text-center">Status Urgensi</th>
                    <th className="py-3 px-4 text-right">Aksi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs text-slate-900 dark:text-slate-100 font-bold">
                  {paginatedItems.map((item) => {
                    const isOut = item.urgency === "HABIS";
                    const isCritical = item.urgency === "KRITIS";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors border-b border-slate-200 dark:border-slate-800"
                      >
                        {/* Produk & SKU Tag */}
                        <td className="py-3 px-4">
                          <div className="font-black text-slate-900 dark:text-slate-100">
                            {item.name}
                          </div>
                          <div className="mt-0.5">
                            <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700">
                              SKU: {item.sku}
                            </span>
                          </div>
                        </td>

                        {/* Kategori Tag */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md">
                            {item.categoryName || "Umum"}
                          </span>
                        </td>

                        {/* Stok Fisik vs Min */}
                        <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-black text-xs text-[#B45309] dark:text-amber-400">
                          <span
                            className={`text-xs ${isOut
                              ? "text-red-700 dark:text-red-400"
                              : isCritical
                                ? "text-[#E11D48] dark:text-rose-400"
                                : "text-[#B45309] dark:text-amber-400"
                              }`}
                          >
                            {item.stock} {item.unit}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] block font-mono">
                            (Min: {item.minStock} {item.unit})
                          </span>
                        </td>

                        {/* Disarankan Restok (+Pcs) */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="bg-[#EEF2FF] dark:bg-indigo-950/60 text-[#4338CA] dark:text-indigo-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-black text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                            +{item.suggestedRestockQty} {item.unit}
                          </span>
                        </td>

                        {/* Status Urgensi Badges */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {isOut && (
                            <span className="bg-[#FFE4E6] dark:bg-rose-950/60 text-[#E11D48] dark:text-rose-400 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-black text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                              KOSONG (0 Unit)
                            </span>
                          )}
                          {isCritical && (
                            <span className="bg-[#FEF3C7] dark:bg-amber-950/60 text-[#B45309] dark:text-amber-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                              KRITIS (≤50% Min)
                            </span>
                          )}
                          {item.urgency === "MENIPIS" && (
                            <span className="bg-[#FEF3C7] dark:bg-amber-950/60 text-[#B45309] dark:text-amber-300 border-1.5 border-slate-900 dark:border-slate-100 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] inline-block">
                              MENIPIS
                            </span>
                          )}
                        </td>

                        {/* Quick Action Buttons */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href="/warehouse/stock-in"
                              className="bg-[#FFB800] hover:bg-[#FFA800] text-slate-950 border-1.5 border-slate-900 dark:border-slate-100 font-black text-[10px] px-2 py-1 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all inline-block"
                            >
                              + Restok
                            </Link>

                            <Link
                              href="/warehouse/stock-audit"
                              className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-1.5 border-slate-900 dark:border-slate-100 font-black text-[10px] px-2 py-1 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all inline-block"
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
