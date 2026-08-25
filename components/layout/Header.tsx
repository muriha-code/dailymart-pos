"use client";

import React from "react";
import { useSidebarContext } from "@/context/SidebarContext";
import { usePathname } from "next/navigation";

export default function Header() {
  const { toggleSidebar } = useSidebarContext();
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path.startsWith("/admin/dashboard")) return "Dashboard & Analitik Admin";
    if (path.startsWith("/admin/products")) return "Katalog Produk Ritel";
    if (path.startsWith("/admin/users")) return "Kelola Akses Pengguna";
    if (path.startsWith("/admin/reports/sales")) return "Laporan Penjualan & Performa";
    if (path.startsWith("/admin/reports/stock-opname")) return "Audit Stock Opname";
    if (path.startsWith("/admin/reports/cash-flow")) return "Laporan Arus Kas & Keuangan";
    if (path.startsWith("/cashier/transactions")) return "Mesin Kasir POS";
    if (path.startsWith("/cashier/history")) return "Riwayat Transaksi Penjualan";
    if (path.startsWith("/warehouse/stock-in")) return "Penerimaan Barang Masuk";
    if (path.startsWith("/warehouse/stock-audit")) return "Audit Stok Fisik Gudang";
    if (path.startsWith("/warehouse/inventory-report")) return "Laporan Mutasi Inventaris";
    if (path.startsWith("/warehouse/restock-requests")) return "Permintaan Restok Barang";
    if (path.startsWith("/warehouse/returns")) return "Retur & Barang Rusak";
    if (path.startsWith("/warehouse/stock-alerts")) return "Peringatan Stok & Min. Level";
    return "DailyMart POS System";
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b-2 border-slate-900 dark:border-slate-700 px-4 py-2.5 flex items-center justify-between transition-colors print:hidden">
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Navigation Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all cursor-pointer"
          title="Buka / Tutup Navigasi Sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Active Module Title */}
        <div className="flex items-center gap-2">
          <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
            {getPageTitle(pathname)}
          </span>
        </div>
      </div>
    </header>
  );
}
