import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

/** Public API paths that do not require a session cookie. */
function isPublicApi(req: NextRequest): boolean {
  const { pathname } = req.nextUrl;
  if (pathname === '/api/auth') return true;
  if (pathname === '/api' || pathname === '/api/') return true;
  return false;
}
// End isPublicApi

/**
 * Blocks unauthenticated access to CRM APIs (Next.js 16 proxy, Node runtime).
 * Data routes must also scope by session user; this is a fail-closed gate.
 * Must be proxy.ts — middleware.ts runs on Edge and crashes on Node crypto/Buffer.
 */
export function proxy(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (isPublicApi(req)) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}
// End proxy

export const config = {
  matcher: ['/api/:path*'],
};
