import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from './types/auth.types';

// Home base default route per user role
const ROLE_HOME_MAP: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  CASHIER: '/cashier/transactions',
  WAREHOUSE: '/warehouse/stock-in',
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const sessionCookie = req.cookies.get('session')?.value;
  const userRole = (req.cookies.get('user_role')?.value as UserRole) || null;

  const isAuthenticated = !!sessionCookie;

  // 1. Unauthenticated Users
  if (!isAuthenticated) {
    // Jika mencoba mengakses rute terproteksi (/admin, /cashier, /warehouse) -> Redirect ke /login
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/cashier') ||
      pathname.startsWith('/warehouse')
    ) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Mengakses /login atau / -> Izinkan lanjut
    return NextResponse.next();
  }

  // 2. Authenticated Users
  // Tentukan home page default user berdasarkan role
  const homePath = (userRole && ROLE_HOME_MAP[userRole]) || '/cashier/transactions';

  // Jika user sudah login tapi membuka /login atau root '/' -> Redirect ke home base role
  if (pathname === '/login' || pathname === '/') {
    return NextResponse.redirect(new URL(homePath, req.url));
  }

  // 3. RBAC Matrix Enforcement
  if (userRole === 'CASHIER') {
    // Kasir dilarang mengakses /admin/* dan /warehouse/*
    if (pathname.startsWith('/admin') || pathname.startsWith('/warehouse')) {
      return NextResponse.redirect(new URL(ROLE_HOME_MAP.CASHIER, req.url));
    }
  } else if (userRole === 'WAREHOUSE') {
    // Staf Gudang dilarang mengakses /admin/* dan /cashier/*
    if (pathname.startsWith('/admin') || pathname.startsWith('/cashier')) {
      return NextResponse.redirect(new URL(ROLE_HOME_MAP.WAREHOUSE, req.url));
    }
  } else if (userRole === 'ADMIN') {
    // Admin memiliki akses penuh ke seluruh rute (/admin/*, /cashier/*, /warehouse/*)
    // Tidak ada batasan
  }

  return NextResponse.next();
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
