"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/AuthProvider";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { updateThemePreference } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = activeTheme === "dark";

  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    if (updateThemePreference) {
      updateThemePreference(newTheme);
    } else {
      setTheme(newTheme);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Beralih ke Mode Terang (Light Mode)" : "Beralih ke Mode Gelap (Dark Mode)"}
      aria-label={isDark ? "Beralih ke Mode Terang" : "Beralih ke Mode Gelap"}
      className={`bg-white hover:bg-slate-100 border-2 border-slate-900 p-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-100 dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] dark:text-amber-400 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
        className || ""
      }`}
    >
      {!mounted ? (
        <div className="w-5 h-5" />
      ) : isDark ? (
        // Sun Icon (Matahari) for Dark Mode -> switch to light
        <>
          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="5" fill="currentColor" className="opacity-20" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          {showLabel && <span className="text-xs font-black uppercase text-amber-400">Mode Terang</span>}
        </>
      ) : (
        // Moon Icon (Bulan) for Light Mode -> switch to dark
        <>
          <svg className="w-5 h-5 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
          {showLabel && <span className="text-xs font-black uppercase text-slate-900">Mode Gelap</span>}
        </>
      )}
    </button>
  );
}

