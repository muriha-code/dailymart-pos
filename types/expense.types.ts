export type ExpenseCategory =
  | 'Gaji Karyawan'
  | 'Listrik & Air'
  | 'WiFi & Internet'
  | 'Sewa Toko'
  | 'Keamanan'
  | 'Kebersihan'
  | 'Operasional Toko'
  | 'Lainnya';

export interface OperatingExpense {
  id?: string;
  name: string;
  category: ExpenseCategory | string;
  amount: number;
  date: string | Date; // ISO date string (YYYY-MM-DD) or Date
  notes?: string;
  createdBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateExpensePayload {
  name: string;
  category: ExpenseCategory | string;
  amount: number;
  date: string;
  notes?: string;
  createdBy?: string;
}

export interface GetExpensesParams {
  period?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  search?: string;
}

export interface ExpenseApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}
