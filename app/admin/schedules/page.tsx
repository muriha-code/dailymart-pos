"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Schedule,
  ShiftType,
  CreateSchedulePayload,
  UpdateSchedulePayload,
  SwapShiftPayload,
  ScheduleTemplate,
  DayOfWeek,
  DayScheduleTemplate,
} from "@/types/schedule.types";
import { scheduleService } from "@/services/schedule.service";
import { userManagementService } from "@/services/userManagement.service";
import { AppUser } from "@/types/auth.types";
import { useAuth } from "@/components/providers/AuthProvider";

// Helper tanggal
const getTodayStr = (): string => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

const DAY_NAMES_ORDER: { key: DayOfWeek; label: string; short: string }[] = [
  { key: "monday", label: "Senin", short: "Sen" },
  { key: "tuesday", label: "Selasa", short: "Sel" },
  { key: "wednesday", label: "Rabu", short: "Rab" },
  { key: "thursday", label: "Kamis", short: "Kam" },
  { key: "friday", label: "Jumat", short: "Jum" },
  { key: "saturday", label: "Sabtu", short: "Sab" },
  { key: "sunday", label: "Minggu", short: "Min" },
];

const DEFAULT_EMPTY_DAYS: Record<DayOfWeek, DayScheduleTemplate> = {
  monday: { pagi: null, sore: null },
  tuesday: { pagi: null, sore: null },
  wednesday: { pagi: null, sore: null },
  thursday: { pagi: null, sore: null },
  friday: { pagi: null, sore: null },
  saturday: { pagi: null, sore: null },
  sunday: { pagi: null, sore: null },
};

const getDayKeyFromDate = (dateStr: string): DayOfWeek => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayIdx = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const map: DayOfWeek[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return map[dayIdx];
};

