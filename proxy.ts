import { NextRequest, NextResponse } from 'next/server';

// Home base default route per user role
const ROLE_HOME_MAP: Record<string, string> = {
  SUPER_ADMIN: '/admin/users',
  ADMIN: '/admin/dashboard',
  CASHIER: '/cashier/transactions',
  WAREHOUSE: '/warehouse/stock-in',
  super_admin: '/admin/users',
  admin: '/admin/dashboard',
  cashier: '/cashier/transactions',
  warehouse: '/warehouse/stock-in',
};

/**
 * Extract client IP address from incoming NextRequest headers
 */
function getClientIp(req: NextRequest): string {
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip')?.trim() ||
    '127.0.0.1';
  return clientIp;
}

/**
 * Fetch Network Protection Settings from Firestore system_settings/network
 */
async function fetchNetworkSettings(): Promise<{ ipProtectionEnabled: boolean; allowedIPs: string[] }> {
  try {
    const { adminDb } = await import('@/lib/firebase/admin');
    const doc = await adminDb.collection('system_settings').doc('network').get();
    if (doc.exists) {
      const data = doc.data();
      return {
        ipProtectionEnabled: Boolean(data?.ipProtectionEnabled),
        allowedIPs: Array.isArray(data?.allowedIPs) ? data.allowedIPs : [],
      };
    }
  } catch (err) {
    console.warn('[proxy] Firestore network settings lookup error:', err);
  }
  return { ipProtectionEnabled: false, allowedIPs: [] };
}

/**
 * Proxy Autentikasi Sesi, RBAC, & Proteksi Jaringan Wi-Fi (IP Whitelist)
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const sessionCookie = req.cookies.get('session')?.value;
  const rawUserRole = req.cookies.get('user_role')?.value || null;
  const normalizedRole = rawUserRole ? rawUserRole.toUpperCase() : null;

  const isAuthenticated = !!sessionCookie;

  // 1. Pengguna Tanpa Sesi (Unauthenticated)
  if (!isAuthenticated) {
    // Jika mencoba mengakses rute terproteksi -> Redirect ke /login
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/cashier') ||
      pathname.startsWith('/warehouse')
    ) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Akses publik / login
    return NextResponse.next();
  }

  // 2. Pengguna Terautentikasi (Authenticated)
  const homePath = (normalizedRole && ROLE_HOME_MAP[normalizedRole]) || '/cashier/transactions';

  // Jika sudah login tapi buka /login atau /
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.redirect(new URL(homePath, req.url));
  }

  // 3. RBAC Matrix Enforcement
  if (normalizedRole === 'SUPER_ADMIN') {
    // Super Admin diizinkan mengelola manajemen pengguna (/admin/users) & pengaturan jaringan (/admin/settings/network)
    const isAllowedSuperAdminPath =
      pathname === '/admin/users' ||
      pathname.startsWith('/admin/users/') ||
      pathname === '/admin/settings/network' ||
      pathname.startsWith('/admin/settings/network/');

    if (!isAllowedSuperAdminPath) {
      const redirectUrl = new URL('/admin/users', req.url);
      redirectUrl.searchParams.set('restricted', 'true');
      return NextResponse.redirect(redirectUrl);
    }
  } else if (normalizedRole === 'CASHIER') {
    if (pathname.startsWith('/admin') || pathname.startsWith('/warehouse')) {
      return NextResponse.redirect(new URL(ROLE_HOME_MAP.CASHIER, req.url));
    }
  } else if (normalizedRole === 'WAREHOUSE') {
    if (pathname.startsWith('/admin') || pathname.startsWith('/cashier')) {
      return NextResponse.redirect(new URL(ROLE_HOME_MAP.WAREHOUSE, req.url));
    }
  }

  // 4. Network IP Whitelist Enforcement
  // Role SUPER_ADMIN -> LOSE / BYPASS CHECK (Bebas dari IP mana saja)
  if (normalizedRole !== 'SUPER_ADMIN') {
    const { ipProtectionEnabled, allowedIPs } = await fetchNetworkSettings();

    if (ipProtectionEnabled) {
      const clientIp = getClientIp(req);
      const isDevelopment = process.env.NODE_ENV === 'development';
      const isLocalhost =
        clientIp === '127.0.0.1' ||
        clientIp === '::1' ||
        clientIp === 'localhost' ||
        clientIp === '::ffff:127.0.0.1';

      const isAllowed =
        isDevelopment ||
        isLocalhost ||
        allowedIPs.includes(clientIp) ||
        (clientIp === '::1' && allowedIPs.includes('127.0.0.1')) ||
        (clientIp === '127.0.0.1' && allowedIPs.includes('::1'));

      if (!isAllowed) {
        console.log(`[IP Guard] Detected Client IP: ${clientIp} | Allowed IPs:`, allowedIPs);
        const accessDeniedUrl = new URL('/access-denied', req.url);
        accessDeniedUrl.searchParams.set('reason', 'network_restricted');
        return NextResponse.redirect(accessDeniedUrl);
      }
    }
  }

  return NextResponse.next();
}

export async function middleware(req: NextRequest) {
  return proxy(req);
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/cashier/:path*',
    '/warehouse/:path*',
    '/login',
  ],
};