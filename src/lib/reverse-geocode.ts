import { isValidPincode } from '@/lib/pincode';

export interface ReverseGeocodeResult {
  latitude: number;
  longitude: number;
  pincode: string | null;
  city: string | null;
  state: string | null;
  district: string | null;
  source: 'postalcodes-india' | 'lakhua' | 'nominatim' | 'bigdatacloud' | 'photon';
}

/** Extracts a 6-digit Indian pincode from free text (postcode field or display name). */
function extractIndianPincode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const match = String(raw).replace(/\s/g, '').match(/(?<!\d)(\d{6})(?!\d)/);
  if (!match) return null;
  return isValidPincode(match[1]) ? match[1] : null;
}
// End extractIndianPincode

/**
 * Offline nearest-pincode lookup via postalcodes-india GeoNames dataset.
 * Works without outbound network (critical on locked-down / SSL-broken hosts).
 */
async function reverseViaPostalCodesIndia(
  lat: number,
  lon: number
): Promise<Partial<ReverseGeocodeResult> | null> {
  try {
    const mod = await import('postalcodes-india');
    const api = (mod as { default?: typeof mod }).default || mod;
    const findByRadius = (api as {
      findByRadius?: (latitude: number, longitude: number, radiusKm: number) => Array<{
        postalCode: string;
        placeName?: string;
        stateName?: string;
        districtName?: string;
        latitude?: number;
        longitude?: number;
      }>;
    }).findByRadius;

    if (typeof findByRadius !== 'function') return null;

    // Expand radius until we get a hit (urban first, then rural).
    for (const km of [2, 5, 10, 20]) {
      const hits = findByRadius(lat, lon, km) || [];
      if (!hits.length) continue;

      // Pick geographically nearest hit when coordinates are present.
      let best = hits[0];
      let bestDist = Number.POSITIVE_INFINITY;
      for (const h of hits) {
        if (typeof h.latitude !== 'number' || typeof h.longitude !== 'number') continue;
        const dlat = h.latitude - lat;
        const dlon = h.longitude - lon;
        const dist = dlat * dlat + dlon * dlon;
        if (dist < bestDist) {
          bestDist = dist;
          best = h;
        }
      }

      const pincode = extractIndianPincode(best.postalCode);
      if (!pincode) continue;

      return {
        pincode,
        city: best.districtName || best.placeName || null,
        state: best.stateName || null,
        district: best.districtName || null,
        source: 'postalcodes-india',
      };
    }
    return null;
  } catch {
    return null;
  }
}
// End reverseViaPostalCodesIndia

/** Tries offline India reverse geocode (lakhua / H3); returns null if missing. */
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
    signal: AbortSignal.timeout(10000),
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
    signal: AbortSignal.timeout(10000),
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

/** Reverse geocode via Komoot Photon (OSM-based, often returns postcode). */
async function reverseViaPhoton(lat: number, lon: number): Promise<Partial<ReverseGeocodeResult> | null> {
  const url = new URL('https://photon.komoot.io/reverse');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lon));

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;

  const data = (await res.json()) as {
    features?: Array<{
      properties?: {
        postcode?: string;
        city?: string;
        state?: string;
        district?: string;
        countrycode?: string;
        name?: string;
      };
    }>;
  };

  const props = data.features?.[0]?.properties;
  if (!props) return null;

  const cc = String(props.countrycode || '').toUpperCase();
  const pincode = extractIndianPincode(props.postcode) || extractIndianPincode(props.name);
  if (cc && cc !== 'IN' && !pincode) return null;

  return {
    pincode,
    city: props.city || props.district || null,
    state: props.state || null,
    district: props.district || null,
    source: 'photon',
  };
}
// End reverseViaPhoton

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
 * Offline postalcodes-india / lakhua first, then Nominatim, Photon, BigDataCloud.
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
    source: 'postalcodes-india',
  };

  result = applyPartial(result, await reverseViaPostalCodesIndia(lat, lon));
  if (result.pincode) return result;

  result = applyPartial(result, await reverseViaLakhua(lat, lon));
  if (result.pincode) return result;

  for (const provider of [reverseViaNominatim, reverseViaPhoton, reverseViaBigDataCloud]) {
    try {
      result = applyPartial(result, await provider(lat, lon));
      if (result.pincode) return result;
    } catch {
      /* try next */
    }
  }

  if (!result.pincode) {
    throw new Error(
      'Could not resolve a pincode for this location. Try entering the pincode manually.'
    );
  }

  return result;
}
// End reverseGeocodeToPincode
