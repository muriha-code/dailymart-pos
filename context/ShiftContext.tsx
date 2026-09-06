"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CashierShift, ShiftValidationResult } from "@/types/shift.types";
import { ShiftType } from "@/types/schedule.types";
import { shiftService } from "@/services/shift.service";
import { useAuth } from "@/components/providers/AuthProvider";
import toast from "react-hot-toast";

const ACTIVE_SHIFT_STORAGE_KEY = "dailymart_active_shift";

interface ShiftContextType {
  activeShift: CashierShift | null;
  shiftValidation: ShiftValidationResult | null;
  isCheckingShift: boolean;
  isOpenShiftModalOpen: boolean;
  setIsOpenShiftModalOpen: (isOpen: boolean) => void;
  isConfirmCloseShiftOpen: boolean;
  setIsConfirmCloseShiftOpen: (isOpen: boolean) => void;
  isCloseShiftModalOpen: boolean;
  setIsCloseShiftModalOpen: (isOpen: boolean) => void;
  completedShiftForReceipt: CashierShift | null;
  setCompletedShiftForReceipt: (shift: CashierShift | null) => void;
  isReceiptModalOpen: boolean;
  setIsReceiptModalOpen: (isOpen: boolean) => void;
  openShift: (startingCash: number, shiftType: ShiftType, cashierInfo?: { uid?: string; displayName?: string }) => Promise<CashierShift>;
  closeShift: (actualCash: number, notes: string) => Promise<CashierShift>;
  checkShiftStatus: () => Promise<ShiftValidationResult | null>;
  clearActiveShift: () => void;
}

const ShiftContext = createContext<ShiftContextType>({
  activeShift: null,
  shiftValidation: null,
  isCheckingShift: true,
  isOpenShiftModalOpen: false,
  setIsOpenShiftModalOpen: () => {},
  isConfirmCloseShiftOpen: false,
  setIsConfirmCloseShiftOpen: () => {},
  isCloseShiftModalOpen: false,
  setIsCloseShiftModalOpen: () => {},
  completedShiftForReceipt: null,
  setCompletedShiftForReceipt: () => {},
  isReceiptModalOpen: false,
  setIsReceiptModalOpen: () => {},
  openShift: async () => { throw new Error("ShiftContext not initialized"); },
  closeShift: async () => { throw new Error("ShiftContext not initialized"); },
  checkShiftStatus: async () => null,
  clearActiveShift: () => {},
});

