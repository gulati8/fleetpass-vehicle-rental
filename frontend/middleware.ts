import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware - Route Protection
 *
 * Protects dealer-facing routes from unauthenticated access.
 * Checks for the presence of a refresh token cookie to determine authentication status.
 *
 * Protected Routes:
 * - /dealer/* - All dealer dashboard pages
 *
 * Public Routes:
 * - / - Landing page
 * - /auth/* - Login/signup pages
 * - /api/* - API routes (handled by backend)
 */
export function middleware(request: NextRequest) {
  // Check for refresh token cookie (our authentication indicator)
  const refreshToken = request.cookies.get('refreshToken');

  // Check if this is a protected route
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dealer');

  // If accessing a protected route without authentication, redirect to login
  if (isProtectedRoute && !refreshToken) {
    const loginUrl = new URL('/auth/login', request.url);

    // Preserve the original URL so we can redirect back after login
    loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);

    // Add a message parameter to show in the login page
    loginUrl.searchParams.set('message', 'Please login to access this page');

    console.log(`[Middleware] Redirecting unauthenticated request from ${request.nextUrl.pathname} to login`);

    return NextResponse.redirect(loginUrl);
  }

  // Allow the request to proceed
  return NextResponse.next();
}

/**
 * Matcher Configuration
 *
 * Specifies which routes this middleware should run on.
 * Only runs on /dealer routes to minimize performance impact.
 */
export const config = {
  matcher: [
    '/dealer/:path*', // All dealer routes
  ],
};