const getWeekDates = (
  baseDateStr?: string
): {
  start: string;
  end: string;
  days: { dateStr: string; dayKey: DayOfWeek; dayName: string; formatted: string }[];
} => {
  const curr = baseDateStr ? new Date(baseDateStr) : new Date();
  const day = curr.getDay();
  // Set to Monday
  const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(curr.setDate(diff));

  const days: { dateStr: string; dayKey: DayOfWeek; dayName: string; formatted: string }[] = [];

  for (let i = 0; i < 7; i++) {
    const nextDate = new Date(monday);
    nextDate.setDate(monday.getDate() + i);
    const dateStr = nextDate.toISOString().split("T")[0];
    const formatted = nextDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const dayKey = DAY_NAMES_ORDER[i].key;
    const dayName = DAY_NAMES_ORDER[i].label;
    days.push({ dateStr, dayKey, dayName, formatted });
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
  const [overrideSchedules, setOverrideSchedules] = useState<Schedule[]>([]);
  const [scheduleTemplate, setScheduleTemplate] = useState<ScheduleTemplate | null>(null);
  const [cashierUsers, setCashierUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter States
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [filterMode, setFilterMode] = useState<"TODAY" | "WEEK" | "ALL">("WEEK");
  const [selectedCashierFilter, setSelectedCashierFilter] = useState<string>("ALL");
  const [viewTab, setViewTab] = useState<"MATRIX" | "TABLE">("MATRIX");

  // Template Modal States
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [templateFormDays, setTemplateFormDays] = useState<Record<DayOfWeek, DayScheduleTemplate>>(
    DEFAULT_EMPTY_DAYS
  );
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);

  // Override Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

  // Form Create/Override State
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
      const cashiers = users.filter((u) => {
        const role = (u.role || "").toUpperCase();
        return u.isActive && role === "CASHIER";
      });
      setCashierUsers(cashiers);
    } catch (err) {
      console.warn("Gagal memuat daftar kasir:", err);
    }
  }, []);

  // Load Master Template & Overrides
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Ambil Template Master
      const tmpl = await scheduleService.getScheduleTemplate();
      setScheduleTemplate(tmpl);
      if (tmpl?.days) {
        setTemplateFormDays(tmpl.days);
      }

      // 2. Ambil Dokumen Overrides di /schedules
      let params: { date?: string; startDate?: string; endDate?: string; userId?: string } = {};

      if (filterMode === "TODAY") {
        params.date = selectedDate;
      } else if (filterMode === "WEEK") {
        params.startDate = weekInfo.start;
        params.endDate = weekInfo.end;
      }

      const overrides = await scheduleService.getSchedules(params);
      setOverrideSchedules(overrides);
    } catch (err: any) {
      console.error("Gagal memuat data jadwal:", err);
      toast.error(err.message || "Gagal memuat data jadwal kasir.");
    } finally {
      setIsLoading(false);
    }
  }, [filterMode, selectedDate, weekInfo]);

  useEffect(() => {
    loadCashierUsers();
  }, [loadCashierUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper untuk Menyusun Jadwal Terpadu (Template + Overrides)
  const resolveDaySchedules = useCallback(
    (dateStr: string) => {
      const dayKey = getDayKeyFromDate(dateStr);
      const dayTmpl = scheduleTemplate?.days?.[dayKey] || DEFAULT_EMPTY_DAYS[dayKey];

      // Overrides untuk tanggal ini
      const dateOverrides = overrideSchedules.filter((s) => s.date === dateStr);
      const pagiOverride = dateOverrides.find((s) => s.shiftType === "SHIFT_PAGI");
      const soreOverride = dateOverrides.find((s) => s.shiftType === "SHIFT_SORE");

      // Shift Pagi Resolution
      let pagi: Schedule | null = null;
      if (pagiOverride) {
        pagi = {
          ...pagiOverride,
          isOverride: true,
          source: "OVERRIDE",
        };
      } else if (dayTmpl.pagi && dayTmpl.pagi.userId) {
        pagi = {
          id: `TMPL_${dateStr}_PAGI`,
          date: dateStr,
          shiftType: "SHIFT_PAGI",
          startTime: dayTmpl.pagi.startTime || "07:00",
          endTime: dayTmpl.pagi.endTime || "15:00",
          userId: dayTmpl.pagi.userId,
          userName: dayTmpl.pagi.userName,
          userEmail: dayTmpl.pagi.userEmail,
          notes: dayTmpl.pagi.notes || "Jadwal Tetap",
          isOverride: false,
          source: "TEMPLATE",
        };
      }

      // Shift Sore Resolution
      let sore: Schedule | null = null;
      if (soreOverride) {
        sore = {
          ...soreOverride,
          isOverride: true,
          source: "OVERRIDE",
        };
      } else if (dayTmpl.sore && dayTmpl.sore.userId) {
        sore = {
          id: `TMPL_${dateStr}_SORE`,
          date: dateStr,
          shiftType: "SHIFT_SORE",
          startTime: dayTmpl.sore.startTime || "15:00",
          endTime: dayTmpl.sore.endTime || "23:00",
          userId: dayTmpl.sore.userId,
          userName: dayTmpl.sore.userName,
          userEmail: dayTmpl.sore.userEmail,
          notes: dayTmpl.sore.notes || "Jadwal Tetap",
          isOverride: false,
          source: "TEMPLATE",
        };
      }

      return { pagi, sore, all: [pagi, sore].filter(Boolean) as Schedule[] };
    },
    [scheduleTemplate, overrideSchedules]
  );

  // List gabungan semua jadwal untuk periode yang dipilih (berguna untuk Table View & Filter)
  const resolvedPeriodSchedules = useMemo(() => {
    const list: Schedule[] = [];
    const datesToEvaluate: string[] = [];

    if (filterMode === "TODAY") {
      datesToEvaluate.push(selectedDate);
    } else if (filterMode === "WEEK") {
      weekInfo.days.forEach((d) => datesToEvaluate.push(d.dateStr));
    } else {
      // ALL Mode: evaluasi semua tanggal unik dari overrides + minggu aktif
      const allDates = new Set<string>();
      weekInfo.days.forEach((d) => allDates.add(d.dateStr));
      overrideSchedules.forEach((s) => allDates.add(s.date));
      datesToEvaluate.push(...Array.from(allDates).sort());
    }

    datesToEvaluate.forEach((d) => {
      const { pagi, sore } = resolveDaySchedules(d);
      if (pagi) list.push(pagi);
      if (sore) list.push(sore);
    });

    if (selectedCashierFilter !== "ALL") {
      return list.filter((s) => s.userId === selectedCashierFilter);
    }

    return list;
  }, [filterMode, selectedDate, weekInfo, overrideSchedules, resolveDaySchedules, selectedCashierFilter]);

  // Handle Simpan Master Template
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTemplate(true);
    try {
      await scheduleService.saveScheduleTemplate({ days: templateFormDays });
      toast.success("Template jadwal tetap berhasil disimpan & diterapkan!");
      setIsTemplateModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan template jadwal.");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Helper untuk update template per hari/shift
  const updateTemplateShift = (
    dayKey: DayOfWeek,
    shift: "pagi" | "sore",
    userId: string
  ) => {
    const user = cashierUsers.find((u) => u.uid === userId);
    setTemplateFormDays((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [shift]: userId
          ? {
              userId: user?.uid || "",
              userName: user?.displayName || "Kasir",
              userEmail: user?.email || "",
              startTime: shift === "pagi" ? "07:00" : "15:00",
              endTime: shift === "pagi" ? "15:00" : "23:00",
              notes: "",
            }
          : null,
      },
    }));
  };

  // Handle Add/Create Override Schedule
  const handleCreateOverride = async (e: React.FormEvent) => {
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
      toast.success("Pengecualian jadwal kasir berhasil disimpan.");
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat pengecualian jadwal.");
    }
  };

  // Handle Edit Schedule
  const handleUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSchedule) return;

    try {
      const selectedUser = cashierUsers.find((u) => u.uid === editForm.userId);

      // Jika yang diedit adalah item dari Template (belum punya doc override di Firestore), buatkan Override baru
      if (!selectedSchedule.isOverride || selectedSchedule.id.startsWith("TMPL_")) {
        await scheduleService.createSchedule({
          date: editForm.date || selectedSchedule.date,
          shiftType: editForm.shiftType || selectedSchedule.shiftType,
          startTime: editForm.startTime || selectedSchedule.startTime,
          endTime: editForm.endTime || selectedSchedule.endTime,
          userId: editForm.userId || selectedSchedule.userId,
          userName: selectedUser?.displayName || selectedSchedule.userName,
          userEmail: selectedUser?.email || selectedSchedule.userEmail,
          notes: editForm.notes || "Pengecualian Jadwal Tanggal",
        });
        toast.success("Pengecualian jadwal untuk tanggal ini berhasil disimpan!");
      } else {
        // Edit dokumen override yang sudah ada
        const payload: UpdateSchedulePayload = {
          ...editForm,
          userName: selectedUser?.displayName || selectedSchedule.userName,
          userEmail: selectedUser?.email || selectedSchedule.userEmail,
        };

        await scheduleService.updateSchedule(selectedSchedule.id, payload);
        toast.success("Jadwal pengecualian berhasil diperbarui.");
      }

      setIsEditModalOpen(false);
      setSelectedSchedule(null);
      loadData();
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
      const targetSchedule = resolvedPeriodSchedules.find((s) => s.id === swapSchedule1Id);

      // Jika jadwal utama berasal dari template, buat override terlebih dahulu
      let realSchedule1Id = swapSchedule1Id;
      if (swapSchedule1Id.startsWith("TMPL_") && targetSchedule) {
        const created = await scheduleService.createSchedule({
          date: targetSchedule.date,
          shiftType: targetSchedule.shiftType,
          startTime: targetSchedule.startTime,
          endTime: targetSchedule.endTime,
          userId: targetSchedule.userId,
          userName: targetSchedule.userName,
          userEmail: targetSchedule.userEmail,
          notes: "Penyesuaian Tukar Shift",
        });
        realSchedule1Id = created.id;
      }

      let realSchedule2Id = swapSchedule2Id;
      if (swapSchedule2Id && swapSchedule2Id.startsWith("TMPL_")) {
        const targetSchedule2 = resolvedPeriodSchedules.find((s) => s.id === swapSchedule2Id);
        if (targetSchedule2) {
          const created2 = await scheduleService.createSchedule({
            date: targetSchedule2.date,
            shiftType: targetSchedule2.shiftType,
            startTime: targetSchedule2.startTime,
            endTime: targetSchedule2.endTime,
            userId: targetSchedule2.userId,
            userName: targetSchedule2.userName,
            userEmail: targetSchedule2.userEmail,
            notes: "Penyesuaian Tukar Shift",
          });
          realSchedule2Id = created2.id;
        }
      }

      const payload: SwapShiftPayload = {
        scheduleId1: realSchedule1Id,
        scheduleId2: realSchedule2Id || undefined,
        targetUserId: swapTargetUserId,
        targetUserName: targetUser?.displayName || "",
        targetUserEmail: targetUser?.email || "",
      };

      await scheduleService.swapShifts(payload);
      toast.success("Pertukaran shift kasir berhasil disetujui & diperbarui!");
      setIsSwapModalOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal melakukan pertukaran shift.");
    }
  };

  // Handle Delete Override (Kembalikan ke default template)
  const handleDeleteOverride = async () => {
    if (!selectedSchedule) return;
    try {
      if (selectedSchedule.isOverride && !selectedSchedule.id.startsWith("TMPL_")) {
        await scheduleService.deleteSchedule(selectedSchedule.id);
        toast.success("Pengecualian tanggal dihapus. Jadwal kembali ke Template Tetap.");
      }
      setIsDeleteModalOpen(false);
      setSelectedSchedule(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus pengecualian jadwal.");
    }
  };

  // Quick Open Edit / Override Modal for a shift
  const handleOpenEdit = (sched: Schedule) => {
    setSelectedSchedule(sched);
    setEditForm({
      date: sched.date,
      shiftType: sched.shiftType,
      startTime: sched.startTime,
      endTime: sched.endTime,
      userId: sched.userId,
      userName: sched.userName,
      userEmail: sched.userEmail,
      notes: sched.notes,
    });
    setIsEditModalOpen(true);
  };

  // Quick Shift Swap directly from matrix
  const handleOpenQuickSwap = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setSwapSchedule1Id(schedule.id);
    // Cari rekan shift di tanggal yang sama jika ada
    const counterpart = resolvedPeriodSchedules.find(
      (s) => s.date === schedule.date && s.id !== schedule.id
    );
    setSwapSchedule2Id(counterpart ? counterpart.id : "");
    setSwapTargetUserId("");
    setIsSwapModalOpen(true);
  };

  // Metrics Summary
  const summaryMetrics = useMemo(() => {
    const total = resolvedPeriodSchedules.length;
    const pagiCount = resolvedPeriodSchedules.filter((s) => s.shiftType === "SHIFT_PAGI").length;
    const soreCount = resolvedPeriodSchedules.filter((s) => s.shiftType === "SHIFT_SORE").length;
    const overrideCount = resolvedPeriodSchedules.filter((s) => s.isOverride).length;
    const todaySchedules = resolvedPeriodSchedules.filter((s) => s.date === getTodayStr());

    return {
      total,
      pagiCount,
      soreCount,
      overrideCount,
      todayCount: todaySchedules.length,
    };
  }, [resolvedPeriodSchedules]);

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-slate-100 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 font-sans space-y-6">
      {/* ========================================== */}
      {/* 1. HEADER & ACTION BAR                     */}
      {/* ========================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#6366F1] text-white border-2 border-slate-900 flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
                  Jadwal & Shift Kasir
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-400 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase">
                  Fixed Template Active
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Pola Jadwal Tetap Mingguan & Otorisasi Pengecualian / Tukar Shift Kasir
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              if (scheduleTemplate?.days) {
                setTemplateFormDays(scheduleTemplate.days);
              }
              setIsTemplateModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#FFB800] hover:bg-amber-400 text-slate-950 border-2 border-slate-900 dark:border-slate-100 font-black text-xs shadow-[2.5px_2.5px_0px_0px_rgba(15,23,42,1)] dark:shadow-[2.5px_2.5px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center gap-1.5"
          >
            <span>⚙️ Atur Template Jadwal Tetap</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (resolvedPeriodSchedules.length === 0) {
                toast.error("Belum ada jadwal yang tersedia untuk ditukar.");
                return;
              }
              setSwapSchedule1Id(resolvedPeriodSchedules[0].id);
              setSwapSchedule2Id(
                resolvedPeriodSchedules.length > 1 ? resolvedPeriodSchedules[1].id : ""
              );
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
            <span>+ Pengecualian Tanggal</span>
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
              Total Shift Aktif
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
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
              Pengecualian / Overrides
            </span>
            <span className="font-mono font-black text-2xl text-rose-600 dark:text-rose-400">
              {summaryMetrics.overrideCount} Tanggal
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 border-2 border-slate-900 text-rose-700 flex items-center justify-center font-black">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3.5">
          {weekInfo.days.map((day) => {
            const isToday = day.dateStr === getTodayStr();
            const { pagi: pagiSched, sore: soreSched } = resolveDaySchedules(day.dateStr);

            // Filter status untuk kasir spesifik
            const isFiltered = selectedCashierFilter !== "ALL";
            const hasPagiForCashier = pagiSched?.userId === selectedCashierFilter;
            const hasSoreForCashier = soreSched?.userId === selectedCashierFilter;
            const isCashierFreeToday = isFiltered && !hasPagiForCashier && !hasSoreForCashier;

            return (
              <div
                key={day.dateStr}
                className={`bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] p-3.5 flex flex-col justify-between space-y-3 ${
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
                <div className="space-y-3 flex-1">
                  {isFiltered ? (
                    isCashierFreeToday ? (
                      <div className="p-3 bg-slate-50/60 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center py-8 my-auto">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">
                          Off / Tidak Ada Shift
                        </span>
                      </div>
                    ) : (
                      <>
                        {hasPagiForCashier && pagiSched && (
                          <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border-2 border-amber-300 dark:border-amber-800 space-y-1.5">
                            <div className="flex items-center justify-between gap-1 text-[10px] font-black text-amber-900 dark:text-amber-300">
                              <div className="flex items-center gap-1 whitespace-nowrap min-w-0">
                                <span>☀️</span>
                                <span>Pagi</span>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 whitespace-nowrap ${
                                  pagiSched.isOverride
                                    ? "bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300"
                                }`}
                              >
                                {pagiSched.isOverride ? "Override" : "Tetap"}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                                {pagiSched.userName}
                              </div>
                              {pagiSched.notes && (
                                <p className="text-[9px] text-amber-800 dark:text-amber-300 truncate">
                                  {pagiSched.notes}
                                </p>
                              )}
                              <div className="flex items-center gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuickSwap(pagiSched)}
                                  title="Tukar Shift Hari Ini"
                                  className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-900 rounded text-[9px] font-black hover:bg-slate-100 cursor-pointer"
                                >
                                  🔄 Tukar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(pagiSched)}
                                  title={
                                    pagiSched.isOverride ? "Edit Pengecualian" : "Buat Pengecualian Tanggal"
                                  }
                                  className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-900 rounded text-[9px] font-black hover:bg-slate-100 cursor-pointer"
                                >
                                  ✏️ Edit
                                </button>
                                {pagiSched.isOverride && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSchedule(pagiSched);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    title="Hapus Override (Kembali ke Jadwal Tetap)"
                                    className="px-1.5 py-0.5 bg-rose-100 text-rose-700 border border-slate-900 rounded text-[9px] font-black hover:bg-rose-200 cursor-pointer"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {hasSoreForCashier && soreSched && (
                          <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/30 rounded-xl border-2 border-indigo-300 dark:border-indigo-800 space-y-1.5">
                            <div className="flex items-center justify-between gap-1 text-[10px] font-black text-indigo-900 dark:text-indigo-300">
                              <div className="flex items-center gap-1 whitespace-nowrap min-w-0">
                                <span>🌙</span>
                                <span>Sore</span>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 whitespace-nowrap ${
                                  soreSched.isOverride
                                    ? "bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300"
                                }`}
                              >
                                {soreSched.isOverride ? "Override" : "Tetap"}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <div className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                                {soreSched.userName}
                              </div>
                              {soreSched.notes && (
                                <p className="text-[9px] text-indigo-800 dark:text-indigo-300 truncate">
                                  {soreSched.notes}
                                </p>
                              )}
                              <div className="flex items-center gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenQuickSwap(soreSched)}
                                  title="Tukar Shift Hari Ini"
                                  className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-900 rounded text-[9px] font-black hover:bg-slate-100 cursor-pointer"
                                >
                                  🔄 Tukar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(soreSched)}
                                  title={
                                    soreSched.isOverride ? "Edit Pengecualian" : "Buat Pengecualian Tanggal"
                                  }
                                  className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-900 rounded text-[9px] font-black hover:bg-slate-100 cursor-pointer"
                                >
                                  ✏️ Edit
                                </button>
                                {soreSched.isOverride && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedSchedule(soreSched);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    title="Hapus Override (Kembali ke Jadwal Tetap)"
                                    className="px-1.5 py-0.5 bg-rose-100 text-rose-700 border border-slate-900 rounded text-[9px] font-black hover:bg-rose-200 cursor-pointer"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  ) : (
                    <>
                      {/* SHIFT PAGI CARD (Semua Kasir) */}
                      <div className="p-2.5 bg-amber-50/80 dark:bg-amber-950/30 rounded-xl border-2 border-amber-300 dark:border-amber-800 space-y-1.5">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-black text-amber-900 dark:text-amber-300">
                          <div className="flex items-center gap-1 whitespace-nowrap min-w-0">
                            <span>☀️</span>
                            <span>Pagi</span>
                          </div>
                          {pagiSched && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 whitespace-nowrap ${
                                pagiSched.isOverride
                                  ? "bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300"
                              }`}
                            >
                              {pagiSched.isOverride ? "Override" : "Tetap"}
                            </span>
                          )}
                        </div>

                        {pagiSched ? (
                          <div className="space-y-1">
                            <div className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                              {pagiSched.userName}
                            </div>
                            {pagiSched.notes && (
                              <p className="text-[9px] text-amber-800 dark:text-amber-300 truncate">
                                {pagiSched.notes}
                              </p>
                            )}
                            <div className="flex items-center gap-1 pt-1">
                              <button
                                type="button"
                                onClick={() => handleOpenQuickSwap(pagiSched)}
                                title="Tukar Shift Hari Ini"
                                className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-900 rounded text-[9px] font-black hover:bg-slate-100 cursor-pointer"
                              >
                                🔄 Tukar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(pagiSched)}
                                title={
                                  pagiSched.isOverride ? "Edit Pengecualian" : "Buat Pengecualian Tanggal"
                                }
                                className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-900 rounded text-[9px] font-black hover:bg-slate-100 cursor-pointer"
                              >
                                ✏️ Edit
                              </button>
                              {pagiSched.isOverride && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSchedule(pagiSched);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  title="Hapus Override (Kembali ke Jadwal Tetap)"
                                  className="px-1.5 py-0.5 bg-rose-100 text-rose-700 border border-slate-900 rounded text-[9px] font-black hover:bg-rose-200 cursor-pointer"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
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
                            className="w-full text-center py-1 bg-white/70 dark:bg-slate-900/70 rounded-lg border border-dashed border-amber-400 text-[10px] font-bold text-amber-900 dark:text-amber-300 hover:bg-amber-100 cursor-pointer transition-all"
                          >
                            + Assign Pagi
                          </button>
                        )}
                      </div>

                      {/* SHIFT SORE CARD (Semua Kasir) */}
                      <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/30 rounded-xl border-2 border-indigo-300 dark:border-indigo-800 space-y-1.5">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-black text-indigo-900 dark:text-indigo-300">
                          <div className="flex items-center gap-1 whitespace-nowrap min-w-0">
                            <span>🌙</span>
                            <span>Sore</span>
                          </div>
                          {soreSched && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border shrink-0 whitespace-nowrap ${
                                soreSched.isOverride
                                  ? "bg-rose-100 text-rose-800 border-rose-400 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300"
                              }`}
                            >
                              {soreSched.isOverride ? "Override" : "Tetap"}
                            </span>
                          )}
                        </div>

                        {soreSched ? (
                          <div className="space-y-1">
                            <div className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                              {soreSched.userName}
                            </div>
                            {soreSched.notes && (
                              <p className="text-[9px] text-indigo-800 dark:text-indigo-300 truncate">
                                {soreSched.notes}
                              </p>
                            )}
                            <div className="flex items-center gap-1 pt-1">
                              <button
                                type="button"
                                onClick={() => handleOpenQuickSwap(soreSched)}
                                title="Tukar Shift Hari Ini"
                                className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-900 rounded text-[9px] font-black hover:bg-slate-100 cursor-pointer"
                              >
                                🔄 Tukar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(soreSched)}
                                title={
                                  soreSched.isOverride ? "Edit Pengecualian" : "Buat Pengecualian Tanggal"
                                }
                                className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-900 rounded text-[9px] font-black hover:bg-slate-100 cursor-pointer"
                              >
                                ✏️ Edit
                              </button>
                              {soreSched.isOverride && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSchedule(soreSched);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  title="Hapus Override (Kembali ke Jadwal Tetap)"
                                  className="px-1.5 py-0.5 bg-rose-100 text-rose-700 border border-slate-900 rounded text-[9px] font-black hover:bg-rose-200 cursor-pointer"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
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
                            className="w-full text-center py-1 bg-white/70 dark:bg-slate-900/70 rounded-lg border border-dashed border-indigo-400 text-[10px] font-bold text-indigo-900 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer transition-all"
                          >
                            + Assign Sore
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Footer action */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px]">
                  <span className="font-mono text-slate-500">
                    {isFiltered
                      ? `${[hasPagiForCashier, hasSoreForCashier].filter(Boolean).length} Shift`
                      : `${[pagiSched, soreSched].filter(Boolean).length}/2 Shift`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAddForm((prev) => ({ ...prev, date: day.dateStr }));
                      setIsAddModalOpen(true);
                    }}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    + Override
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
                  <th className="p-3.5">Tipe Sumber</th>
                  <th className="p-3.5">Shift</th>
                  <th className="p-3.5">Jam Kerja</th>
                  <th className="p-3.5">Kasir Bertugas</th>
                  <th className="p-3.5">Catatan</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y border-slate-200 dark:divide-slate-800">
                {resolvedPeriodSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-bold">
                      Tidak ada jadwal yang ditemukan untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  resolvedPeriodSchedules.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 font-bold"
                    >
                      <td className="p-3.5 font-mono text-slate-900 dark:text-slate-100">
                        {s.date}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-md border font-black text-[10px] ${
                            s.isOverride
                              ? "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                              : "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800"
                          }`}
                        >
                          {s.isOverride ? "⚡ Pengecualian" : "📋 Jadwal Tetap"}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded-md border font-black text-[10px] ${
                            s.shiftType === "SHIFT_PAGI"
                              ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                              : "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800"
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
                            onClick={() => handleOpenEdit(s)}
                            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-900 dark:border-slate-100 rounded text-[11px] font-bold hover:bg-slate-100 cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                            title={
                              s.isOverride ? "Edit Pengecualian" : "Buat Pengecualian Tanggal"
                            }
                          >
                            ✏️ Edit
                          </button>
                          {s.isOverride && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSchedule(s);
                                setIsDeleteModalOpen(true);
                              }}
                              className="px-2 py-1 bg-rose-50 dark:bg-rose-950 border border-slate-900 dark:border-slate-100 text-rose-600 rounded text-[11px] font-bold hover:bg-rose-100 cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                              title="Hapus Override (Kembali ke Jadwal Tetap)"
                            >
                              🗑️
                            </button>
                          )}
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
      {/* 5. MODAL ATUR TEMPLATE JADWAL TETAP       */}
      {/* ========================================== */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            {/* Header */}
            <div className="px-6 py-4 bg-[#FFB800] text-slate-950 border-b-2 border-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚙️</span>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">
                    Atur Template Jadwal Tetap Kasir
                  </h3>
                  <p className="text-[11px] font-bold text-amber-950">
                    Pola jadwal mingguan permanen (Senin s.d. Minggu). Otomatis berlaku setiap minggu tanpa perlu input manual.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="w-7 h-7 rounded bg-black/15 hover:bg-black/25 text-slate-950 font-bold cursor-pointer transition-all"
              >
                ✕
              </button>
            </div>

            {/* Quick Helper Tools */}
            <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-amber-900 dark:text-amber-300">
                💡 Cepat Atur: Pilih kasir default untuk masing-masing shift di bawah:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (cashierUsers.length >= 2) {
                      DAY_NAMES_ORDER.forEach((day, idx) => {
                        const pagiUser = cashierUsers[idx % cashierUsers.length];
                        const soreUser = cashierUsers[(idx + 1) % cashierUsers.length];
                        updateTemplateShift(day.key, "pagi", pagiUser.uid);
                        updateTemplateShift(day.key, "sore", soreUser.uid);
                      });
                      toast.success("Rotasi otomatis berhasil diterapkan ke form template!");
                    } else if (cashierUsers.length === 1) {
                      DAY_NAMES_ORDER.forEach((day) => {
                        updateTemplateShift(day.key, "pagi", cashierUsers[0].uid);
                        updateTemplateShift(day.key, "sore", "");
                      });
                    }
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-900 rounded-lg text-[10px] font-black text-slate-900 dark:text-slate-100 hover:bg-slate-100 cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                >
                  ⚡ Auto-Rotate Kasir
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTemplateFormDays(DEFAULT_EMPTY_DAYS);
                  }}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-900 rounded-lg text-[10px] font-black text-rose-600 hover:bg-rose-50 cursor-pointer shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                >
                  Bersihkan Form
                </button>
              </div>
            </div>

            {/* Template Days List Form */}
            <form onSubmit={handleSaveTemplate} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
                {DAY_NAMES_ORDER.map((day) => {
                  const dayData = templateFormDays[day.key] || { pagi: null, sore: null };

                  return (
                    <div
                      key={day.key}
                      className="bg-slate-50 dark:bg-slate-800/80 rounded-xl border-2 border-slate-900 dark:border-slate-100 p-3 flex flex-col justify-between space-y-3 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]"
                    >
                      {/* Day Title */}
                      <div className="border-b border-slate-300 dark:border-slate-700 pb-1.5 flex justify-between items-center">
                        <span className="font-black text-xs text-slate-900 dark:text-slate-100">
                          {day.label}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                          {day.key.substring(0, 3)}
                        </span>
                      </div>

                      {/* Shift Pagi Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-amber-700 dark:text-amber-400 block uppercase">
                          ☀️ Shift Pagi:
                        </label>
                        <select
                          value={dayData.pagi?.userId || ""}
                          onChange={(e) => updateTemplateShift(day.key, "pagi", e.target.value)}
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-lg text-[11px] font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                        >
                          <option value="">-- Libur / Kosong --</option>
                          {cashierUsers.map((u) => (
                            <option key={u.uid} value={u.uid}>
                              {u.displayName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Shift Sore Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 block uppercase">
                          🌙 Shift Sore:
                        </label>
                        <select
                          value={dayData.sore?.userId || ""}
                          onChange={(e) => updateTemplateShift(day.key, "sore", e.target.value)}
                          className="w-full p-1.5 bg-white dark:bg-slate-900 border border-slate-400 dark:border-slate-600 rounded-lg text-[11px] font-bold text-slate-900 dark:text-slate-100 focus:outline-none"
                        >
                          <option value="">-- Libur / Kosong --</option>
                          {cashierUsers.map((u) => (
                            <option key={u.uid} value={u.uid}>
                              {u.displayName}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border-2 border-slate-900 dark:border-slate-100 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-xs cursor-pointer hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingTemplate}
                  className="px-6 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs border-2 border-slate-900 dark:border-slate-100 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer flex items-center gap-2"
                >
                  {isSavingTemplate ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>💾 Simpan & Terapkan Template Tetap</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 6. MODAL TAMBAH PENGECEUALIAN (OVERRIDE)   */}
      {/* ========================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#6366F1] text-white border-b-2 border-slate-900 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase">Tambah Pengecualian Jadwal</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded bg-white/20 text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOverride} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-black uppercase tracking-wider block mb-1">
                  Tanggal Shift:
                </label>
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
                      {st === "SHIFT_PAGI"
                        ? "☀️ Pagi"
                        : "🌙 Sore"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-black uppercase tracking-wider block mb-1">
                  Kasir Pengganti / Ditugaskan:
                </label>
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
                <label className="font-black uppercase tracking-wider block mb-1">
                  Catatan / Alasan Pengecualian:
                </label>
                <input
                  type="text"
                  value={addForm.notes || ""}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Contoh: Menggantikan kasir izin / event promo"
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
                  Simpan Pengecualian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 7. MODAL EDIT JADWAL / BUAT OVERRIDE       */}
      {/* ========================================== */}
      {isEditModalOpen && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-amber-500 text-slate-950 border-b-2 border-slate-900 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase">
                {selectedSchedule.isOverride ? "Edit Pengecualian Jadwal" : "Buat Pengecualian Tanggal"}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="w-7 h-7 rounded bg-black/20 text-slate-950 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSchedule} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                {!selectedSchedule.isOverride ? (
                  <span>
                    ℹ️ Jadwal ini saat ini berasal dari <strong>Template Tetap</strong>. Menyimpan perubahan di sini akan membuat dokumen <strong>Pengecualian Khusus (Override)</strong> untuk tanggal ini saja.
                  </span>
                ) : (
                  <span>
                    ℹ️ Memperbarui dokumen pengecualian tanggal <strong className="font-mono">{selectedSchedule.date}</strong>.
                  </span>
                )}
              </div>

              <div>
                <label className="font-black uppercase tracking-wider block mb-1">
                  Tanggal Shift:
                </label>
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
                      {st === "SHIFT_PAGI"
                        ? "☀️ Pagi"
                        : "🌙 Sore"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-black uppercase tracking-wider block mb-1">
                  Kasir Ditugaskan:
                </label>
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
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 8. MODAL TUKAR SHIFT (OTORISASI ADMIN)     */}
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
                ℹ️ Saat pertukaran disetujui, sistem otomatis memperbarui / mencatat dokumen pengecualian tanggal sehingga hak login kasir di mesin POS langsung aktif sesuai hasil pertukaran.
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
                  {resolvedPeriodSchedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} • {s.shiftType === "SHIFT_PAGI" ? "Pagi" : "Sore"} • Kasir:{" "}
                      {s.userName} ({s.isOverride ? "Override" : "Template"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Opsi Tukar: Dengan Jadwal Lain ATAU Reassign Kasir */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="font-black uppercase tracking-wider block text-slate-800 dark:text-slate-200 text-[10px]">
                  PILIHAN METODE PENUKARAN:
                </span>

                {/* Opsi 1: Saling Tukar Jadwal */}
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">
                    Opsi A: Saling Tukar dengan Jadwal Kasir Lain:
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
                    {resolvedPeriodSchedules
                      .filter((s) => s.id !== swapSchedule1Id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.date} • {s.shiftType === "SHIFT_PAGI" ? "Pagi" : "Sore"} • Kasir:{" "}
                          {s.userName}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="text-center text-slate-400 font-mono text-[10px]">— ATAU —</div>

                {/* Opsi 2: Alihkan ke Kasir Pengganti */}
                <div>
                  <label className="font-bold block mb-1 text-slate-600 dark:text-slate-400">
                    Opsi B: Alihkan Langsung ke Kasir Pengganti:
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
      {/* 9. MODAL DELETE / REVERT OVERRIDE          */}
      {/* ========================================== */}
      {isDeleteModalOpen && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-900 dark:border-slate-100 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-rose-100 dark:bg-rose-950 border-2 border-slate-900 text-rose-600 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              🗑️
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                Hapus Pengecualian Tanggal?
              </h3>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">
                Pengecualian shift pada tanggal{" "}
                <strong className="text-slate-900 dark:text-slate-100">
                  {selectedSchedule.date}
                </strong>{" "}
                akan dihapus. Sistem akan otomatis mengembalikan penugasan shift hari tersebut ke{" "}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  Template Jadwal Tetap
                </strong>
                .
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
                onClick={handleDeleteOverride}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-black text-xs border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] cursor-pointer"
              >
                Ya, Hapus Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
