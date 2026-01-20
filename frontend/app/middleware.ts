import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Helper function to create redirect URL with redirect parameter
function createRedirectUrl(basePath: string, request: NextRequest, redirectTo?: string): URL {
  const url = new URL(basePath, request.url);
  if (redirectTo) {
    url.searchParams.set('redirect', redirectTo);
  }
  return url;
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  const { pathname, searchParams } = request.nextUrl;
  const redirectParam = searchParams.get('redirect');

  // Skip middleware for API routes, queue routes, and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/queue/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    // These routes are skipped - no logging needed
    return NextResponse.next();
  }

  // Log middleware execution - use console.error for visibility in Edge Runtime
  console.error(`[Middleware] ${pathname} - Token: ${token ? 'exists' : 'missing'}`);

  // Handle root route
  if (pathname === '/') {
    if (token) {
      // User has token, redirect to dashboard
      // Token validation will happen on the client side
      console.error(`[Middleware] Root route - Redirecting to /dashboard (token exists)`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    // User is not logged in, redirect to login with redirect parameter
    console.error(`[Middleware] Root route - Redirecting to /login (no token)`);
    return NextResponse.redirect(createRedirectUrl('/login', request, '/'));
  }

  // Public routes (login, register)
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    if (token) {
      // User has token, redirect to dashboard or redirect parameter
      const redirectTo = redirectParam || '/dashboard';
      // Validate redirect URL to prevent open redirects
      const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') 
        ? redirectTo 
        : '/dashboard';
      console.error(`[Middleware] Auth route - Redirecting to ${safeRedirect} (token exists)`);
      return NextResponse.redirect(new URL(safeRedirect, request.url));
    }
    // Allow access to auth pages
    console.error(`[Middleware] Auth route - Allowing access (no token)`);
    return NextResponse.next();
  }

  // Protected routes
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/resumes') ||
    pathname.startsWith('/jobs') ||
    pathname.startsWith('/automation')
  ) {
    if (!token) {
      // No token, redirect to login with redirect parameter
      console.error(`[Middleware] Protected route ${pathname} - Redirecting to /login (no token)`);
      return NextResponse.redirect(createRedirectUrl('/login', request, pathname));
    }
    // Token exists, allow access (validation happens on client side)
    console.error(`[Middleware] Protected route ${pathname} - Allowing access (token exists)`);
    return NextResponse.next();
  }

  // Admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      // No token, redirect to login with redirect parameter
      console.error(`[Middleware] Admin route ${pathname} - Redirecting to /login (no token)`);
      return NextResponse.redirect(createRedirectUrl('/login', request, pathname));
    }
    // Token exists, allow access (role check happens on client side)
    console.error(`[Middleware] Admin route ${pathname} - Allowing access (token exists)`);
    return NextResponse.next();
  }

  // Allow other routes (API routes, static files, etc.)
  console.error(`[Middleware] ${pathname} - Allowing access (not matched)`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - queue (queue API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|queue|_next/static|_next/image|favicon.ico).*)',
  ],
};
