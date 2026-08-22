import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { CreateExpensePayload, OperatingExpense } from '@/types/expense.types';

// Helper parse Date
function parseFirestoreDate(rawDate: any): Date {
  if (!rawDate) return new Date();
  if (typeof rawDate.toDate === 'function') return rawDate.toDate();
  if (typeof rawDate === 'object') {
    if (rawDate.seconds !== undefined) return new Date(rawDate.seconds * 1000);
    if (rawDate._seconds !== undefined) return new Date(rawDate._seconds * 1000);
  }
  const d = new Date(rawDate);
  return isNaN(d.getTime()) ? new Date() : d;
}

// GET /api/expenses -> Fetch list of operating expenses with period & category filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'all';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase();

    const snapshot = await adminDb
      .collection('operating_expenses')
      .orderBy('date', 'desc')
      .get();

    let expenses: OperatingExpense[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const parsedDate = parseFirestoreDate(data.date || data.createdAt);
      return {
        id: doc.id,
        name: data.name || 'Biaya Operasional',
        category: data.category || 'Operasional Toko',
        amount: Number(data.amount || 0),
        date: parsedDate.toISOString().slice(0, 10),
        notes: data.notes || '',
        createdBy: data.createdBy || 'Admin',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      };
    });

    // Date filtering
    const now = new Date();
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (period === 'today') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === '7days') {
      filterStart = new Date();
      filterStart.setDate(now.getDate() - 6);
      filterStart.setHours(0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === '30days') {
      filterStart = new Date();
      filterStart.setDate(now.getDate() - 29);
      filterStart.setHours(0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'thisMonth') {
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      filterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'custom' && startDateParam) {
      filterStart = new Date(startDateParam);
      filterStart.setHours(0, 0, 0, 0);
      if (endDateParam) {
        filterEnd = new Date(endDateParam);
        filterEnd.setHours(23, 59, 59, 999);
      }
    }

    if (filterStart || filterEnd) {
      expenses = expenses.filter((e) => {
        const d = new Date(e.date);
        if (filterStart && d < filterStart) return false;
        if (filterEnd && d > filterEnd) return false;
        return true;
      });
    }

    if (category && category !== 'ALL') {
      expenses = expenses.filter((e) => e.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      expenses = expenses.filter(
        (e) =>
          e.name.toLowerCase().includes(search) ||
          e.category.toLowerCase().includes(search) ||
          (e.notes && e.notes.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ success: true, data: expenses }, { status: 200 });
  } catch (error: any) {
    console.error('[API /api/expenses GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mengambil data biaya operasional' },
      { status: 500 }
    );
  }
}

// POST /api/expenses -> Record a new operating expense
export async function POST(req: NextRequest) {
  try {
    const body: CreateExpensePayload = await req.json();

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Nama biaya operasional wajib diisi' },
        { status: 400 }
      );
    }

    if (body.amount === undefined || body.amount === null || Number(body.amount) <= 0) {
      return NextResponse.json(
        { success: false, message: 'Nominal biaya operasional harus lebih dari Rp 0' },
        { status: 400 }
      );
    }

    if (!body.category || body.category.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Kategori biaya operasional wajib dipilih' },
        { status: 400 }
      );
    }

    const expenseDate = body.date ? new Date(body.date) : new Date();
    const now = new Date();

    const newExpense = {
      name: body.name.trim(),
      category: body.category.trim(),
      amount: Number(body.amount),
      date: expenseDate.toISOString().slice(0, 10),
      notes: body.notes?.trim() || '',
      createdBy: body.createdBy || 'Admin',
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await adminDb.collection('operating_expenses').add(newExpense);

    return NextResponse.json(
      {
        success: true,
        message: 'Biaya operasional berhasil dicatat',
        data: { id: docRef.id, ...newExpense },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API /api/expenses POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal mencatat biaya operasional' },
      { status: 500 }
    );
  }
}
