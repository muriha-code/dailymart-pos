import { ShiftType } from './schedule.types';

export type CashierShiftStatus = 'OPEN' | 'COMPLETED' | 'AUTO_CLOSED';

export interface CashierShift {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  scheduleId?: string;
  shiftType: ShiftType;
  date: string; // YYYY-MM-DD
  startingCash: number; // Modal awal kas
  expectedCash: number; // Modal awal + Total Penjualan Tunai
  actualCash: number; // Input fisik uang saat penutupan kasir
  cashVariance: number; // actualCash - expectedCash (0 = Pas, >0 = Surplus, <0 = Shortage)
  totalCashTransactions: number;
  totalNonCashTransactions: number;
  totalTransactionsCount: number;
  reconciliationNotes?: string;
  status: CashierShiftStatus;
  openedAt: string | Date; // Jam Absen Masuk (Clock In)
  closedAt?: string | Date | null; // Jam Absen Pulang (Clock Out)
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface OpenShiftPayload {
  scheduleId?: string;
  shiftType: ShiftType;
  startingCash: number;
  userId?: string;
  userName?: string;
}

export interface CloseShiftPayload {
  shiftId: string;
  actualCash: number;
  reconciliationNotes?: string;
  breakdown?: Record<string, number>; // physical cash count breakdown
}

export interface ShiftValidationResult {
  hasActiveShift: boolean;
  activeShift: CashierShift | null;
  hasScheduleToday: boolean;
  todaySchedule: any | null;
  isWithinShiftTolerance: boolean;
  toleranceMessage?: string;
  currentExpectedCash?: number;
  currentCashSales?: number;
  currentNonCashSales?: number;
  currentTransactionsCount?: number;
  lastCompletedShift?: {
    actualCash: number;
    closedAt: string;
    userName: string;
    shiftType: ShiftType;
  } | null;
}

export interface CashierShiftApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}
