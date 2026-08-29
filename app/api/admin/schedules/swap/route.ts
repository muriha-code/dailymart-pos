import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

// Helper to authenticate Admin
async function getAdminUser(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const role = (userDoc.data()?.role || decoded.role || '').toUpperCase();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      return {
        uid: decoded.uid,
        name: userDoc.data()?.displayName || decoded.name || 'Admin',
        role,
      };
    }
  } catch (err) {
    console.warn('[Admin Swap Schedules Auth Warning]:', err);
  }
  return null;
}

// POST /api/admin/schedules/swap
export async function POST(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    const body = await req.json();

    const { scheduleId1, scheduleId2, targetUserId, targetUserName, targetUserEmail } = body;

    if (!scheduleId1) {
      return NextResponse.json(
        { success: false, message: 'ID Jadwal utama (scheduleId1) wajib ada.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const adminUpdater = {
      updatedBy: adminUser?.uid || 'system_admin',
      updatedByName: adminUser?.name || 'Administrator',
      updatedAt: now,
    };

    // Skenario A: Pertukaran 2 Dokumen Jadwal Antara 2 Kasir (Mutual Shift Swap)
    if (scheduleId2) {
      await adminDb.runTransaction(async (transaction) => {
        const docRef1 = adminDb.collection('schedules').doc(scheduleId1);
        const docRef2 = adminDb.collection('schedules').doc(scheduleId2);

        const snap1 = await transaction.get(docRef1);
        const snap2 = await transaction.get(docRef2);

        if (!snap1.exists || !snap2.exists) {
          throw new Error('Salah satu dokumen jadwal tidak ditemukan.');
        }

        const data1 = snap1.data()!;
        const data2 = snap2.data()!;

        // Swap assigned users
        transaction.update(docRef1, {
          userId: data2.userId,
          userName: data2.userName,
          userEmail: data2.userEmail || '',
          ...adminUpdater,
        });

        transaction.update(docRef2, {
          userId: data1.userId,
          userName: data1.userName,
          userEmail: data1.userEmail || '',
          ...adminUpdater,
        });
      });

      return NextResponse.json({
        success: true,
        message: 'Jadwal shift berhasil ditukar antara kedua kasir secara atomik.',
      });
    }

    // Skenario B: Penggantian Kasir pada Satu Jadwal (Reassign Shift to target user)
    if (!targetUserId || !targetUserName) {
      return NextResponse.json(
        { success: false, message: 'Data kasir pengganti wajib diisi.' },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection('schedules').doc(scheduleId1);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: false, message: 'Dokumen jadwal tidak ditemukan.' },
        { status: 404 }
      );
    }

    await docRef.update({
      userId: targetUserId,
      userName: targetUserName,
      userEmail: targetUserEmail || '',
      ...adminUpdater,
    });

    return NextResponse.json({
      success: true,
      message: `Jadwal berhasil dialihkan ke ${targetUserName}.`,
    });
  } catch (error: any) {
    console.error('[API /api/admin/schedules/swap Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal melakukan pertukaran shift.' },
      { status: 500 }
    );
  }
}
