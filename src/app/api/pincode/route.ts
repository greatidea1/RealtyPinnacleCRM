import { lookupPincode, isValidPincode } from '@/lib/pincode';
import { requireAuth } from '@/lib/auth-guard';
import { NextRequest, NextResponse } from 'next/server';

/** Looks up city, locality/area, and state for a 6-digit Indian pincode (offline-first). */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const pincode = (new URL(req.url).searchParams.get('pincode') || '').trim();
    if (!isValidPincode(pincode)) {
      return NextResponse.json({ error: 'Enter a valid 6-digit pincode' }, { status: 400 });
    }

    const location = await lookupPincode(pincode);
    return NextResponse.json({ location });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Pincode lookup failed';
    const status = message.includes('No post office') || message.includes('valid 6-digit') ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
// End GET