export const useShift = () => useContext(ShiftContext);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // 1. Inisialisasi activeShift dari sessionStorage untuk mencegah modal Buka Shift berkedip/muncul saat pindah rute
  const [activeShift, setActiveShift] = useState<CashierShift | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(ACTIVE_SHIFT_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as CashierShift;
          if (parsed && parsed.status === "OPEN") {
            return parsed;
          }
        }
      } catch (err) {
        console.warn("[ShiftContext] Gagal membaca activeShift dari sessionStorage:", err);
      }
    }
    return null;
  });

  const [shiftValidation, setShiftValidation] = useState<ShiftValidationResult | null>(null);
  const [isCheckingShift, setIsCheckingShift] = useState<boolean>(true);

  // Modal Control States
  const [isOpenShiftModalOpen, setIsOpenShiftModalOpen] = useState<boolean>(false);
  const [isConfirmCloseShiftOpen, setIsConfirmCloseShiftOpen] = useState<boolean>(false);
  const [isCloseShiftModalOpen, setIsCloseShiftModalOpen] = useState<boolean>(false);
  const [completedShiftForReceipt, setCompletedShiftForReceipt] = useState<CashierShift | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // Helper untuk menyimpan activeShift ke state dan sessionStorage
  const persistActiveShift = useCallback((shift: CashierShift | null) => {
    setActiveShift(shift);
    if (typeof window !== "undefined") {
      try {
        if (shift && shift.status === "OPEN") {
          sessionStorage.setItem(ACTIVE_SHIFT_STORAGE_KEY, JSON.stringify(shift));
        } else {
          sessionStorage.removeItem(ACTIVE_SHIFT_STORAGE_KEY);
        }
      } catch (err) {
        console.warn("[ShiftContext] Gagal memperbarui sessionStorage activeShift:", err);
      }
    }
  }, []);

  // Helper untuk menghapus data shift aktif
  const clearActiveShift = useCallback(() => {
    persistActiveShift(null);
    setIsOpenShiftModalOpen(false);
    setIsConfirmCloseShiftOpen(false);
    setIsCloseShiftModalOpen(false);
  }, [persistActiveShift]);

  // Cek status shift kasir dari server
  const checkShiftStatus = useCallback(async (): Promise<ShiftValidationResult | null> => {
    setIsCheckingShift(true);
    try {
      const result = await shiftService.checkShiftStatus();
      setShiftValidation(result);

      if (result.hasActiveShift && result.activeShift) {
        // Shift aktif ditemukan di server -> simpan dan pastikan modal buka shift tertutup rapat
        persistActiveShift(result.activeShift);
        setIsOpenShiftModalOpen(false);
      } else {
        // Cek apakah ada activeShift yang tersimpan di sessionStorage
        let localShift: CashierShift | null = null;
        if (typeof window !== "undefined") {
          try {
            const stored = sessionStorage.getItem(ACTIVE_SHIFT_STORAGE_KEY);
            if (stored) {
              const parsed = JSON.parse(stored) as CashierShift;
              if (parsed && parsed.status === "OPEN") {
                localShift = parsed;
              }
            }
          } catch (e) {
            console.warn("[ShiftContext] Error parsing sessionStorage:", e);
          }
        }

        if (localShift) {
          setActiveShift(localShift);
          setIsOpenShiftModalOpen(false);
        } else {
          persistActiveShift(null);
          // HANYA buka modal Buka Shift jika kasir belum memiliki shift OPEN sama sekali
          if (result.hasScheduleToday && result.isWithinShiftTolerance) {
            setIsOpenShiftModalOpen(true);
          } else {
            setIsOpenShiftModalOpen(false);
          }
        }
      }
      return result;
    } catch (err: any) {
      console.warn("[ShiftContext] Gagal mengecek status shift kasir:", err);
      return null;
    } finally {
      setIsCheckingShift(false);
    }
  }, [persistActiveShift]);

  // Jalankan verifikasi saat provider dimuat atau user berganti
  useEffect(() => {
    checkShiftStatus();
  }, [checkShiftStatus]);

  // Buka Shift Kasir Handler
  const openShift = useCallback(
    async (
      startingCash: number,
      shiftType: ShiftType,
      cashierInfo?: { uid?: string; displayName?: string }
    ): Promise<CashierShift> => {
      try {
        const newShift = await shiftService.openShift({
          startingCash,
          shiftType,
          scheduleId: shiftValidation?.todaySchedule?.id,
          userId: cashierInfo?.uid || user?.uid,
          userName: cashierInfo?.displayName || user?.displayName,
        });

        persistActiveShift(newShift);
        setIsOpenShiftModalOpen(false);
        toast.success(`Shift ${shiftType === "SHIFT_PAGI" ? "Pagi" : "Sore"} berhasil dibuka! Selamat bertugas.`);
        return newShift;
      } catch (err: any) {
        toast.error(err.message || "Gagal membuka shift kasir.");
        throw err;
      }
    },
    [persistActiveShift, shiftValidation?.todaySchedule?.id, user?.displayName, user?.uid]
  );

  // Tutup Shift Kasir Handler
  const closeShift = useCallback(
    async (actualCash: number, notes: string): Promise<CashierShift> => {
      if (!activeShift) {
        throw new Error("Tidak ada shift aktif yang dapat ditutup.");
      }

      try {
        const closedShift = await shiftService.closeShift({
          shiftId: activeShift.id,
          actualCash,
          reconciliationNotes: notes,
        });

        // Bersihkan data shift aktif dari memory dan sessionStorage
        clearActiveShift();
        setCompletedShiftForReceipt(closedShift);
        setIsReceiptModalOpen(true);
        toast.success("Shift kasir berhasil ditutup dan direkonsiliasi.");
        return closedShift;
      } catch (err: any) {
        toast.error(err.message || "Gagal menutup shift.");
        throw err;
      }
    },
    [activeShift, clearActiveShift]
  );

  return (
    <ShiftContext.Provider
      value={{
        activeShift,
        shiftValidation,
        isCheckingShift,
        isOpenShiftModalOpen,
        setIsOpenShiftModalOpen,
        isConfirmCloseShiftOpen,
        setIsConfirmCloseShiftOpen,
        isCloseShiftModalOpen,
        setIsCloseShiftModalOpen,
        completedShiftForReceipt,
        setCompletedShiftForReceipt,
        isReceiptModalOpen,
        setIsReceiptModalOpen,
        openShift,
        closeShift,
        checkShiftStatus,
        clearActiveShift,
      }}
    >
      {children}
    </ShiftContext.Provider>
  );
}
