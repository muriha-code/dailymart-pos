import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    let clientIp = '';

    const forwardedFor = req.headers.get('x-forwarded-for');
    if (forwardedFor) {
      clientIp = forwardedFor.split(',')[0].trim();
    } else {
      const realIp = req.headers.get('x-real-ip');
      const cfIp = req.headers.get('cf-connecting-ip');
      if (realIp) {
        clientIp = realIp.trim();
      } else if (cfIp) {
        clientIp = cfIp.trim();
      } else if ((req as any).ip) {
        clientIp = (req as any).ip;
      }
    }

    // Jika mendeteksi localhost/IPv6 loopback pada server lokal, dapatkan IP publik asli dari provider
    if (!clientIp || clientIp === '::1' || clientIp === '127.0.0.1' || clientIp === '::ffff:127.0.0.1') {
      try {
        const publicIpRes = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
        if (publicIpRes.ok) {
          const data = await publicIpRes.json();
          if (data.ip) {
            clientIp = data.ip;
          }
        }
      } catch {
        clientIp = '127.0.0.1';
      }
    }

    return NextResponse.json({
      success: true,
      ip: clientIp,
    });
  } catch (error: any) {
    console.error('[API /api/network/my-ip Error]:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mendeteksi IP client.', ip: '127.0.0.1' },
      { status: 500 }
    );
  }
}
