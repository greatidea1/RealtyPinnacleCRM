import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE = 'rp_session';
const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

/** Returns the HMAC secret used to sign session cookies. */
function getSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    'realty-pinnacle-dev-session-secret';
  return secret;
}
// End getSessionSecret

/** Creates a signed session token for the given user id. */
export function createSessionToken(userId: string): string {
  const exp = Date.now() + SESSION_MAX_AGE_SEC * 1000;
  const payload = `${userId}.${exp}`;
  const sig = createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
// End createSessionToken

/** Verifies a signed session token and returns the user id if valid. */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  if (!userId || !expStr || !sig) return null;

  const payload = `${userId}.${expStr}`;
  const expected = createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
  try {
    // Prefer Uint8Array over Buffer so this stays safe if ever called from Edge.
    const a = new TextEncoder().encode(sig);
    const b = new TextEncoder().encode(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  return userId;
}
// End verifySessionToken

/** Reads the session cookie from a NextRequest. */
export function getSessionUserId(req: NextRequest): string | null {
  return verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
}
// End getSessionUserId

/** Attaches a session cookie to a NextResponse. */
export function setSessionCookie(res: NextResponse, userId: string): void {
  res.cookies.set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  });
}
// End setSessionCookie

/** Clears the session cookie on a NextResponse. */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
// End clearSessionCookie

/** Generates a cryptographically random temporary password. */
export function generateTempPassword(length = 12): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}
// End generateTempPassword

/** Generates a raw password-reset token (store only a hash of this). */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}
// End generateResetToken

/** Hashes a reset token for DB storage. */
export function hashResetToken(token: string): string {
  return createHmac('sha256', getSessionSecret()).update(token).digest('hex');
}
// End hashResetToken
