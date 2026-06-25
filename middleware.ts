import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'ishida-ordering-app-super-secret-key-12345';
const key = new TextEncoder().encode(secretKey);

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Public paths
    if (path.startsWith('/login') || path.startsWith('/api/auth') || path.startsWith('/_next') || path === '/favicon.ico') {
        return NextResponse.next();
    }

    const session = request.cookies.get('session')?.value;

    if (!session) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        const { payload } = await jwtVerify(session, key, {
            algorithms: ['HS256'],
        });

        // Check admin routes (excluding upload page and upload API for store users)
        const isUploadRoute = path === '/receipts/upload' || path === '/api/receipts/upload';
        const isAdminRoute = (path.startsWith('/admin') || path.startsWith('/receipts') || path.startsWith('/api/receipts')) && !isUploadRoute;

        if (isAdminRoute && payload.role !== 'admin') {
            // Force redirect non-admins back to the store ordering dashboard
            return NextResponse.redirect(new URL('/', request.url));
        }

        return NextResponse.next();
    } catch (error) {
        // Invalid token
        request.cookies.delete('session');
        return NextResponse.redirect(new URL('/login', request.url));
    }
}

export const config = {
    // Only bypass static assets and auth APIs; intercept all /api/receipts calls
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
