import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  // Check if trying to access admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Dev mode bypass
    const bypassCookie = process.env.NODE_ENV !== 'production' ? request.cookies.get('dev-admin-bypass')?.value : null;
    if (bypassCookie) {
      if (bypassCookie === 'VALIDATOR') {
        // If they go to restricted pages, redirect to /admin/transactions
        if (request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/events') || request.nextUrl.pathname.startsWith('/admin/users') || request.nextUrl.pathname.startsWith('/admin/tickets')) {
          return NextResponse.redirect(new URL('/admin/transactions', request.url));
        }
        // Validators can access scanner
      }
      return NextResponse.next();
    }
    
    // If no valid session or not an admin, redirect to login
    if (!token || token.isAdmin !== true) {
      const loginUrl = new URL('/login?error=unauthorized', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Role-based access control
    // @ts-ignore
    if (token.adminRole === 'VALIDATOR') {
      // Validators can only access transactions and the main admin dashboard (which we can redirect to transactions)
      const allowedPaths = ['/admin/transactions', '/admin/scanner', '/admin'];
      const isAllowed = allowedPaths.some(path => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/'));
      
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/admin/transactions', request.url));
      }
      
      // If they go to /admin, redirect to /admin/transactions
      if (request.nextUrl.pathname === '/admin') {
        return NextResponse.redirect(new URL('/admin/transactions', request.url));
      }
    }
  }

  // --- MAINTENANCE MODE LOGIC ---
  const isMaintenance = process.env.MAINTENANCE_MODE === 'true';
  const path = request.nextUrl.pathname;
  
  if (isMaintenance) {
    // Check if the current path is a public path (not admin, not login, not already on maintenance)
    const isAdminPath = path.startsWith('/admin');
    const isLoginPath = path === '/login';
    const isMaintenancePath = path === '/maintenance';
    
    // Allow access to admin, login, maintenance page, and static assets
    if (!isAdminPath && !isLoginPath && !isMaintenancePath) {
      return NextResponse.redirect(new URL('/maintenance', request.url));
    }
  } else {
    // If not in maintenance mode but user tries to visit /maintenance, redirect to home
    if (path === '/maintenance') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // If going to login page but already authenticated as admin, redirect to admin
  if (path === '/login') {
    if (token && token.isAdmin === true) {
      // @ts-ignore
      if (token.adminRole === 'VALIDATOR') {
        return NextResponse.redirect(new URL('/admin/transactions', request.url));
      }
      const adminUrl = new URL('/admin/events', request.url);
      return NextResponse.redirect(adminUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|images|favicon.ico|public).*)'],
};
