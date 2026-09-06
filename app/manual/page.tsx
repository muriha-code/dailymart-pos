"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { MANUAL_DATA, ManualGuide, FAQItem } from "@/constants/manual-data";

// ============================================================================
// INLINE ICONS
// ============================================================================
function RenderIcon({ name, className = "w-5 h-5" }: { name: string; className?: string }) {
  switch (name) {
    case "Package":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    case "Users":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    case "Receipt":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      );
    case "TrendingUp":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      );
    case "Settings":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "Clock":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "ShoppingCart":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
      );
    case "CreditCard":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case "Lock":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    case "Truck":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
      );
    case "ClipboardCheck":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      );
    case "AlertTriangle":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case "Bell":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
  }
}

export default function ManualPage() {
  const { user } = useAuth();

  // Normalize current user's role
  const normalizedUserRole = useMemo(() => {
    const role = (user?.role || "ADMIN").toLowerCase();
    if (role.includes("super_admin") || role.includes("admin")) return "admin";
    if (role.includes("warehouse")) return "warehouse";
    return "cashier";
  }, [user?.role]);

  // Is Admin or Super Admin (can view any manual role view)
  const canSwitchRole = normalizedUserRole === "admin";

  // Selected manual view tab
  const [selectedRole, setSelectedRole] = useState<string>(normalizedUserRole);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Semua");
  const [expandedGuides, setExpandedGuides] = useState<Record<string, boolean>>({});
  const [expandedFaqs, setExpandedFaqs] = useState<Record<number, boolean>>({});

  // Active Role Manual Configuration
  const currentManual = useMemo(() => {
    return MANUAL_DATA[selectedRole] || MANUAL_DATA.cashier;
  }, [selectedRole]);

  // Available Categories for the selected role
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    currentManual.guides.forEach((g) => cats.add(g.category));
    return ["Semua", ...Array.from(cats)];
  }, [currentManual]);

  // Filtered Guides
  const filteredGuides = useMemo(() => {
    return currentManual.guides.filter((guide) => {
      // Category match
      const matchCategory = selectedCategory === "Semua" || guide.category === selectedCategory;

      // Query match (searches title, summary, category, steps)
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCategory;

      const matchTitle = guide.title.toLowerCase().includes(q);
      const matchSummary = guide.summary.toLowerCase().includes(q);
      const matchCategoryText = guide.category.toLowerCase().includes(q);
      const matchSteps = guide.steps.some(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.subSteps?.some((sub) => sub.toLowerCase().includes(q))
      );

      return matchCategory && (matchTitle || matchSummary || matchCategoryText || matchSteps);
    });
  }, [currentManual, selectedCategory, searchQuery]);

  // Toggle guide expansion
  const toggleGuide = (guideId: string) => {
    setExpandedGuides((prev) => ({
      ...prev,
      [guideId]: prev[guideId] === undefined ? false : !prev[guideId],
    }));
  };

  // Toggle FAQ item expansion
  const toggleFaq = (index: number) => {
    setExpandedFaqs((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // Expand all / Collapse all guides
  const handleToggleAllGuides = (expand: boolean) => {
    const nextState: Record<string, boolean> = {};
    currentManual.guides.forEach((g) => {
      nextState[g.id] = expand;
    });
    setExpandedGuides(nextState);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-200">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ================================================================= */}
        {/* MAIN HERO BANNER & ROLE TITLE */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-300 text-slate-900 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Pusat Bantuan Resmi
                </span>

                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border-2 ${currentManual.badgeBg} ${currentManual.badgeText}`}>
                  Peran: {currentManual.roleName}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                Panduan Pengguna DailyMart POS
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
                {currentManual.roleDescription}
              </p>
            </div>

            {/* Print / Action helper */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-slate-900 dark:border-slate-100 text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
                title="Cetak panduan ini"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Cetak Panduan
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* ROLE SWITCHER TABS (For Admin/Super Admin or Quick Switch) */}
          {/* =============================================================== */}
          {canSwitchRole && (
            <div className="mt-6 pt-5 border-t-2 border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Pilih Mode Panduan:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole("admin");
                    setSelectedCategory("Semua");
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
                    selectedRole === "admin"
                      ? "bg-purple-600 text-white border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-900 dark:border-slate-700 hover:bg-purple-50"
                  }`}
                >
                  👑 Admin & Super Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole("cashier");
                    setSelectedCategory("Semua");
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
                    selectedRole === "cashier"
                      ? "bg-emerald-600 text-white border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-900 dark:border-slate-700 hover:bg-emerald-50"
                  }`}
                >
                  🛒 Kasir (POS)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole("warehouse");
                    setSelectedCategory("Semua");
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black border-2 transition-all cursor-pointer ${
                    selectedRole === "warehouse"
                      ? "bg-amber-500 text-slate-950 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-900 dark:border-slate-700 hover:bg-amber-50"
                  }`}
                >
                  📦 Gudang & Logistik
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* SEARCH & CATEGORY FILTER CONTROLS */}
        {/* ================================================================= */}
        <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Realtime Search Bar */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari topik, istilah, atau langkah panduan (misal: modal awal, barcode, retur)..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-slate-400 transition-all shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Hapus pencarian"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Quick Expand / Collapse All */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleAllGuides(true)}
                className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border-2 border-slate-900 dark:border-slate-100 text-xs font-bold text-slate-900 dark:text-slate-100 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                Buka Semua
              </button>
              <button
                type="button"
                onClick={() => handleToggleAllGuides(false)}
                className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border-2 border-slate-900 dark:border-slate-100 text-xs font-bold text-slate-900 dark:text-slate-100 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                Tutup Semua
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {availableCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border-2 shrink-0 transition-all cursor-pointer ${
                  selectedCategory === category
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-900 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* ================================================================= */}
        {/* SHORTCUTS CHEAT SHEET (IF APPLICABLE) */}
        {/* ================================================================= */}
        {currentManual.shortcuts && currentManual.shortcuts.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-slate-900 dark:border-amber-400 rounded-2xl p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(251,191,36,1)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="p-1 rounded-md bg-amber-300 border border-slate-900 text-slate-900">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-amber-200 uppercase tracking-wider">
                Pintasan Keyboard Cepat (Keyboard Shortcuts)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {currentManual.shortcuts.map((sc, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
                >
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {sc.description}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {sc.keys.map((k, ki) => (
                      <kbd
                        key={ki}
                        className="px-2 py-0.5 text-xs font-black font-mono bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-900 dark:border-slate-600 rounded shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* GUIDES LIST */}
        {/* ================================================================= */}
        <div className="space-y-5">
          {filteredGuides.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-2xl p-10 text-center shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 border-2 border-slate-900 mx-auto flex items-center justify-center font-black text-xl">
                🔍
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Tidak ada topik panduan yang cocok
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Coba gunakan kata kunci pencarian yang lain atau pilih kategori &quot;Semua&quot;.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("Semua");
                }}
                className="px-4 py-2 rounded-xl bg-amber-300 text-slate-900 border-2 border-slate-900 text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            filteredGuides.map((guide) => {
              const isExpanded = expandedGuides[guide.id] !== false; // Default expanded

              return (
                <div
                  key={guide.id}
                  id={guide.id}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all overflow-hidden"
                >
                  {/* Guide Header Bar */}
                  <div
                    onClick={() => toggleGuide(guide.id)}
                    className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-800/60 border-b-2 border-slate-900 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-all select-none"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 flex items-center justify-center text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] shrink-0">
                        <RenderIcon name={guide.iconName} className="w-6 h-6" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-900 dark:border-slate-600">
                            {guide.category}
                          </span>
                          {guide.badge && (
                            <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider border border-slate-900 ${guide.badgeColor || "bg-emerald-100 text-emerald-900"}`}>
                              {guide.badge}
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            ⏱️ {guide.estimatedReadTime}
                          </span>
                        </div>

                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-50">
                          {guide.title}
                        </h2>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                          {guide.summary}
                        </p>
                      </div>
                    </div>

                    {/* Right side Actions & Chevron */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {guide.relatedPath && (
                        <Link
                          href={guide.relatedPath}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-300 hover:bg-amber-400 text-slate-950 border-2 border-slate-900 text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] transition-all"
                        >
                          <span>{guide.relatedLabel || "Buka Halaman"}</span>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </Link>
                      )}

                      <button
                        type="button"
                        aria-label="Toggle Expand"
                        className="p-1.5 rounded-lg border-2 border-slate-900 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]"
                      >
                        <svg
                          className={`w-4 h-4 transform transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : "rotate-0"
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Expandable Step Details */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 space-y-6">
                      {/* Step by Step List */}
                      <div className="space-y-4">
                        <div className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Langkah - Langkah Pelaksanaan:
                        </div>

                        {guide.steps.map((step) => (
                          <div
                            key={step.stepNumber}
                            className="bg-slate-50 dark:bg-slate-800/70 border-2 border-slate-900 dark:border-slate-700 rounded-xl p-4 space-y-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                          >
                            <div className="flex items-start gap-3">
                              {/* Step Number Badge */}
                              <span className="w-7 h-7 rounded-lg bg-amber-300 dark:bg-amber-400 text-slate-900 border-2 border-slate-900 flex items-center justify-center text-xs font-black shrink-0 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]">
                                {step.stepNumber}
                              </span>

                              <div className="space-y-1 flex-1">
                                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                                  {step.title}
                                </h4>
                                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                  {step.description}
                                </p>
                              </div>
                            </div>

                            {/* Sub-steps / Action bullets */}
                            {step.subSteps && step.subSteps.length > 0 && (
                              <ul className="ml-10 space-y-1.5 list-disc list-outside text-xs text-slate-600 dark:text-slate-300 pl-2">
                                {step.subSteps.map((sub, sIdx) => (
                                  <li key={sIdx} className="leading-relaxed">
                                    {sub}
                                  </li>
                                ))}
                              </ul>
                            )}

                            {/* Warning or Tip Box */}
                            {step.warningOrTip && (
                              <div
                                className={`ml-10 p-3 rounded-lg border-2 text-xs font-medium flex items-start gap-2 ${
                                  step.warningOrTip.type === "warning"
                                    ? "bg-rose-50 dark:bg-rose-950/40 border-rose-400 text-rose-900 dark:text-rose-200"
                                    : "bg-blue-50 dark:bg-blue-950/40 border-blue-400 text-blue-900 dark:text-blue-200"
                                }`}
                              >
                                <span className="text-sm shrink-0">
                                  {step.warningOrTip.type === "warning" ? "⚠️" : "💡"}
                                </span>
                                <div className="leading-relaxed">
                                  <strong className="font-bold">
                                    {step.warningOrTip.type === "warning" ? "Peringatan: " : "Tips: "}
                                  </strong>
                                  {step.warningOrTip.text}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Quick Tips Footer within Guide */}
                      {guide.quickTips && guide.quickTips.length > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 border-2 border-slate-900 dark:border-emerald-500 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2 text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                            <span>✨ Tips Penting untuk Efisiensi:</span>
                          </div>
                          <ul className="space-y-1 text-xs text-emerald-950 dark:text-emerald-100 list-disc list-inside">
                            {guide.quickTips.map((tip, tIdx) => (
                              <li key={tIdx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ================================================================= */}
        {/* FAQ & TROUBLESHOOTING SECTION */}
        {/* ================================================================= */}
        {currentManual.faqs && currentManual.faqs.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-300 text-slate-900 border-2 border-slate-900 flex items-center justify-center font-black text-sm shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)]">
                ❓
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Pertanyaan Sering Ditanyakan (FAQ & Troubleshooting)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Solusi cepat atas kendala yang sering terjadi di operasional harian.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {currentManual.faqs.map((faq, fIdx) => {
                const isFaqOpen = !!expandedFaqs[fIdx];
                return (
                  <div
                    key={fIdx}
                    className="border-2 border-slate-900 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/80 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(fIdx)}
                      className="w-full text-left p-3.5 flex items-center justify-between gap-3 font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-amber-500 font-black">Q:</span>
                        {faq.question}
                      </span>
                      <svg
                        className={`w-4 h-4 transform transition-transform duration-200 shrink-0 ${
                          isFaqOpen ? "rotate-180" : "rotate-0"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isFaqOpen && (
                      <div className="p-3.5 pt-0 text-xs sm:text-sm text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 leading-relaxed">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold mr-1.5">Jawab:</span>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
