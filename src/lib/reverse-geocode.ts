import { geocode } from '@aialok/lakhua';
import { isValidPincode } from '@/lib/pincode';

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  pincode: string | null;
  city: string | null;
  state: string | null;
  district: string | null;
  source: 'lakhua' | 'nominatim';
}

/** Extracts a 6-digit Indian pincode from a free-text postcode string. */
function extractIndianPincode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const match = raw.replace(/\s/g, '').match(/\d{6}/);
  return match && isValidPincode(match[0]) ? match[0] : null;
}
// End extractIndianPincode

/**
 * Fallback reverse geocode via OpenStreetMap Nominatim when offline data lacks a pincode.
 */
async function reverseViaNominatim(lat: number, lon: number): Promise<Partial<ReverseGeocodeResult> | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '18');

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'RealtyPinnacleCRM/1.0 (property-location)',
    },
    cache: 'no-store',
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    address?: {
      postcode?: string;
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      state_district?: string;
      county?: string;
      country_code?: string;
    };
  };

  const address = data.address;
  if (!address || address.country_code !== 'in') return null;

  return {
    pincode: extractIndianPincode(address.postcode),
    city: address.city || address.town || address.village || address.county || null,
    state: address.state || null,
    district: address.state_district || address.county || null,
    source: 'nominatim',
  };
}
// End reverseViaNominatim

/**
 * Resolves lat/lng to an Indian pincode using @aialok/lakhua (offline),
 * with Nominatim fallback when pincode is missing.
 */
export async function reverseGeocodeToPincode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('Invalid coordinates');
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error('Coordinates out of range');
  }

  const offline = geocode(lat, lon);
  const result: ReverseGeocodeResult = {
    latitude: lat,
    longitude: lon,
    pincode: offline?.pincode && isValidPincode(offline.pincode) ? offline.pincode : null,
    city: offline?.city || null,
    state: offline?.state && offline.state !== 'Unknown' ? offline.state : null,
    district: offline?.district || null,
    source: 'lakhua',
  };

  if (result.pincode) return result;

  try {
    const fallback = await reverseViaNominatim(lat, lon);
    if (fallback?.pincode) {
      return {
        ...result,
        pincode: fallback.pincode,
        city: fallback.city || result.city,
        state: fallback.state || result.state,
        district: fallback.district || result.district,
        source: 'nominatim',
      };
    }
  } catch {
    /* keep offline result */
  }

  if (!result.pincode && !result.city) {
    throw new Error('Could not resolve a pincode for this location');
  }

  return result;
}
// End reverseGeocodeToPincode
