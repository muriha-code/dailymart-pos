"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import { AppUser, UserRole } from "@/types/auth.types";
import { useSidebarContext } from "@/context/SidebarContext";

/**
 * Generates 2-letter uppercase initials from display name or email.
 * Example: "Budi Santoso" -> "BS", "Admin" -> "AD"
 */
function getInitials(name: string | undefined | null): string {
  if (!name || !name.trim()) return "DM";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  isQuickAccess?: boolean;
}

interface MenuSection {
  sectionTitle: string;
  items: MenuItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed, toggleSidebar } = useSidebarContext();

  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  // Fetch session user info on mount
  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUser(json.data as AppUser);
          return;
        }
      }
    } catch (err) {
      console.warn("Gagal memuat sesi user untuk sidebar:", err);
    }

    // Fallback info if session API fails or is loading
    const currentUser = clientAuth.currentUser;
    if (currentUser) {
      setUser({
        uid: currentUser.uid,
        email: currentUser.email || "",
        displayName: currentUser.displayName || currentUser.email?.split("@")[0] || "User",
        role: "ADMIN",
        isActive: true,
        photoURL: currentUser.photoURL || undefined,
      });
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Logout Handler
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      await signOut(clientAuth);
      window.location.href = "/login";
    } catch (err) {
      console.error("Gagal melakukan logout:", err);
      setIsLoggingOut(false);
    }
  };

  const userRole: UserRole = user?.role || "ADMIN";

  // Helper check active link
  const isLinkActive = (href: string): boolean => {
    if (pathname === href) return true;
    if (href !== "/" && pathname.startsWith(href)) return true;
    return false;
  };

  // ==========================================
  // RBAC MENU STRUCTURE DEFINITIONS
  // ==========================================

  // A. ADMIN MENU SECTIONS
  const adminSections: MenuSection[] = [
    {
      sectionTitle: "MANAJEMEN UTAMA",
      items: [
        {
          title: "Dashboard & Analitik",
          href: "/admin/dashboard",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM9 12a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2a2 2 0 01-2-2v-6z" />
            </svg>
          ),
        },
        {
          title: "Katalog Produk",
          href: "/admin/products",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          ),
        },
        {
          title: "Kelola Pengguna",
          href: "/admin/users",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
        },
        {
          title: "Laporan Penjualan",
          href: "/admin/reports",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
      ],
    },
    {
      sectionTitle: "AKSES OPERASIONAL",
      items: [
        {
          title: "🛒 Buka Mesin Kasir",
          href: "/cashier/transactions",
          isQuickAccess: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          ),
        },
        {
          title: "📦 Buka Penerimaan Gudang",
          href: "/warehouse/stock-in",
          isQuickAccess: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8" />
            </svg>
          ),
        },
        {
          title: "📋 Verifikasi Stok (Opname)",
          href: "/warehouse/stock-audit",
          isQuickAccess: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
        },
      ],
    },
  ];

  // B. CASHIER MENU SECTIONS
  const cashierSections: MenuSection[] = [
    {
      sectionTitle: "OPERASIONAL KASIR",
      items: [
        {
          title: "Mesin Kasir (POS)",
          href: "/cashier/transactions",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          ),
        },
        {
          title: "Riwayat Shift & Struk",
          href: "/cashier/history",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        },
      ],
    },
  ];

  // C. WAREHOUSE MENU SECTIONS
  const warehouseSections: MenuSection[] = [
    {
      sectionTitle: "INVENTARIS & LOGISTIK",
      items: [
        {
          title: "Barang Masuk (Stock-In)",
          href: "/warehouse/stock-in",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8" />
            </svg>
          ),
        },
        {
          title: "Verifikasi Stok (Opname)",
          href: "/warehouse/stock-audit",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          ),
        },
        {
          title: "Kartu Stok & Mutasi",
          href: "/warehouse/inventory",
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          ),
        },
      ],
    },
  ];

  // Select section configuration based on user role
  const activeMenuSections =
    userRole === "ADMIN"
      ? adminSections
      : userRole === "WAREHOUSE"
      ? warehouseSections
      : cashierSections;

  const initials = getInitials(user?.displayName || user?.email);

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 z-40 flex flex-col justify-between overflow-y-auto select-none font-sans shadow-xs transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* ========================================== */}
        {/* TOP BRANDING & LOGO + HAMBURGER TOGGLE */}
        {/* ========================================== */}
        <div>
          <div className={`p-4 border-b border-slate-100 flex items-center ${
            isCollapsed ? "justify-center flex-col gap-2" : "justify-between gap-3"
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                D
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-base text-slate-900 tracking-tight">DailyMart</span>
                    <span className="font-black text-base text-amber-600">POS</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block -mt-0.5">
                    Smart Retail System
                  </span>
                </div>
              )}
            </div>

            {/* Hamburger Collapse Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
              title={isCollapsed ? "Buka Sidebar (Expanded)" : "Kecilkan Sidebar (Collapsed)"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                )}
              </svg>
            </button>
          </div>

          {/* ========================================== */}
          {/* DYNAMIC RBAC NAVIGATION MENU */}
          {/* ========================================== */}
          <nav className="p-3 space-y-5">
            {activeMenuSections.map((section, idx) => (
              <div key={section.sectionTitle} className="space-y-1.5">
                {!isCollapsed ? (
                  <h3 className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {section.sectionTitle}
                  </h3>
                ) : (
                  idx > 0 && <div className="h-px bg-slate-100 my-2"></div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isLinkActive(item.href);

                    return (
                      <Link
                        key={item.href + item.title}
                        href={item.href}
                        title={item.title}
                        className={`flex items-center text-xs transition-all ${
                          isCollapsed
                            ? `justify-center py-3 rounded-xl ${
                                active
                                  ? "bg-amber-50 text-amber-950 font-bold border-l-4 border-amber-500"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                              }`
                            : `gap-3 ${
                                active
                                  ? "bg-amber-50 text-amber-950 font-bold border-l-4 border-amber-500 pl-3.5 pr-3 py-2.5 rounded-r-xl shadow-2xs"
                                  : item.isQuickAccess
                                  ? "text-slate-700 hover:bg-amber-50/50 hover:text-amber-900 font-medium px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium px-4 py-2.5 rounded-xl"
                              }`
                        }`}
                      >
                        <span className={`${active ? "text-amber-600" : "text-slate-400"} shrink-0`}>
                          {item.icon}
                        </span>
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* ========================================== */}
        {/* FOOTER USER PROFILE & AVATAR */}
        {/* ========================================== */}
        <div className={`border-t border-slate-100 bg-slate-50/60 shrink-0 ${
          isCollapsed ? "p-2 space-y-2 text-center" : "p-4 space-y-3"
        }`}>
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
            {/* Avatar Container with Image or Initials Fallback */}
            <div
              className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-extrabold text-sm shadow-xs shrink-0 overflow-hidden border border-amber-300"
              title={isCollapsed ? `${user?.displayName || "User"} (${userRole})` : undefined}
            >
              {user?.photoURL && !imageError ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {/* User Name, Email, & Role Badge (Hidden when Collapsed) */}
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 truncate">
                  {user?.displayName || "Pengguna POS"}
                </h4>
                <p className="text-[10px] text-slate-500 truncate">
                  {user?.email || "user@dailymart.id"}
                </p>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      userRole === "ADMIN"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : userRole === "WAREHOUSE"
                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    {userRole}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Logout Action Button */}
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            title={isCollapsed ? "Keluar Sesi (Logout)" : undefined}
            className={`w-full inline-flex items-center justify-center rounded-xl bg-white hover:bg-red-50 text-slate-700 hover:text-red-700 font-bold text-xs border border-slate-200 hover:border-red-200 transition-all cursor-pointer group ${
              isCollapsed ? "p-2.5" : "gap-2 px-3 py-2"
            }`}
          >
            <svg
              className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {!isCollapsed && <span>Keluar Sesi (Logout)</span>}
          </button>
        </div>

      </aside>

      {/* ========================================== */}
      {/* LOGOUT CONFIRMATION MODAL */}
      {/* ========================================== */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4">
            {/* Warning Badge Icon */}
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </div>

            {/* Title & Description */}
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Konfirmasi Keluar
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sesi Anda akan diakhiri. Pastikan semua transaksi atau data barang telah tersimpan dengan benar sebelum keluar.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isLoggingOut && (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>{isLoggingOut ? "Mengeluarkan..." : "Ya, Keluar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
