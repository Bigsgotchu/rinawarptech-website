import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

// Paths that require authentication
const PROTECTED_PATHS = [
  '/dashboard',
  '/settings',
  '/billing',
  '/api/terminal',
];

// Paths that should redirect to dashboard if already authenticated
const AUTH_PATHS = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token from cookie
  const token = request.cookies.get('rinawarp_auth');

  // Check if user is authenticated
  let isAuthenticated = false;
  if (token) {
    try {
      verify(token.value, JWT_SECRET);
      isAuthenticated = true;
    } catch (error) {
      isAuthenticated = false;
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && AUTH_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Check if the path requires authentication
  if (PROTECTED_PATHS.some(path => pathname.startsWith(path))) {
    if (!isAuthenticated) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('rinawarp_auth');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
