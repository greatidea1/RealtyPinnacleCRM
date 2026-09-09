import { isValidPincode } from '@/lib/pincode';

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  pincode: string | null;
  city: string | null;
  state: string | null;
  district: string | null;
  source: 'lakhua' | 'nominatim' | 'bigdatacloud';
}

/** Extracts a 6-digit Indian pincode from free text (postcode field or display name). */
function extractIndianPincode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const match = String(raw).replace(/\s/g, '').match(/(?<!\d)(\d{6})(?!\d)/);
  if (!match) return null;
  return isValidPincode(match[1]) ? match[1] : null;
}
// End extractIndianPincode

/** Tries offline India reverse geocode; returns null if the package is missing or has no match. */
async function reverseViaLakhua(
  lat: number,
  lon: number
): Promise<Partial<ReverseGeocodeResult> | null> {
  try {
    const { geocode } = await import('@aialok/lakhua');
    const offline = geocode(lat, lon);
    if (!offline) return null;
    return {
      pincode: offline.pincode && isValidPincode(offline.pincode) ? offline.pincode : null,
      city: offline.city || null,
      state: offline.state && offline.state !== 'Unknown' ? offline.state : null,
      district: offline.district || null,
      source: 'lakhua',
    };
  } catch {
    return null;
  }
}
// End reverseViaLakhua

/** Reverse geocode via OpenStreetMap Nominatim (server-side). */
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
      'User-Agent': 'RealtyPinnacleCRM/1.0 (https://crm.realtypinnacle.com; property-locate)',
    },
    cache: 'no-store',
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    display_name?: string;
    address?: {
      postcode?: string;
      city?: string;
      town?: string;
      village?: string;
      suburb?: string;
      neighbourhood?: string;
      state?: string;
      state_district?: string;
      county?: string;
      country_code?: string;
    };
  };

  const address = data.address;
  if (!address) return null;

  const country = String(address.country_code || '').toLowerCase();
  const pincode =
    extractIndianPincode(address.postcode) || extractIndianPincode(data.display_name);
  if (country && country !== 'in' && !pincode) return null;

  return {
    pincode,
    city: address.city || address.town || address.village || address.suburb || address.county || null,
    state: address.state || null,
    district: address.state_district || address.county || null,
    source: 'nominatim',
  };
}
// End reverseViaNominatim

/** Reverse geocode via BigDataCloud client API (no key required). */
async function reverseViaBigDataCloud(lat: number, lon: number): Promise<Partial<ReverseGeocodeResult> | null> {
  const url = new URL('https://api.bigdatacloud.net/data/reverse-geocode-client');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('localityLanguage', 'en');

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    countryCode?: string;
    city?: string;
    locality?: string;
    postcode?: string;
    principalSubdivision?: string;
    localityInfo?: { administrative?: Array<{ name?: string; description?: string }> };
  };

  if (String(data.countryCode || '').toUpperCase() !== 'IN') return null;

  const adminNames = (data.localityInfo?.administrative || [])
    .map((a) => a.name)
    .filter(Boolean)
    .join(' ');

  return {
    pincode: extractIndianPincode(data.postcode) || extractIndianPincode(adminNames),
    city: data.city || data.locality || null,
    state: data.principalSubdivision || null,
    district: null,
    source: 'bigdatacloud',
  };
}
// End reverseViaBigDataCloud

/** Merges a partial provider result onto the accumulating reverse-geocode result. */
function applyPartial(
  base: ReverseGeocodeResult,
  partial: Partial<ReverseGeocodeResult> | null
): ReverseGeocodeResult {
  if (!partial) return base;
  return {
    ...base,
    pincode: partial.pincode || base.pincode,
    city: partial.city || base.city,
    state: partial.state || base.state,
    district: partial.district || base.district,
    source: (partial.pincode ? partial.source : base.source) || base.source,
  };
}
// End applyPartial

/**
 * Resolves lat/lng to an Indian pincode.
 * Uses offline lakhua when available, then Nominatim, then BigDataCloud.
 */
export async function reverseGeocodeToPincode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('Invalid coordinates');
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error('Coordinates out of range');
  }

  let result: ReverseGeocodeResult = {
    latitude: lat,
    longitude: lon,
    pincode: null,
    city: null,
    state: null,
    district: null,
    source: 'lakhua',
  };

  result = applyPartial(result, await reverseViaLakhua(lat, lon));
  if (result.pincode) return result;

  try {
    result = applyPartial(result, await reverseViaNominatim(lat, lon));
    if (result.pincode) return result;
  } catch {
    /* continue */
  }

  try {
    result = applyPartial(result, await reverseViaBigDataCloud(lat, lon));
    if (result.pincode) return result;
  } catch {
    /* continue */
  }

  if (!result.pincode) {
    throw new Error(
      'Could not resolve a pincode for this location. Try entering the pincode manually.'
    );
  }

  return result;
}
// End reverseGeocodeToPincode
