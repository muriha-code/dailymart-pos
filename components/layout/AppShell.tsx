"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Hide sidebar on /login route
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area offset by pl-64 / ml-64 to prevent sidebar overlap */}
      <main className="ml-64 min-h-screen bg-slate-50">
        {children}
      </main>
    </div>
  );
}
