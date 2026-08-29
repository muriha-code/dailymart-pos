import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { DayOfWeek, DayScheduleTemplate, ScheduleTemplate } from '@/types/schedule.types';

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
    console.warn('[Admin Schedule Template Auth Warning]:', err);
  }
  return null;
}

const DEFAULT_EMPTY_DAYS: Record<DayOfWeek, DayScheduleTemplate> = {
  monday: { pagi: null, sore: null },
  tuesday: { pagi: null, sore: null },
  wednesday: { pagi: null, sore: null },
  thursday: { pagi: null, sore: null },
  friday: { pagi: null, sore: null },
  saturday: { pagi: null, sore: null },
  sunday: { pagi: null, sore: null },
};

// GET /api/admin/schedules/template
export async function GET(req: NextRequest) {
  try {
    const templateDoc = await adminDb.collection('schedule_templates').doc('default').get();

    if (!templateDoc.exists) {
      return NextResponse.json({
        success: true,
        data: {
          id: 'default',
          days: DEFAULT_EMPTY_DAYS,
        } as ScheduleTemplate,
      });
    }

    const data = templateDoc.data();
    const template: ScheduleTemplate = {
      id: templateDoc.id,
      days: {
        ...DEFAULT_EMPTY_DAYS,
        ...(data?.days || {}),
      },
      updatedBy: data?.updatedBy,
      updatedByName: data?.updatedByName,
      createdAt: data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data?.createdAt,
      updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data?.updatedAt,
    };

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('[API /api/admin/schedules/template GET Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal memuat template jadwal tetap.' },
      { status: 500 }
    );
  }
}

// POST or PUT /api/admin/schedules/template
export async function POST(req: NextRequest) {
  try {
    const adminUser = await getAdminUser(req);
    const body = await req.json();
    const days = body.days;

    if (!days || typeof days !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Format data template hari tidak valid.' },
        { status: 400 }
      );
    }

    const templateRef = adminDb.collection('schedule_templates').doc('default');
    const existingSnap = await templateRef.get();
    const now = new Date();

    const templatePayload = {
      days,
      updatedBy: adminUser?.uid || 'system_admin',
      updatedByName: adminUser?.name || 'Administrator',
      updatedAt: now,
      createdAt: existingSnap.exists ? existingSnap.data()?.createdAt || now : now,
    };

    await templateRef.set(templatePayload, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Template jadwal tetap kasir berhasil diperbarui.',
      data: {
        id: 'default',
        ...templatePayload,
        createdAt: templatePayload.createdAt.toISOString ? templatePayload.createdAt.toISOString() : templatePayload.createdAt,
        updatedAt: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API /api/admin/schedules/template POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Gagal menyimpan template jadwal tetap.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}
