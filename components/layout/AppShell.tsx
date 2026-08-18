"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { SidebarProvider, useSidebarContext } from "@/context/SidebarContext";

function MainLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebarContext();

  // Hide sidebar on /login route
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Fixed Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area offset by ml-64 (expanded) or ml-20 (collapsed) with smooth transition */}
      <main
        className={`flex-1 flex flex-col h-screen overflow-y-auto transition-all duration-300 ease-in-out ${
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
    <SidebarProvider>
      <MainLayoutContent>{children}</MainLayoutContent>
    </SidebarProvider>
  );
}
