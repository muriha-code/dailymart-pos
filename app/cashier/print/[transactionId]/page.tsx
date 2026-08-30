"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PrintReceipt from "@/components/receipt/PrintReceipt";
import { transactionService } from "@/services/transaction.service";
import { settingsService } from "@/services/settings.service";
import { ReceiptData } from "@/types/receipt";

interface PrintPageProps {
  params: Promise<{ transactionId: string }>;
}

export default function CashierPrintTransactionPage({ params }: PrintPageProps) {
  const resolvedParams = use(params);
  const transactionId = resolvedParams.transactionId;
  const searchParams = useSearchParams();
  const autoPrintQuery = searchParams.get("autoprint") === "true";

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setError(null);

      try {
        // 1. Ambil data transaksi dan pengaturan toko secara paralel
        const [trx, settings] = await Promise.all([
          transactionService.getTransactionById(transactionId),
          settingsService.getSettings().catch(() => null),
        ]);

        if (!isMounted) return;

        // 2. Parse waktu dan tanggal transaksi
        const trxDateObj = trx.createdAt ? new Date(trx.createdAt) : new Date();
        const dateFormatted = !isNaN(trxDateObj.getTime())
          ? `${trxDateObj.getDate()}/${trxDateObj.getMonth() + 1}/${trxDateObj.getFullYear()}`
          : "30/8/2026";

        const hours = String(trxDateObj.getHours()).padStart(2, "0");
        const minutes = String(trxDateObj.getMinutes()).padStart(2, "0");
        const seconds = String(trxDateObj.getSeconds()).padStart(2, "0");
        const timeFormatted = `${hours}.${minutes}.${seconds}`;

        // 3. Mapping data ke format ReceiptData
        const formattedReceipt: ReceiptData = {
          storeName: settings?.storeName || "DAILYMART RETAIL",
          storeBranch: settings?.storeBranch
            ? `Cabang ${settings.storeBranch}`
            : "Cabang Utama",
          storeAddress:
            settings?.storeAddress || "Jl. Slamet Riyadi No. 182, Surakarta",
          storePhone: settings?.storePhone || "0271-712345",
          transactionNumber: trx.transactionNumber || transactionId,
          date: dateFormatted,
          time: timeFormatted,
          cashierName: trx.cashierName || "Kasir POS",
          items: (trx.items || []).map((it: any) => ({
            name: it.productName || it.name || "Produk",
            quantity: Number(it.quantity || it.qty || 1),
            price: Number(it.price || it.unitPrice || 0),
            subtotal: Number(
              it.subtotal ||
                Number(it.quantity || 1) * Number(it.price || it.unitPrice || 0)
            ),
            discount: Number(it.discount || 0),
          })),
          subtotal: Number(trx.subtotal || trx.total || 0),
          discount: Number(trx.discount || 0),
          tax: Number(trx.tax || 0),
          total: Number(trx.total || 0),
          paymentMethod: trx.paymentMethod || "CASH",
          paidAmount: Number(trx.paidAmount || trx.total || 0),
          change: Number(trx.change || 0),
          footerMessage:
            settings?.receiptFooterNote ||
            "Barang yang sudah dibeli tidak dapat ditukar. Terima kasih!",
          version: "v1.0",
        };

        setReceiptData(formattedReceipt);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Gagal memuat data transaksi untuk struk:", err);
        setError(err.message || "Gagal memuat data transaksi.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (transactionId) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [transactionId]);

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#0A0A0A] p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center font-sans">
      {/* Top Header Navigation */}
      <div className="w-full max-w-[360px] flex items-center justify-between mb-4">
        <Link
          href="/cashier/transactions"
          className="text-xs font-black text-[#0A0A0A] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>← Kembali ke Kasir</span>
        </Link>
        <Link
          href="/cashier/history"
          className="text-xs font-bold text-slate-600 hover:underline cursor-pointer"
        >
          Riwayat Transaksi
        </Link>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#0A0A0A] rounded-xl p-8 text-center max-w-[360px] w-full space-y-3">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-xs font-black uppercase tracking-wider">
            Menyiapkan Struk Kasir...
          </h3>
          <p className="text-[11px] text-slate-500 font-mono">
            {transactionId}
          </p>
        </div>
      ) : error ? (
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#0A0A0A] rounded-xl p-6 text-center max-w-[360px] w-full space-y-3">
          <div className="w-10 h-10 mx-auto rounded-lg bg-rose-100 border-2 border-black flex items-center justify-center text-rose-600 font-black">
            ✕
          </div>
          <h3 className="text-sm font-black text-rose-600">
            Gagal Memuat Struk
          </h3>
          <p className="text-xs text-slate-600 font-bold leading-relaxed">
            {error}
          </p>
          <div className="pt-2">
            <Link
              href="/cashier/transactions"
              className="inline-block px-4 py-2 bg-[#6366F1] text-white border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_#0A0A0A]"
            >
              Kembali ke Menu Kasir
            </Link>
          </div>
        </div>
      ) : receiptData ? (
        <PrintReceipt
          receipt={receiptData}
          autoPrint={autoPrintQuery}
          onNewTransaction={() => {
            window.location.href = "/cashier/transactions";
          }}
        />
      ) : null}
    </div>
  );
}
