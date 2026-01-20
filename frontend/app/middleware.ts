import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    if (token) {
      // Validate token with backend
      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Cookie: request.headers.get('cookie') || '',
          },
          credentials: 'include',
        });
        if (response.ok) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (error) {
        // If validation fails, allow access to auth pages
      }
    }
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
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Token validation will be done in the component/API
  }

  // Admin routes
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Role check will be done in the component/API
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
