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

  // Find max revenue for chart relative height scaling
  const maxChartRevenue = useMemo(() => {
    if (!data?.chartData || data.chartData.length === 0) return 1;
    const max = Math.max(...data.chartData.map((d) => d.revenue));
    return max > 0 ? max : 1;
  }, [data?.chartData]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ========================================== */}
        {/* HEADER & QUICK ACTIONS */}
        {/* ========================================== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] uppercase tracking-wider">
                Administrator
              </span>
              <span className="text-xs text-slate-400 font-medium">• Ringkasan Analitik</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Dashboard Analitik & Penjualan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Ringkasan transaksi harian, tren omset 7 hari terakhir, katalog terlaris, dan pemantauan stok ritel.
            </p>
          </div>

          {/* Shortcut Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? "animate-spin text-amber-600" : ""}`}
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <span>📦 Kelola Produk</span>
            </Link>

            <Link
              href="/warehouse/stock-in"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Barang Masuk</span>
            </Link>
          </div>
        </div>

        {/* ERROR NOTIFICATION */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold">{error}</span>
            </div>
            <button
              onClick={loadDashboardData}
              className="text-xs font-bold underline hover:text-red-900 cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* ========================================== */}
        {/* 4 KPI METRIC CARDS */}
        {/* ========================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Omset Hari Ini */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Omset Hari Ini
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE
              </span>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-3/4"></div>
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                  {formatRupiah(data?.metrics.todayRevenue || 0)}
                </span>
              )}
              <p className="text-xs font-medium text-slate-500 mt-1">
                {isLoading ? "..." : `${data?.metrics.todayOrders || 0} transaksi berhasil hari ini`}
              </p>
            </div>
            <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 group-hover:opacity-10 transition-all text-slate-900 pointer-events-none">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
              </svg>
            </div>
          </div>

          {/* Card 2: Total Akumulasi Omset */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Omset
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-3/4"></div>
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                  {formatRupiah(data?.metrics.totalRevenue || 0)}
                </span>
              )}
              <p className="text-xs font-medium text-slate-500 mt-1">
                Akumulasi seluruh transaksi
              </p>
            </div>
          </div>

          {/* Card 3: Total Varian Produk Aktif */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Produk Aktif
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-1/2"></div>
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                  {data?.metrics.totalProducts || 0}{" "}
                  <span className="text-xs font-semibold text-slate-400">SKU</span>
                </span>
              )}
              <p className="text-xs font-medium text-slate-500 mt-1">
                Katalog varian siap jual
              </p>
            </div>
          </div>

          {/* Card 4: Status Peringatan Stok Kritis */}
          <div className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between relative overflow-hidden transition-all ${
            (data?.metrics.lowStockCount || 0) > 0
              ? "bg-red-50/70 border-red-200 text-red-950"
              : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                (data?.metrics.lowStockCount || 0) > 0 ? "text-red-700" : "text-slate-500"
              }`}>
                Stok Kritis
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                (data?.metrics.lowStockCount || 0) > 0
                  ? "bg-red-100 border border-red-300 text-red-700"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-600"
              }`}>
                {(data?.metrics.lowStockCount || 0) > 0 ? "⚠️" : "✓"}
              </div>
            </div>
            <div className="mt-3">
              {isLoading ? (
                <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-1/2"></div>
              ) : (
                <span className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${
                  (data?.metrics.lowStockCount || 0) > 0 ? "text-red-700" : "text-slate-900"
                }`}>
                  {data?.metrics.lowStockCount || 0}{" "}
                  <span className="text-xs font-semibold opacity-75">Item</span>
                </span>
              )}
              <p className={`text-xs font-medium mt-1 ${
                (data?.metrics.lowStockCount || 0) > 0 ? "text-red-600 font-semibold" : "text-slate-500"
              }`}>
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
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                    Tren Penjualan 7 Hari Terakhir
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Grafik perbandingan volume omset dan frekuensi transaksi harian.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-500 inline-block"></span>
                    <span>Omset Penjualan</span>
                  </div>
                </div>
              </div>

              {/* Bar Visual Container */}
              {isLoading ? (
                <div className="h-64 bg-slate-50 rounded-xl animate-pulse flex items-center justify-center text-slate-400 text-xs font-semibold">
                  Memuat visualisasi tren...
                </div>
              ) : (
                <div className="relative pt-6">
                  {/* Bars Container */}
                  <div className="h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 border-b border-slate-200 pb-2">
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
                            <div className="absolute -top-14 z-20 bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-xl pointer-events-none whitespace-nowrap animate-fade-in flex flex-col items-center">
                              <span className="font-bold text-amber-400">{formatRupiah(item.revenue)}</span>
                              <span className="text-[10px] text-slate-300">{item.orders} Transaksi • {item.date}</span>
                              <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-2 mt-0.5"></div>
                            </div>
                          )}

                          {/* CSS Bar Element */}
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full max-w-[48px] rounded-t-lg transition-all duration-300 relative flex items-start justify-center pt-1.5 ${
                              isHovered
                                ? "bg-amber-600 shadow-md scale-x-105"
                                : item.revenue > 0
                                ? "bg-amber-500 hover:bg-amber-600"
                                : "bg-slate-200"
                            }`}
                          >
                            {item.revenue > 0 && (
                              <span className="text-[10px] font-mono font-bold text-white tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <span className="block text-xs font-bold text-slate-800">
                          {item.dayName}
                        </span>
                        <span className="block text-[10px] font-mono text-slate-400">
                          {item.date.slice(8, 10)}/{item.date.slice(5, 7)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>* Arahkan kursor ke atas batang grafik untuk detail nominal harian</span>
              <span className="font-semibold text-slate-700">Skala Otomatis</span>
            </div>
          </div>

          {/* CARD B: Top 5 Produk Terlaris (Col-Span 1) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-4 mb-4">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Top 5 Produk Terlaris
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Produk dengan akumulasi kuantitas penjualan tertinggi.
                </p>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
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
                      className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Badge */}
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                            index === 0
                              ? "bg-amber-500 text-white shadow-xs"
                              : index === 1
                              ? "bg-slate-300 text-slate-800"
                              : index === 2
                              ? "bg-amber-800/20 text-amber-900"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {index + 1}
                        </div>

                        {/* Product Title & SKU */}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {prod.name}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 block truncate">
                            SKU: {prod.sku}
                          </span>
                        </div>
                      </div>

                      {/* Sales Stats */}
                      <div className="text-right shrink-0">
                        <span className="text-xs font-extrabold text-slate-900 block font-mono">
                          {prod.quantity} <span className="text-[10px] font-normal text-slate-500">terjual</span>
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 font-mono block">
                          {formatRupiah(prod.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
              <Link
                href="/admin/products"
                className="text-xs font-bold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Lihat Katalog Produk Lengkap</span>
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Peringatan Stok Kritis (Restock Urgent)
                </h2>
                {data?.lowStockProducts && data.lowStockProducts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-xs">
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
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
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
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100">
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
                    <tr key={prod.id} className="hover:bg-amber-50/30 transition-colors">
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
                        <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-800 font-black text-xs inline-block">
                          {prod.stock} {prod.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-center font-mono text-slate-500 font-medium">
                        {prod.minimumStock} {prod.unit}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold">
                          ● Stok Kritis
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <Link
                          href={`/warehouse/stock-in?productId=${encodeURIComponent(prod.id)}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
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
