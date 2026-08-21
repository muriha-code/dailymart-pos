"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setIsCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Load initial collapse state from sessionStorage after hydration
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedState = sessionStorage.getItem("sidebar_collapsed");
      if (savedState !== null) {
        setIsCollapsed(savedState === "true");
      }
    } catch (err) {
      console.warn("Gagal membaca status sidebar dari sessionStorage:", err);
    }
  }, []);

  // Toggle state and save to sessionStorage
  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const nextState = !prev;
      try {
        sessionStorage.setItem("sidebar_collapsed", String(nextState));
      } catch (err) {
        console.warn("Gagal menyimpan status sidebar ke sessionStorage:", err);
      }
      return nextState;
    });
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed: isMounted ? isCollapsed : false, toggleSidebar, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarContext(): SidebarContextType {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext harus digunakan di dalam SidebarProvider");
  }
  return context;
}
