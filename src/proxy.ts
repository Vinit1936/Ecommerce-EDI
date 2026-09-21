/**
 * Route gating.
 *
 * NOTE: in Next.js 16 this file is `proxy.ts`, NOT `middleware.ts` — the old
 * convention is deprecated and is ignored silently if you use it.
 *
 * Next's docs are explicit that this runs separately from render code and
 * should not rely on shared modules, globals or a database connection. So this
 * only checks that a session cookie exists and redirects if not. Real role
 * checks live in the route handlers via requireRole(), where the DB is
 * reachable and a 403 can be returned properly.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token'];

export function proxy(request: NextRequest) {
  const signedIn = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (signedIn) return NextResponse.next();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/account/:path*', '/dashboard/:path*', '/orders/:path*'],
};
