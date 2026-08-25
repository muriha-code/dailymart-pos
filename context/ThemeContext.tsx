"use client";

import React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";

export type Theme = "light" | "dark";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();

  const activeTheme: Theme = (resolvedTheme || theme || "light") === "dark" ? "dark" : "light";

  const toggleTheme = React.useCallback(() => {
    const currentTheme = theme === "system" ? resolvedTheme : theme;
    setTheme(currentTheme === "dark" ? "light" : "dark");
  }, [theme, resolvedTheme, setTheme]);

  return {
    theme: activeTheme,
    setTheme,
    toggleTheme,
    resolvedTheme: activeTheme,
  };
}
