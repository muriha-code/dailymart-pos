import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { NetworkSettings } from '@/types/network.types';

const DEFAULT_NETWORK_SETTINGS: NetworkSettings = {
  ipProtectionEnabled: false,
  allowedIPs: [],
  updatedAt: new Date().toISOString(),
  updatedBy: 'System',
};

export async function GET() {
  try {
    const docRef = adminDb.collection('system_settings').doc('network');
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_NETWORK_SETTINGS,
      });
    }

    const rawData = doc.data();
    const data: NetworkSettings = {
      ipProtectionEnabled: rawData?.ipProtectionEnabled ?? false,
      allowedIPs: Array.isArray(rawData?.allowedIPs) ? rawData.allowedIPs : [],
      updatedAt: rawData?.updatedAt?.toDate
        ? rawData.updatedAt.toDate().toISOString()
        : rawData?.updatedAt || new Date().toISOString(),
      updatedBy: rawData?.updatedBy || 'Super Admin',
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[API /api/admin/settings/network GET Error]:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal mengambil konfigurasi jaringan.',
        data: DEFAULT_NETWORK_SETTINGS,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const ipProtectionEnabled = Boolean(body.ipProtectionEnabled);
    const allowedIPs = Array.isArray(body.allowedIPs)
      ? Array.from(new Set(body.allowedIPs.map((ip: string) => String(ip).trim()).filter(Boolean)))
      : [];
    const updatedBy = body.updatedBy ? String(body.updatedBy) : 'Super Admin';

    const payload = {
      ipProtectionEnabled,
      allowedIPs,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    await adminDb.collection('system_settings').doc('network').set(payload, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan jaringan berhasil diperbarui.',
      data: payload,
    });
  } catch (error: any) {
    console.error('[API /api/admin/settings/network POST Error]:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal menyimpan pengaturan jaringan.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  return POST(req);
}
