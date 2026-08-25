import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import ToastProvider from "@/components/providers/ToastProvider";
import Providers from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DailyMart POS - Point of Sale & Management",
  description: "Sistem Point of Sale & Manajemen Ritel Berbasis Web",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans antialiased bg-slate-100 text-slate-900 dark:bg-[#0F172A] dark:text-slate-100 transition-colors duration-200" suppressHydrationWarning>
        <Providers>
          <ToastProvider />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
