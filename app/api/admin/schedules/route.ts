import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { CreateSchedulePayload, UpdateSchedulePayload } from '@/types/schedule.types';

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
    console.warn('[Admin Schedules Auth Warning]:', err);
  }
  return null;
}

// GET /api/admin/schedules
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const userId = searchParams.get('userId');

    let query: FirebaseFirestore.Query = adminDb.collection('schedules');

    if (date) {
      query = query.where('date', '==', date);
    } else if (startDate && endDate) {
      query = query.where('date', '>=', startDate).where('date', '<=', endDate);
    }

    if (userId && userId !== 'ALL') {
      query = query.where('userId', '==', userId);
    }

    const snapshot = await query.orderBy('date', 'asc').get();

    const schedules = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
    });

    return NextResponse.json({ success: true, data: schedules });
  } catch (error: any) {
    console.error('[API /api/admin/schedules GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memuat daftar jadwal.' },
      { status: 500 }
    );
  }
}

// POST /api/admin/schedules
export async function POST(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    const body: CreateSchedulePayload = await req.json();

    const { date, shiftType, userId, userName, userEmail, notes } = body;

    if (!date || !shiftType || !userId || !userName) {
      return NextResponse.json(
        { success: false, message: 'Tanggal, Shift, dan Kasir wajib diisi.' },
        { status: 400 }
      );
    }

    // Default start & end time
    const startTime = body.startTime || (shiftType === 'SHIFT_PAGI' ? '07:00' : '15:00');
    const endTime = body.endTime || (shiftType === 'SHIFT_PAGI' ? '15:00' : '23:00');

    // Document ID convention: SCH_YYYYMMDD_[SHIFT]_[USERID]
    const cleanDate = date.replace(/-/g, '');
    const docId = `SCH_${cleanDate}_${shiftType}_${userId.substring(0, 6)}`;

    const scheduleRef = adminDb.collection('schedules').doc(docId);
    const now = new Date();

    const newScheduleData = {
      date,
      shiftType,
      startTime,
      endTime,
      userId,
      userName,
      userEmail: userEmail || '',
      notes: notes || '',
      updatedBy: adminUser?.uid || 'system_admin',
      updatedByName: adminUser?.name || 'Administrator',
      createdAt: now,
      updatedAt: now,
    };

    await scheduleRef.set(newScheduleData);

    return NextResponse.json(
      {
        success: true,
        message: 'Jadwal kerja kasir berhasil ditambahkan.',
        data: { id: docId, ...newScheduleData },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API /api/admin/schedules POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menyimpan jadwal.' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/schedules
export async function PUT(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        { success: false, message: 'ID Jadwal diperlukan.' },
        { status: 400 }
      );
    }

    const body: UpdateSchedulePayload = await req.json();
    const scheduleRef = adminDb.collection('schedules').doc(scheduleId);
    const existingDoc = await scheduleRef.get();

    if (!existingDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Dokumen jadwal tidak ditemukan.' },
        { status: 404 }
      );
    }

    const now = new Date();
    const updateData: Record<string, any> = {
      ...body,
      updatedBy: adminUser?.uid || 'system_admin',
      updatedByName: adminUser?.name || 'Administrator',
      updatedAt: now,
    };

    // If shiftType changed, update default hours if not explicitly provided
    if (body.shiftType && !body.startTime && !body.endTime) {
      updateData.startTime = body.shiftType === 'SHIFT_PAGI' ? '07:00' : '15:00';
      updateData.endTime = body.shiftType === 'SHIFT_PAGI' ? '15:00' : '23:00';
    }

    await scheduleRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Jadwal kasir berhasil diperbarui.',
      data: { id: scheduleId, ...existingDoc.data(), ...updateData },
    });
  } catch (error: any) {
    console.error('[API /api/admin/schedules PUT Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memperbarui jadwal.' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/schedules
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        { success: false, message: 'ID Jadwal diperlukan.' },
        { status: 400 }
      );
    }

    await adminDb.collection('schedules').doc(scheduleId).delete();

    return NextResponse.json({
      success: true,
      message: 'Jadwal kerja berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('[API /api/admin/schedules DELETE Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menghapus jadwal.' },
      { status: 500 }
    );
  }
}
