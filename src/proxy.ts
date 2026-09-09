import { NextRequest, NextResponse } from 'next/server';

/** Must match SESSION_COOKIE in src/lib/session.ts (do not import session — Node crypto breaks Edge). */
const SESSION_COOKIE = 'rp_session';

/** Public API paths that do not require a session cookie. */
function isPublicApi(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  if (pathname === '/api/auth') return true;
  if (pathname === '/api' || pathname === '/api/') return true;
  return false;
}
// End isPublicApi

/**
 * Optimistic API gate: require a session-shaped cookie without verifying HMAC here.
 * Full HMAC + DB checks stay in requireAuth / requireAdminAuth (Node route handlers).
 * Avoid importing src/lib/session — Edge bundles crash on createHmac/Buffer.
 */
export function proxy(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (isPublicApi(req)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  // userId.exp.sig — shape only; invalid/expired tokens fail in route handlers.
  if (!token || token.split('.').length !== 3) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}
// End proxy

export const config = {
  matcher: ['/api/:path*'],
};
