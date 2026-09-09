import { reverseGeocodeToPincode } from '@/lib/reverse-geocode';
import { requireAuth } from '@/lib/auth-guard';
import { NextRequest, NextResponse } from 'next/server';

/** Reverse-geocodes coordinates to an Indian pincode (offline postal dataset + online fallbacks). */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if ('error' in auth) return auth.error;

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || searchParams.get('lon') || '');

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    const location = await reverseGeocodeToPincode(lat, lng);
    if (!location.pincode) {
      return NextResponse.json(
        {
          error: 'No pincode found for your current location. Enter it manually.',
          location,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ location });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reverse geocode failed';
    console.error('[geocode/reverse]', message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
// End GET
