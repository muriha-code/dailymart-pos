"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import { Schedule, ShiftType, CreateSchedulePayload, UpdateSchedulePayload, SwapShiftPayload } from "@/types/schedule.types";
import { scheduleService } from "@/services/schedule.service";
import { userManagementService } from "@/services/userManagement.service";
import { AppUser } from "@/types/auth.types";
import { useAuth } from "@/components/providers/AuthProvider";

const formatRupiah = (amount: number): string => {
  return "Rp " + (amount || 0).toLocaleString("id-ID");
};

// Helper tanggal
const getTodayStr = (): string => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

const getWeekDates = (baseDateStr?: string): { start: string; end: string; days: { dateStr: string; dayName: string; formatted: string }[] } => {
  const curr = baseDateStr ? new Date(baseDateStr) : new Date();
  const day = curr.getDay();
  // Set to Monday
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diff));

  const days: { dateStr: string; dayName: string; formatted: string }[] = [];
  const dayNames = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

  for (let i = 0; i < 7; i++) {
    const nextDate = new Date(monday);
    nextDate.setDate(monday.getDate() + i);
    const dateStr = nextDate.toISOString().split("T")[0];
    const formatted = nextDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    days.push({ dateStr, dayName: dayNames[i], formatted });
  }

  return {
    start: days[0].dateStr,
    end: days[6].dateStr,
    days,
  };
};

