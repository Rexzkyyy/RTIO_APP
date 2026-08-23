import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  // Check if trying to access admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // If no valid session or not an admin, redirect to login
    if (!token || token.isAdmin !== true) {
      const loginUrl = new URL('/login?error=unauthorized', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If going to login page but already authenticated as admin, redirect to admin
  if (request.nextUrl.pathname === '/login') {
    if (token && token.isAdmin === true) {
      const adminUrl = new URL('/admin/events', request.url);
      return NextResponse.redirect(adminUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login'],
};
