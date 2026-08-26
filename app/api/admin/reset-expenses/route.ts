import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

const BATCH_SIZE_LIMIT = 400;

/**
 * Delete all documents in a specified Firestore collection using batch chunks.
 */
async function deleteAllDocsInCollection(collectionName: string): Promise<number> {
  const snapshot = await adminDb.collection(collectionName).get();
  if (snapshot.empty) return 0;

  let deletedCount = 0;
  let batch = adminDb.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    deletedCount++;

    if (count >= BATCH_SIZE_LIMIT) {
      await batch.commit();
      batch = adminDb.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  return deletedCount;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Delete all old bloated/dummy expense documents from collections
    const deletedOpExp = await deleteAllDocsInCollection('operating_expenses');
    const deletedExp = await deleteAllDocsInCollection('expenses');
    const deletedCashFlow = await deleteAllDocsInCollection('cashflow');

    const totalDeletedDocs = deletedOpExp + deletedExp + deletedCashFlow;

    // 2. Seed 6 realistic, healthy operational expenses (Total: Rp 900,000 over 3 months)
    const now = new Date();
    
    const seedExpenses = [
      {
        name: 'Tagihan Listrik PLN Toko (Bulan 1)',
        category: 'Listrik & Air',
        amount: 220000,
        daysAgo: 60,
        notes: 'Tagihan listrik rutin bulan pertama',
      },
      {
        name: 'WiFi & Internet Minimarket 100Mbps (Bulan 1)',
        category: 'WiFi & Internet',
        amount: 100000,
        daysAgo: 50,
        notes: 'Langganan internet kasir & toko bulan pertama',
      },
      {
        name: 'Tagihan Listrik PLN Toko (Bulan 2)',
        category: 'Listrik & Air',
        amount: 240000,
        daysAgo: 30,
        notes: 'Tagihan listrik rutin bulan kedua',
      },
      {
        name: 'WiFi & Internet Minimarket 100Mbps (Bulan 2)',
        category: 'WiFi & Internet',
        amount: 100000,
        daysAgo: 20,
        notes: 'Langganan internet kasir & toko bulan kedua',
      },
      {
        name: 'Tagihan Listrik PLN Toko (Bulan 3)',
        category: 'Listrik & Air',
        amount: 160000,
        daysAgo: 10,
        notes: 'Tagihan listrik rutin bulan ketiga',
      },
      {
        name: 'Perlengkapan Toko & Plastik POS (Bulan 3)',
        category: 'Operasional Toko',
        amount: 80000,
        daysAgo: 3,
        notes: 'Kantong plastik, strolley, & kertas kasir thermal',
      },
    ];

    const batch = adminDb.batch();
    let totalSeededOpex = 0;

    for (const exp of seedExpenses) {
      const expDate = new Date(now.getTime() - exp.daysAgo * 24 * 60 * 60 * 1000);
      const dateIsoStr = expDate.toISOString().slice(0, 10);
      const firestoreTimestamp = Timestamp.fromDate(expDate);

      totalSeededOpex += exp.amount;

      const expensePayload = {
        name: exp.name,
        category: exp.category,
        amount: exp.amount,
        date: dateIsoStr,
        notes: exp.notes,
        createdBy: 'Admin Utama',
        createdAt: firestoreTimestamp,
        updatedAt: firestoreTimestamp,
      };

      const opExpRef = adminDb.collection('operating_expenses').doc();
      const expRef = adminDb.collection('expenses').doc(opExpRef.id);
      const cashFlowRef = adminDb.collection('cashflow').doc(opExpRef.id);

      batch.set(opExpRef, expensePayload);
      batch.set(expRef, expensePayload);
      batch.set(cashFlowRef, expensePayload);
    }

    await batch.commit();

    return NextResponse.json(
      {
        success: true,
        message: 'Berhasil mereset dan mengisi ulang data biaya operasional toko yang sehat!',
        summary: {
          deletedDocuments: totalDeletedDocs,
          seededExpensesCount: seedExpenses.length,
          totalSeededOpex,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API /api/admin/reset-expenses POST Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || 'Gagal mereset data biaya operasional.',
      },
      { status: 500 }
    );
  }
}