export default function AdminSchedulesPage() {
  const { user: currentUser } = useAuth();

  // Data States
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [cashierUsers, setCashierUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [filterMode, setFilterMode] = useState<"TODAY" | "WEEK" | "ALL">("WEEK");
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>("ALL");
  const [viewTab, setViewTab] = useState<"MATRIX" | "TABLE">("MATRIX");

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Form Create State
  const [addForm, setAddForm] = useState<CreateSchedulePayload>({
    date: getTodayStr(),
    shiftType: "SHIFT_PAGI",
    startTime: "07:00",
    endTime: "15:00",
    userId: "",
    userName: "",
    userEmail: "",
    notes: "",
  });

  // Form Edit State
  const [editForm, setEditForm] = useState<UpdateSchedulePayload>({
    date: getTodayStr(),
    shiftType: "SHIFT_PAGI",
    startTime: "07:00",
    endTime: "15:00",
    userId: "",
    userName: "",
    userEmail: "",
    notes: "",
  });

  // Form Swap State
  const [swapSchedule1Id, setSwapSchedule1Id] = useState<string>("");
  const [swapSchedule2Id, setSwapSchedule2Id] = useState<string>("");
  const [swapTargetUserId, setSwapTargetUserId] = useState<string>("");

  const weekInfo = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  // Load Cashier Users for dropdown (HANYA user dengan role CASHIER)
  const loadCashierUsers = useCallback(async () => {
    try {
      const users = await userManagementService.getUsers();
      // Filter HANYA user aktif ber-role CASHIER
      const cashiers = users.filter((u) => {
        const role = (u.role || "").toUpperCase();
        return u.isActive && role === "CASHIER";
      });
      setCashierUsers(cashiers);
    } catch (err) {
      console.warn("Gagal memuat daftar kasir:", err);
    }
  }, []);

  // Load Schedules
  const loadSchedules = useCallback(async () => {
    setIsLoading(true);
    try {
      let params: { date?: string; startDate?: string; endDate?: string; userId?: string } = {};

      if (filterMode === "TODAY") {
        params.date = selectedDate;
      } else if (filterMode === "WEEK") {
        params.startDate = weekInfo.start;
        params.endDate = weekInfo.end;
      }

      if (selectedCashierFilter !== "ALL") {
        params.userId = selectedCashierFilter;
      }

      const data = await scheduleService.getSchedules(params);
      setSchedules(data);
    } catch (err: any) {
      console.error("Gagal memuat jadwal:", err);
      toast.error(err.message || "Gagal memuat daftar jadwal kasir.");
    } finally {
      setIsLoading(false);
    }
  }, [filterMode, selectedDate, weekInfo, selectedCashierFilter]);

  useEffect(() => {
    loadCashierUsers();
  }, [loadCashierUsers]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Handle Add Schedule Submit
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.date || !addForm.userId || !addForm.shiftType) {
      toast.error("Mohon lengkapi tanggal, kasir, dan jenis shift.");
      return;
    }

    try {
      const selectedUser = cashierUsers.find((u) => u.uid === addForm.userId);
      const payload: CreateSchedulePayload = {
        ...addForm,
        userName: selectedUser?.displayName || "Kasir",
        userEmail: selectedUser?.email || "",
      };

      await scheduleService.createSchedule(payload);
      toast.success("Jadwal kasir berhasil ditambahkan.");
      setIsAddModalOpen(false);
      loadSchedules();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat jadwal.");
    }
  };

  // Handle Edit Schedule Submit
  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    try {
      const selectedUser = cashierUsers.find((u) => u.uid === editForm.userId);
      const payload: UpdateSchedulePayload = {
        ...editForm,
        userName: selectedUser?.displayName || selectedSchedule.userName,
        userEmail: selectedUser?.email || selectedSchedule.userEmail,
      };

      await scheduleService.updateSchedule(selectedSchedule.id, payload);
      toast.success("Jadwal kasir berhasil diperbarui.");
      setIsEditModalOpen(false);
      setSelectedSchedule(null);
      loadSchedules();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui jadwal.");
    }
  };

  // Handle Swap Shifts Submit
  const handleSwapShifts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapSchedule1Id) {
      toast.error("Pilih jadwal utama yang akan ditukar.");
      return;
    }

    try {
      const targetUser = cashierUsers.find((u) => u.uid === swapTargetUserId);
      const payload: SwapShiftPayload = {
        scheduleId1: swapSchedule1Id,
        scheduleId2: swapSchedule2Id || undefined,
        targetUserId: swapTargetUserId,
        targetUserName: targetUser?.displayName || "",
        targetUserEmail: targetUser?.email || "",
      };

      await scheduleService.swapShifts(payload);
      toast.success("Pertukaran shift kasir berhasil disetujui & diperbarui!");
      setIsSwapModalOpen(false);
      loadSchedules();
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan pertukaran shift.");
    }
  };

  // Handle Delete Schedule
  const handleDeleteSchedule = async () => {
    if (!selectedSchedule) return;
    try {
      await scheduleService.deleteSchedule(selectedSchedule.id);
      toast.success("Jadwal kerja berhasil dihapus.");
      setIsDeleteModalOpen(false);
      setSelectedSchedule(null);
      loadSchedules();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus jadwal.");
    }
  };

  // Quick Shift Swap directly from matrix
  const handleOpenQuickSwap = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setSwapSchedule1Id(schedule.id);
    // Find counterpart schedule on the same day if exists
    const counterpart = schedules.find(
      (s) => s.date === schedule.date && s.id !== schedule.id
    );
    setSwapSchedule2Id(counterpart ? counterpart.id : "");
    setSwapTargetUserId("");
    setIsSwapModalOpen(true);
  };

  // Auto-Generate Weekly Schedules (Simulasi pembagian merata)
  const handleAutoGenerateWeekly = async () => {
    if (cashierUsers.length === 0) {
      toast.error("Tidak ada kasir aktif yang terdaftar di sistem.");
      return;
    }

    const confirmGen = window.confirm(
      `Generate jadwal otomatis untuk minggu ${weekInfo.start} s/d ${weekInfo.end} dengan ${cashierUsers.length} kasir?`
    );
    if (!confirmGen) return;

    try {
      setIsLoading(true);
      for (let i = 0; i < weekInfo.days.length; i++) {
        const day = weekInfo.days[i];
        const cashierPagi = cashierUsers[i % cashierUsers.length];
        const cashierSore = cashierUsers[(i + 1) % cashierUsers.length];

        // Shift Pagi
        await scheduleService.createSchedule({
          date: day.dateStr,
          shiftType: "SHIFT_PAGI",
          startTime: "07:00",
          endTime: "15:00",
          userId: cashierPagi.uid,
          userName: cashierPagi.displayName,
          userEmail: cashierPagi.email,
        });

        // Shift Sore
        await scheduleService.createSchedule({
          date: day.dateStr,
          shiftType: "SHIFT_SORE",
          startTime: "15:00",
          endTime: "23:00",
          userId: cashierSore.uid,
          userName: cashierSore.displayName,
          userEmail: cashierSore.email,
        });
      }

      toast.success("Jadwal mingguan berhasil digenerate otomatis!");
      loadSchedules();
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan generate jadwal.");
    } finally {
      setIsLoading(false);
    }
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = schedules.length;
    const pagiCount = schedules.filter((s) => s.shiftType === "SHIFT_PAGI").length;
    const soreCount = schedules.filter((s) => s.shiftType === "SHIFT_SORE").length;
    const todaySchedules = schedules.filter((s) => s.date === getTodayStr());

    return { total, pagiCount, soreCount, todayCount: todaySchedules.length };
  }, [schedules]);

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 font-sans space-y-6">
      {/* ========================================== */}
      {/* 1. HEADER & ACTION BAR                     */}
      {/* ========================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#6366F1] text-white border-2 border-slate-900 flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                Jadwal & Shift Kasir
              </h1>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Master Penjadwalan Kerja & Otorisasi Tukar Shift Kasir
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAutoGenerateWeekly}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 border-2 border-slate-900 dark:border-slate-100 font-black text-xs shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center gap-1.5"
          >
            <span>⚡ Auto-Assign Mingguan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (schedules.length === 0) {
                toast.error("Belum ada jadwal yang tersedia untuk ditukar.");
                return;
              }
              setSwapSchedule1Id(schedules[0].id);
              setSwapSchedule2Id(schedules.length > 1 ? schedules[1].id : "");
              setSwapTargetUserId("");
              setIsSwapModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 border-2 border-slate-900 dark:border-slate-100 font-black text-xs shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center gap-1.5"
          >
            <span>🔄 Tukar Shift</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAddForm({
                date: selectedDate,
                shiftType: "SHIFT_PAGI",
                startTime: "07:00",
                endTime: "15:00",
                userId: cashierUsers[0]?.uid || "",
                userName: cashierUsers[0]?.displayName || "",
                userEmail: cashierUsers[0]?.email || "",
                notes: "",
              });
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white border-2 border-slate-900 dark:border-slate-100 font-black text-xs shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center gap-1.5"
          >
            <span>+ Tambah Jadwal</span>
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. STATS CARDS                             */}
      {/* ========================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Total Jadwal
            </span>
            <span className="font-mono font-black text-2xl text-slate-900 dark:text-slate-100">
              {summaryMetrics.total}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 flex items-center justify-center font-black">
            📋
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Shift Pagi (07:00-15:00)
            </span>
            <span className="font-mono font-black text-2xl text-slate-900 dark:text-slate-100">
              {summaryMetrics.pagiCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 border-2 border-slate-900 text-amber-700 flex items-center justify-center font-black">
            ☀️
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
              Shift Sore (15:00-23:00)
            </span>
            <span className="font-mono font-black text-2xl text-slate-900 dark:text-slate-100">
              {summaryMetrics.soreCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 border-2 border-slate-900 text-indigo-700 flex items-center justify-center font-black">
            🌙
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Jadwal Hari Ini
            </span>
            <span className="font-mono font-black text-2xl text-slate-900 dark:text-slate-100">
              {summaryMetrics.todayCount} Kasir
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border-2 border-slate-900 text-emerald-700 flex items-center justify-center font-black">
            ⚡
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. FILTER & VIEW SELECTOR BAR              */}
      {/* ========================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
        {/* Left: Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
            {(["WEEK", "TODAY", "ALL"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  filterMode === mode
                    ? "bg-[#6366F1] text-white shadow-[1.5px_1.5px_0px_0px_rgba(15,23,42,1)] border border-slate-900"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {mode === "WEEK" ? "Minggu Ini" : mode === "TODAY" ? "Hari Ini" : "Semua"}
              </button>
            ))}
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <span className="text-slate-500">📅</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none cursor-pointer"
            />
          </div>

          {/* Cashier Filter Dropdown */}
          <select
            value={selectedCashierFilter}
            onChange={(e) => setSelectedCashierFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] focus:outline-none"
          >
            <option value="ALL">Semua Kasir ({cashierUsers.length})</option>
            {cashierUsers.map((u) => (
              <option key={u.uid} value={u.uid}>
                {u.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Right: View Toggle (Matrix / Table) */}
        <div className="flex items-center gap-1.5 self-end lg:self-auto">
          <button
            type="button"
            onClick={() => setViewTab("MATRIX")}
            className={`px-3 py-1.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer transition-all ${
              viewTab === "MATRIX"
                ? "bg-[#FFB800] text-slate-950"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            }`}
          >
            📊 Matrix Mingguan
          </button>
          <button
            type="button"
            onClick={() => setViewTab("TABLE")}
            className={`px-3 py-1.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 text-xs font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer transition-all ${
              viewTab === "TABLE"
                ? "bg-[#FFB800] text-slate-950"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
            }`}
          >
            📑 Daftar Tabel
          </button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 4. MAIN CONTENT AREA                       */}
      {/* ========================================== */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 p-12 text-center shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Memuat data jadwal kasir...</p>
        </div>
      ) : viewTab === "MATRIX" ? (
        /* MATRIX VIEW (7 DAYS COLUMN) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {weekInfo.days.map((day) => {
            const isToday = day.dateStr === getTodayStr();
            const daySchedules = schedules.filter((s) => s.date === day.dateStr);
            const pagiSched = daySchedules.find((s) => s.shiftType === "SHIFT_PAGI");
            const soreSched = daySchedules.find((s) => s.shiftType === "SHIFT_SORE");

            return (
              <div
                key={day.dateStr}
                className={`bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] p-3 flex flex-col justify-between space-y-3 ${
                  isToday ? "ring-2 ring-[#6366F1]" : ""
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-900/10 dark:border-slate-100/10 pb-2">
                  <div>
                    <span className="font-black text-xs block text-slate-900 dark:text-slate-100">
                      {day.dayName}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                      {day.formatted}
                    </span>
                  </div>
                  {isToday && (
                    <span className="px-1.5 py-0.5 rounded bg-[#6366F1] text-white font-mono font-black text-[9px] border border-slate-900">
                      HARI INI
                    </span>
                  )}
                </div>

                {/* Shift Cards in Day */}
                <div className="space-y-2.5 flex-1">
                  {/* SHIFT PAGI CARD */}
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-black text-amber-900 dark:text-amber-300">
                      <span>☀️ PAGI (07-15)</span>
                      {pagiSched && (
                        <button
                          type="button"
                          onClick={() => handleOpenQuickSwap(pagiSched)}
                          title="Tukar Shift"
                          className="hover:scale-110 cursor-pointer text-[11px]"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                    {pagiSched ? (
                      <div>
                        <div className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                          {pagiSched.userName}
                        </div>
                        {pagiSched.notes && (
                          <p className="text-[9px] text-amber-700 dark:text-amber-400 truncate">
                            {pagiSched.notes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddForm({
                            date: day.dateStr,
                            shiftType: "SHIFT_PAGI",
                            startTime: "07:00",
                            endTime: "15:00",
                            userId: cashierUsers[0]?.uid || "",
                            userName: cashierUsers[0]?.displayName || "",
                            userEmail: cashierUsers[0]?.email || "",
                            notes: "",
                          });
                          setIsAddModalOpen(true);
                        }}
                        className="w-full text-center py-1 bg-white/60 dark:bg-slate-900/60 rounded border border-dashed border-amber-300 text-[10px] font-bold text-amber-800 dark:text-amber-400 hover:bg-amber-100 cursor-pointer"
                      >
                        + Assign Kasir
                      </button>
                    )}
                  </div>

                  {/* SHIFT SORE CARD */}
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-300 dark:border-indigo-800 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-black text-indigo-900 dark:text-indigo-300">
                      <span>🌙 SORE (15-23)</span>
                      {soreSched && (
                        <button
                          type="button"
                          onClick={() => handleOpenQuickSwap(soreSched)}
                          title="Tukar Shift"
                          className="hover:scale-110 cursor-pointer text-[11px]"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                    {soreSched ? (
                      <div>
                        <div className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                          {soreSched.userName}
                        </div>
                        {soreSched.notes && (
                          <p className="text-[9px] text-indigo-700 dark:text-indigo-400 truncate">
                            {soreSched.notes}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddForm({
                            date: day.dateStr,
                            shiftType: "SHIFT_SORE",
                            startTime: "15:00",
                            endTime: "23:00",
                            userId: cashierUsers[0]?.uid || "",
                            userName: cashierUsers[0]?.displayName || "",
                            userEmail: cashierUsers[0]?.email || "",
                            notes: "",
                          });
                          setIsAddModalOpen(true);
                        }}
                        className="w-full text-center py-1 bg-white/60 dark:bg-slate-900/60 rounded border border-dashed border-indigo-300 text-[10px] font-bold text-indigo-800 dark:text-indigo-400 hover:bg-indigo-100 cursor-pointer"
                      >
                        + Assign Kasir
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px]">
                  <span className="font-mono text-slate-500">{daySchedules.length}/2 Shift</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAddForm((prev) => ({ ...prev, date: day.dateStr }));
                      setIsAddModalOpen(true);
                    }}
                    className="font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    + Jadwal
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 border-b-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 font-black">
                  <th className="p-3.5">Tanggal</th>
                  <th className="p-3.5">Shift</th>
                  <th className="p-3.5">Jam Kerja</th>
                  <th className="p-3.5">Kasir Bertugas</th>
                  <th className="p-3.5">Catatan</th>
                  <th className="p-3.5">Diperbarui Oleh</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y border-slate-200 dark:divide-slate-800">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                      Tidak ada jadwal yang ditemukan untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 font-bold">
                      <td className="p-3.5 font-mono text-slate-900 dark:text-slate-100">
                        {s.date}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-md border font-black text-[10px] ${
                            s.shiftType === "SHIFT_PAGI"
                              ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                              : "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                          }`}
                        >
                          {s.shiftType === "SHIFT_PAGI" ? "PAGI" : "SORE"}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                        {s.startTime} - {s.endTime}
                      </td>
                      <td className="p-3.5">
                        <div className="font-black text-slate-900 dark:text-slate-100">
                          {s.userName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{s.userEmail}</div>
                      </td>
                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {s.notes || "-"}
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-500">
                        {s.updatedByName || "Admin"}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenQuickSwap(s)}
                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-900 dark:border-slate-100 rounded text-[11px] font-bold hover:bg-slate-100 cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                            title="Tukar Shift"
                          >
                            🔄 Tukar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSchedule(s);
                              setEditForm({
                                date: s.date,
                                shiftType: s.shiftType,
                                startTime: s.startTime,
                                endTime: s.endTime,
                                userId: s.userId,
                                userName: s.userName,
                                userEmail: s.userEmail,
                                notes: s.notes,
                              });
                              setIsEditModalOpen(true);
                            }}
                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-900 dark:border-slate-100 rounded text-[11px] font-bold hover:bg-slate-100 cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSchedule(s);
                              setIsDeleteModalOpen(true);
                            }}
                            className="px-2 py-1 bg-rose-50 dark:bg-rose-950 border border-slate-900 dark:border-slate-100 text-rose-600 rounded text-[11px] font-bold hover:bg-rose-100 cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 5. MODAL TAMBAH JADWAL                     */}
      {/* ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#6366F1] text-white border-b-2 border-slate-900 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase">Tambah Jadwal Kasir</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded bg-white/20 text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-black uppercase tracking-wider block mb-1">Tanggal Shift:</label>
                <input
                  type="date"
                  value={addForm.date}
                  onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl font-bold font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-black uppercase tracking-wider block mb-1">Pilih Shift:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["SHIFT_PAGI", "SHIFT_SORE"] as ShiftType[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setAddForm({
                          ...addForm,
                          shiftType: st,
                          startTime: st === "SHIFT_PAGI" ? "07:00" : "15:00",
                          endTime: st === "SHIFT_PAGI" ? "15:00" : "23:00",
                        })
                      }
                      className={`p-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 font-black cursor-pointer ${
                        addForm.shiftType === st
                          ? "bg-[#FFB800] text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {st === "SHIFT_PAGI" ? "☀️ Pagi (07:00 - 15:00)" : "🌙 Sore (15:00 - 23:00)"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-black uppercase tracking-wider block mb-1">Pilih Kasir:</label>
                <select
                  value={addForm.userId}
                  onChange={(e) => setAddForm({ ...addForm, userId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl font-bold focus:outline-none"
                  required
                >
                  <option value="">-- Pilih Kasir --</option>
                  {cashierUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-black uppercase tracking-wider block mb-1">Catatan / Catatan Shift:</label>
                <input
                  type="text"
                  value={addForm.notes || ""}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Contoh: Bertugas di kasir meja utama"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl font-bold focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#6366F1] text-white font-black border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 6. MODAL EDIT JADWAL                       */}
      {/* ========================================== */}
      {isEditModalOpen && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-amber-500 text-slate-950 border-b-2 border-slate-900 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase">Edit Jadwal Kasir</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded bg-black/20 text-slate-950 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSchedule} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-black uppercase tracking-wider block mb-1">Tanggal Shift:</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl font-bold font-mono focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="font-black uppercase tracking-wider block mb-1">Pilih Shift:</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["SHIFT_PAGI", "SHIFT_SORE"] as ShiftType[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        setEditForm({
                          ...editForm,
                          shiftType: st,
                          startTime: st === "SHIFT_PAGI" ? "07:00" : "15:00",
                          endTime: st === "SHIFT_PAGI" ? "15:00" : "23:00",
                        })
                      }
                      className={`p-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 font-black cursor-pointer ${
                        editForm.shiftType === st
                          ? "bg-[#FFB800] text-slate-950 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {st === "SHIFT_PAGI" ? "☀️ Pagi (07:00 - 15:00)" : "🌙 Sore (15:00 - 23:00)"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-black uppercase tracking-wider block mb-1">Kasir Ditugaskan:</label>
                <select
                  value={editForm.userId}
                  onChange={(e) => setEditForm({ ...editForm, userId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl font-bold focus:outline-none"
                  required
                >
                  {cashierUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-black uppercase tracking-wider block mb-1">Catatan:</label>
                <input
                  type="text"
                  value={editForm.notes || ""}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl font-bold focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
                >
                  Update Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 7. MODAL TUKAR SHIFT (OTORISASI ADMIN)     */}
      {/* ========================================== */}
      {isSwapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-emerald-600 text-white border-b-2 border-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔄</span>
                <h3 className="font-black text-sm uppercase">Otorisasi Tukar Shift Kasir</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                className="w-7 h-7 rounded bg-white/20 text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSwapShifts} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-200 leading-relaxed font-bold">
                ℹ️ Saat Admin menyetujui pertukaran ini, penugasan dan hak akses login shift kedua kasir otomatis langsung diperbarui di database tanpa perlu alur self-service yang berbelit.
              </div>

              {/* Jadwal 1 */}
              <div>
                <label className="font-black uppercase tracking-wider block mb-1">
                  Jadwal Utama (Yang Ingin Ditukar):
                </label>
                <select
                  value={swapSchedule1Id}
                  onChange={(e) => setSwapSchedule1Id(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-100 rounded-xl font-bold focus:outline-none"
                  required
                >
                  <option value="">-- Pilih Jadwal 1 --</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} • {s.shiftType === "SHIFT_PAGI" ? "Pagi" : "Sore"} • Kasir: {s.userName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opsi Tukar: Dengan Jadwal Lain ATAU Reassign Kasir */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-black uppercase tracking-wider block text-slate-800 dark:text-slate-200 text-[10px]">
                  PILIHAN METODE PENUKARAN:
                </span>

                {/* Opsi 1: Saling Tukar Jadwal (Swap between 2 schedules) */}
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">
                    Opsi A: Saling Tukar dengan Dokumen Jadwal Lain:
                  </label>
                  <select
                    value={swapSchedule2Id}
                    onChange={(e) => {
                      setSwapSchedule2Id(e.target.value);
                      if (e.target.value) setSwapTargetUserId("");
                    }}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold focus:outline-none"
                  >
                    <option value="">-- Tidak memilih (Gunakan Opsi B) --</option>
                    {schedules
                      .filter((s) => s.id !== swapSchedule1Id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.date} • {s.shiftType === "SHIFT_PAGI" ? "Pagi" : "Sore"} • Kasir: {s.userName}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="text-center text-slate-400 font-mono text-[10px]">— ATAU —</div>

                {/* Opsi 2: Alihkan ke Kasir Pengganti */}
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">
                    Opsi B: Alihkan Penugasan ke Kasir Pengganti Langsung:
                  </label>
                  <select
                    value={swapTargetUserId}
                    onChange={(e) => {
                      setSwapTargetUserId(e.target.value);
                      if (e.target.value) setSwapSchedule2Id("");
                    }}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold focus:outline-none"
                  >
                    <option value="">-- Pilih Kasir Pengganti --</option>
                    {cashierUsers.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSwapModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!swapSchedule1Id || (!swapSchedule2Id && !swapTargetUserId)}
                  className={`flex-1 py-2.5 rounded-xl font-black border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer ${
                    !swapSchedule1Id || (!swapSchedule2Id && !swapTargetUserId)
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  Setujui & Tukar Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 8. MODAL DELETE CONFIRMATION               */}
      {/* ========================================== */}
      {isDeleteModalOpen && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-100 dark:bg-rose-950 border-2 border-slate-900 text-rose-600 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              🗑️
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                Hapus Jadwal Kasir?
              </h3>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">
                Jadwal tanggal <strong className="text-slate-900 dark:text-slate-100">{selectedSchedule.date}</strong> ({selectedSchedule.shiftType}) untuk <strong className="text-slate-900 dark:text-slate-100">{selectedSchedule.userName}</strong> akan dihapus dari sistem.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteSchedule}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
