"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { DashboardData } from "@/types/dashboard.types";
import { dashboardService } from "@/services/dashboard.service";

// Helper Format Currency Rupiah
const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Load summary analytics data from Dashboard Service
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const summary = await dashboardService.getSummary();
      setData(summary);
    } catch (err: any) {
      console.error("Gagal memuat data dashboard:", err);
      setError(err.message || "Gagal mengambil data analitik dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const maxChartRevenue = useMemo(() => {
    if (!data?.chartData || data.chartData.length === 0) return 1;
    const max = Math.max(...data.chartData.map((d) => d.revenue));
    return max > 0 ? max : 1;
  }, [data?.chartData]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ========================================== */}
        {/* HEADER & QUICK ACTIONS */}
        {/* ========================================== */}
        <div className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Dashboard Analitik & Penjualan
            </h1>
          </div>

          {/* Shortcut Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs px-3.5 py-2 rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <svg
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-amber-600" : ""}`}
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
              <span>Refresh</span>
            </button>

            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs px-3.5 py-2 rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <span>Kelola Produk</span>
            </Link>

            <Link
              href="/warehouse/stock-in"
              className="inline-flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs px-4 py-2 rounded-lg border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] transition-all cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Barang Masuk</span>
            </Link>
          </div>
        </div>

        {/* ERROR NOTIFICATION */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-100 border-2 border-slate-900 text-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-bold">{error}</span>
            </div>
            <button
              onClick={loadDashboardData}
              className="text-xs font-black underline hover:text-rose-700 cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* ========================================== */}
        {/* 4 KPI METRIC CARDS */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          
          {/* Card 1: Omset Hari Ini (White Card + Green LIVE Badge) */}
          <div className="bg-white border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                Omset Hari Ini
              </span>
              <span className="inline-flex items-center gap-1 bg-[#10B981] text-white border-1.5 border-slate-900 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                LIVE
              </span>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-6 bg-slate-200/60 rounded animate-pulse w-3/4"></div>
              ) : (
                <span className="text-xl font-black text-slate-900 font-mono tabular-nums mt-1">
                  {formatRupiah(data?.metrics.todayRevenue || 0)}
                </span>
              )}
              <p className="text-[11px] font-medium text-slate-600 mt-1">
                {isLoading ? "..." : `${data?.metrics.todayOrders || 0} transaksi berhasil`}
              </p>
            </div>
          </div>

          {/* Card 2: Total Akumulasi Omset (Soft Indigo Tint #EEF2FF + Deep Indigo Text #4338CA) */}
          <div className="bg-[#EEF2FF] border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900">
                Total Omset
              </span>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-6 bg-indigo-200/60 rounded animate-pulse w-3/4"></div>
              ) : (
                <span className="text-xl font-black text-[#4338CA] font-mono tabular-nums mt-1">
                  {formatRupiah(data?.metrics.totalRevenue || 0)}
                </span>
              )}
              <p className="text-[11px] font-medium text-indigo-700 mt-1">
                Akumulasi seluruh transaksi
              </p>
            </div>
          </div>

          {/* Card 3: Total Varian Produk Aktif (Warm Amber Tint #FEF3C7 + Deep Amber Text #B45309) */}
          <div className="bg-[#FEF3C7] border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                Produk Aktif
              </span>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-6 bg-amber-200/60 rounded animate-pulse w-1/2"></div>
              ) : (
                <span className="text-xl font-black text-[#B45309] font-mono tabular-nums mt-1">
                  {data?.metrics.totalProducts || 0} SKU
                </span>
              )}
              <p className="text-[11px] font-medium text-amber-800 mt-1">
                Katalog varian siap jual
              </p>
            </div>
          </div>

          {/* Card 4: Status Peringatan Stok Kritis (Soft Rose Tint #FFE4E6 + Deep Rose Text #E11D48) */}
          <div className="bg-[#FFE4E6] border-2 border-slate-900 rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-900">
                Stok Kritis
              </span>
              {(data?.metrics.lowStockCount || 0) > 0 ? (
                <span className="bg-[#E11D48] text-white border-1.5 border-slate-900 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                  Urgent Restock
                </span>
              ) : (
                <span className="bg-[#10B981] text-white border-1.5 border-slate-900 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                  Stok Aman
                </span>
              )}
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-6 bg-rose-200/60 rounded animate-pulse w-1/2"></div>
              ) : (
                <span className="text-xl font-black text-[#E11D48] font-mono tabular-nums mt-1">
                  {data?.metrics.lowStockCount || 0} Item
                </span>
              )}
              <p className="text-[11px] font-medium text-rose-800 mt-1">
                {(data?.metrics.lowStockCount || 0) > 0
                  ? "Membutuhkan restock segera!"
                  : "Stok inventaris aman"}
              </p>
            </div>
          </div>

        </div>

        {/* ========================================== */}
        {/* GRID: TREN PENJUALAN 7 HARI & TOP BEST SELLERS */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* BAR CHART: Tren Penjualan 7 Hari terakhir (Col-Span 2) */}
          <div className="lg:col-span-2 bg-white border-2 border-slate-900 rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-4">
                  Tren Penjualan 7 Hari Terakhir
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-bold">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#6366F1] border border-slate-900 inline-block"></span>
                  <span>Omset Penjualan</span>
                </div>
              </div>

              {/* Bar Visual Container */}
              {isLoading ? (
                <div className="h-64 bg-slate-100/60 rounded-xl animate-pulse flex items-center justify-center text-slate-400 text-xs font-semibold">
                  Memuat visualisasi tren...
                </div>
              ) : (
                <div className="relative pt-6">
                  {/* Bars Container */}
                  <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b-2 border-slate-900 pb-2">
                    {data?.chartData.map((item, index) => {
                      const heightPercent = Math.max(
                        8,
                        Math.round((item.revenue / maxChartRevenue) * 100)
                      );
                      const isHovered = hoveredBarIndex === index;

                      return (
                        <div
                          key={item.date}
                          className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                          onMouseEnter={() => setHoveredBarIndex(index)}
                          onMouseLeave={() => setHoveredBarIndex(null)}
                        >
                          {/* Hover Tooltip Card */}
                          {isHovered && (
                            <div className="absolute -top-14 z-20 bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-lg border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] pointer-events-none whitespace-nowrap animate-fade-in flex flex-col items-center">
                              <span className="font-black text-[#A5B4FC]">{formatRupiah(item.revenue)}</span>
                              <span className="text-[10px] text-slate-300">{item.orders} Transaksi • {item.date}</span>
                              <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-2 mt-0.5"></div>
                            </div>
                          )}

                          {/* CSS Bar Element */}
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full max-w-[48px] rounded-t-lg transition-all duration-200 relative flex items-start justify-center pt-1.5 border-t-2 border-x-2 border-slate-900 ${
                              isHovered
                                ? "bg-[#4F46E5] scale-x-105 shadow-[2px_0px_0px_0px_rgba(15,23,42,1)]"
                                : item.revenue > 0
                                ? "bg-[#6366F1]"
                                : "bg-slate-200"
                            }`}
                          >
                            {item.revenue > 0 && (
                              <span className="text-[10px] font-mono font-black text-white tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                                {item.orders}x
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Day Labels Axis */}
                  <div className="flex justify-between gap-2 sm:gap-4 px-2 pt-3">
                    {data?.chartData.map((item) => (
                      <div key={item.date} className="flex-1 text-center">
                        <span className="block text-xs font-black text-slate-900">
                          {item.dayName}
                        </span>
                        <span className="block text-[10px] font-mono font-bold text-slate-500">
                          {item.date.slice(8, 10)}/{item.date.slice(5, 7)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t-2 border-slate-900/10 flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>* Arahkan kursor ke atas batang grafik untuk detail nominal harian</span>
              <span className="font-bold text-slate-900">Skala Otomatis</span>
            </div>
          </div>

          {/* CARD B: Top 5 Produk Terlaris (Col-Span 1) */}
          <div className="bg-white border-2 border-slate-900 rounded-xl p-5 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-4">
                Top 5 Produk Terlaris
              </h2>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : !data?.topProducts || data.topProducts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  Belum ada data penjualan tercatat.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.topProducts.map((prod, index) => (
                    <div
                      key={prod.id || index}
                      className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-200 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Rank Badge Industrial Cyber Punch */}
                        <div className="w-6 h-6 bg-[#6366F1] border-1.5 border-slate-900 text-white font-mono text-[10px] font-black rounded flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                          #{index + 1}
                        </div>

                        {/* Product Title */}
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {prod.name}
                        </h4>
                      </div>

                      {/* Sales Stats */}
                      <div className="text-right shrink-0 font-mono text-xs font-black text-slate-900">
                        <span>{prod.quantity} <span className="text-[10px] text-slate-500 font-sans font-normal">terjual</span></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t-2 border-slate-900/10 text-center">
              <Link
                href="/admin/products"
                className="text-xs font-black text-[#6366F1] hover:text-[#4F46E5] inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Katalog Produk Selengkapnya</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

        </div>

        {/* ========================================== */}
        {/* CRITICAL STOCK ALERT TABLE */}
        {/* ========================================== */}
        <div className="bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden">
          <div className="p-6 border-b-2 border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Peringatan Stok Kritis (Restock Urgent)
                </h2>
                {data?.lowStockProducts && data.lowStockProducts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-black text-xs border border-slate-900">
                    {data.lowStockProducts.length} Item
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar produk aktif dengan posisi sisa stok berada di bawah batas minimum safety stock.
              </p>
            </div>

            <Link
              href="/warehouse/stock-in"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Input Stok Masuk (Warehouse)</span>
            </Link>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-900 font-black uppercase tracking-wider border-b-2 border-slate-900">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">SKU</th>
                  <th className="py-3.5 px-4 sm:px-6">Nama Produk</th>
                  <th className="py-3.5 px-4 sm:px-6">Kategori</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Sisa Stok</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Batas Min</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Memuat daftar stok kritis...
                    </td>
                  </tr>
                ) : !data?.lowStockProducts || data.lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <div className="max-w-xs mx-auto text-center space-y-1">
                        <span className="text-2xl">🎉</span>
                        <h4 className="text-sm font-bold text-slate-800">Seluruh Stok Aman!</h4>
                        <p className="text-xs text-slate-400">
                          Tidak ada produk aktif yang berada di bawah batas minimum stok saat ini.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.lowStockProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-indigo-50/50 transition-colors">
                      <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-700">
                        {prod.sku}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900">
                        {prod.name}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-slate-500">
                        {prod.categoryName || "Umum"}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-center font-mono">
                        <span className="px-2.5 py-1 rounded-lg bg-rose-200 text-rose-950 border border-slate-900 font-black text-xs inline-block">
                          {prod.stock} {prod.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-center font-mono text-slate-600 font-bold">
                        {prod.minimumStock} {prod.unit}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-slate-900 text-[11px] font-black">
                          ● Stok Kritis
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <Link
                          href={`/warehouse/stock-in?productId=${encodeURIComponent(prod.id)}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all cursor-pointer"
                        >
                          <span>+ Restock</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
