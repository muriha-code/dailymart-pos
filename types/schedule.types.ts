export type ShiftType = 'SHIFT_PAGI' | 'SHIFT_SORE';

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface ShiftAssignment {
  userId: string;
  userName: string;
  userEmail?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface DayScheduleTemplate {
  pagi: ShiftAssignment | null;
  sore: ShiftAssignment | null;
}

export interface ScheduleTemplate {
  id?: string;
  days: Record<DayOfWeek, DayScheduleTemplate>;
  updatedBy?: string;
  updatedByName?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Schedule {
  id: string;
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  startTime: string; // e.g. "07:00"
  endTime: string; // e.g. "15:00"
  userId: string;
  userName: string;
  userEmail?: string;
  notes?: string;
  isOverride?: boolean;
  source?: 'TEMPLATE' | 'OVERRIDE';
  updatedBy?: string;
  updatedByName?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateSchedulePayload {
  date: string;
  shiftType: ShiftType;
  startTime?: string;
  endTime?: string;
  userId: string;
  userName: string;
  userEmail?: string;
  notes?: string;
}

export interface UpdateSchedulePayload {
  date?: string;
  shiftType?: ShiftType;
  startTime?: string;
  endTime?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  notes?: string;
}

export interface SwapShiftPayload {
  scheduleId1: string;
  scheduleId2?: string; // If swapping with an existing schedule
  targetUserId: string;
  targetUserName: string;
  targetUserEmail?: string;
}

export interface ScheduleApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

