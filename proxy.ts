import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@/types/auth.types';

// Home base default route per user role
const ROLE_HOME_MAP: Record<string, string> = {
    SUPER_ADMIN: '/admin/dashboard',
    ADMIN: '/admin/dashboard',
    CASHIER: '/cashier/transactions',
    WAREHOUSE: '/warehouse/stock-in',
    super_admin: '/admin/dashboard',
    admin: '/admin/dashboard',
    cashier: '/cashier/transactions',
    warehouse: '/warehouse/stock-in',
};

/**
 * Proxy Autentikasi Sesi & Proteksi Rute (Session-Only Auth)
 * Berjalan cepat secara in-memory dengan membaca cookie request.
 */
export function proxy(req: NextRequest) {
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
    if (normalizedRole === 'CASHIER') {
        if (pathname.startsWith('/admin') || pathname.startsWith('/warehouse')) {
            return NextResponse.redirect(new URL(ROLE_HOME_MAP.CASHIER, req.url));
        }
    } else if (normalizedRole === 'WAREHOUSE') {
        if (pathname.startsWith('/admin') || pathname.startsWith('/cashier')) {
            return NextResponse.redirect(new URL(ROLE_HOME_MAP.WAREHOUSE, req.url));
        }
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