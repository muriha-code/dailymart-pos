"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { SidebarProvider, useSidebarContext } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";

import AuthProvider from "@/components/providers/AuthProvider";

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebarContext();

  // Hide sidebar on standalone pages like /login & /access-denied
  const isStandalonePage = pathname === "/login" || pathname?.startsWith("/access-denied");

  if (isStandalonePage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Fixed Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area offset by ml-64 (expanded) or ml-20 (collapsed) with smooth transition */}
      <main
        className={`flex-1 flex flex-col h-screen overflow-y-auto bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 transition-all duration-300 ease-in-out print:ml-0 print:h-auto print:overflow-visible print:w-full ${
          isCollapsed ? "ml-20" : "ml-64"
        }`}
      >
        {children}
      </main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <MainLayoutContent>{children}</MainLayoutContent>
      </SidebarProvider>
    </AuthProvider>
  );
}

