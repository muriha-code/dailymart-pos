import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { Transaction } from '@/types/transaction.types';
import { CashierSummary } from '@/types/cashierHistory.types';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  try {
    // 1. Ekstrak dan Verifikasi Session Cookie Pengguna
    const sessionCookie = req.cookies.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada sesi autentikasi aktif' },
        { status: 401 }
      );
    }

    let decodedClaims;
    try {
      decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (authErr) {
      return NextResponse.json(
        { success: false, message: 'Sesi tidak valid atau telah kedaluwarsa' },
        { status: 401 }
      );
    }

    const uid = decodedClaims.uid;
    const email = decodedClaims.email || '';

    // 2. Fetch Data Role Pengguna dari Firestore `users/{uid}`
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const userRole = userData?.role || 'CASHIER';
    const displayName = userData?.displayName || decodedClaims.name || email.split('@')[0] || 'Kasir';

    // 3. Tangkap Query Parameters
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date'); // Format: YYYY-MM-DD
    const methodParam = searchParams.get('method')?.toUpperCase();
    const searchParam = searchParams.get('search')?.toLowerCase().trim();
    const filterCashierId = searchParams.get('cashierId'); // Filter untuk Admin

    // 4. Rentang Waktu (Default: Hari Ini 00:00:00 - 23:59:59)
    let targetDate: Date;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const [year, month, day] = dateParam.split('-').map(Number);
      targetDate = new Date(year, month - 1, day);
    } else {
      targetDate = new Date();
    }

    const startOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );
    const endOfDay = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999
    );

    // 5. Query Firestore Collection `transactions`
    let query: FirebaseFirestore.Query<DocumentData> = adminDb.collection('transactions');

    // Enforce Isolation Rule berdasarkan Role:
    if (userRole === 'CASHIER') {
      // Role CASHIER WAJIB menyaring transaksi milik cashierId bersangkutan
      query = query.where('cashierId', '==', uid);
    } else if (userRole === 'ADMIN') {
      // Role ADMIN dapat memfilter kasir tertentu jika parameter `cashierId` ada & bukan 'ALL'
      if (filterCashierId && filterCashierId !== 'ALL') {
        query = query.where('cashierId', '==', filterCashierId);
      }
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    // Map & parse data dokumen transaksi
    let rawTransactions: Transaction[] = [];
    if (!snapshot.empty) {
      rawTransactions = snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => {
        const data = doc.data();
        let createdAtDate: Date;
        if (data.createdAt?.toDate) {
          createdAtDate = data.createdAt.toDate();
        } else if (typeof data.createdAt === 'string') {
          createdAtDate = new Date(data.createdAt);
        } else {
          createdAtDate = new Date();
        }

        return {
          id: doc.id,
          ...data,
          createdAt: createdAtDate.toISOString(),
        } as Transaction;
      });
    }

    // Filter Rentang Waktu Tanggal
    let filteredTransactions = rawTransactions.filter((trx) => {
      const trxDate = new Date(trx.createdAt);
      return trxDate >= startOfDay && trxDate <= endOfDay;
    });

    // Filter Metode Pembayaran jika dispesifikasikan (selain ALL)
    if (methodParam && methodParam !== 'ALL') {
      filteredTransactions = filteredTransactions.filter(
        (trx) => trx.paymentMethod === methodParam
      );
    }

    // Filter Kata Kunci Pencarian (Search: No. Invoice, Kasir, atau Item Produk)
    if (searchParam) {
      filteredTransactions = filteredTransactions.filter((trx) => {
        const matchInvoice = trx.transactionNumber?.toLowerCase().includes(searchParam);
        const matchCashierId = trx.cashierId?.toLowerCase().includes(searchParam);
        const matchCashierName = trx.cashierName?.toLowerCase().includes(searchParam);
        const matchItems = trx.items?.some((item) =>
          item.productName?.toLowerCase().includes(searchParam)
        );
        return matchInvoice || matchCashierId || matchCashierName || matchItems;
      });
    }

    // 6. Agregasi KPI Summary Metrics
    let totalRevenue = 0;
    let cashTotal = 0;
    let nonCashTotal = 0;

    filteredTransactions.forEach((trx) => {
      const total = Number(trx.total || 0);
      totalRevenue += total;

      if (trx.paymentMethod === 'CASH') {
        cashTotal += total;
      } else {
        nonCashTotal += total;
      }
    });

    const totalTransactions = filteredTransactions.length;
    const averageBasketSize =
      totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    const summary: CashierSummary = {
      totalTransactions,
      totalRevenue,
      averageBasketSize,
      cashTotal,
      nonCashTotal,
    };

    // 7. Jika role ADMIN, sertakan daftar kasir unik untuk opsi dropdown filter
    let cashierList: { uid: string; displayName: string; email?: string }[] = [];
    if (userRole === 'ADMIN') {
      try {
        const usersSnapshot = await adminDb
          .collection('users')
          .where('role', '==', 'CASHIER')
          .get();

        cashierList = usersSnapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            uid: doc.id,
            displayName: d.displayName || d.email?.split('@')[0] || doc.id,
            email: d.email || '',
          };
        });
      } catch (usersErr) {
        console.warn('[API /api/cashier/history] Gagal memuat daftar kasir untuk admin:', usersErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          summary,
          transactions: filteredTransactions,
          cashierInfo: {
            uid,
            displayName,
            email,
            role: userRole,
          },
          cashierList,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API /api/cashier/history GET Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Gagal mengambil riwayat transaksi kasir.',
      },
      { status: 500 }
    );
  }
}
