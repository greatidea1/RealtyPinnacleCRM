/** Indian pincode lookup: offline dataset first, then public API fallbacks. */

export interface IndiaPostOffice {
  Name: string;
  Description: string | null;
  BranchType: string;
  DeliveryStatus: string;
  Circle: string;
  District: string;
  Division: string;
  Region: string;
  Block: string;
  State: string;
  Country: string;
  Pincode: string;
}

interface IndiaPostApiEntry {
  Message: string;
  Status: string;
  PostOffice: IndiaPostOffice[] | null;
}

/** Normalized location fields derived from a pincode lookup. */
export interface PincodeLocation {
  pincode: string;
  /** District — used as city in the CRM. */
  city: string;
  /** Selected / primary post-office name — used as locality/area. */
  locality: string;
  /** Unique post-office names for this pincode (user may pick one). */
  localities: string[];
  state: string;
  /** Block / tehsil when available. */
  area: string;
  district: string;
  postOffices: IndiaPostOffice[];
  /** Which provider answered (offline twin, India Post, or Zippopotam). */
  source?: 'offline' | 'indiapost' | 'zippopotam';
}

const PINCODE_RE = /^\d{6}$/;

/** Returns true when value is a valid 6-digit Indian pincode. */
export function isValidPincode(value: string): boolean {
  return PINCODE_RE.test(value.trim());
}
// End isValidPincode

/** Prefers a Delivery branch, otherwise the first post office. */
function pickPrimaryOffice(offices: IndiaPostOffice[]): IndiaPostOffice {
  return offices.find((o) => o.DeliveryStatus === 'Delivery') || offices[0];
}
// End pickPrimaryOffice

/** Maps India Post offices into CRM city / locality / state fields. */
export function normalizePostOffices(
  pincode: string,
  offices: IndiaPostOffice[],
  source: PincodeLocation['source'] = 'indiapost'
): PincodeLocation {
  const primary = pickPrimaryOffice(offices);
  const localities = Array.from(
    new Set(offices.map((o) => o.Name.trim()).filter(Boolean))
  );

  return {
    pincode,
    city: (primary.District || primary.Region || '').trim(),
    locality: (primary.Name || '').trim(),
    localities,
    state: (primary.State || '').trim(),
    area: (primary.Block || primary.Name || '').trim(),
    district: (primary.District || '').trim(),
    postOffices: offices,
    source,
  };
}
// End normalizePostOffices

/** Builds a minimal IndiaPostOffice-shaped row for UI compatibility. */
function asOffice(args: {
  name: string;
  district: string;
  state: string;
  pincode: string;
  block?: string;
}): IndiaPostOffice {
  return {
    Name: args.name,
    Description: null,
    BranchType: 'Post Office',
    DeliveryStatus: 'Delivery',
    Circle: args.state,
    District: args.district,
    Division: args.district,
    Region: args.district,
    Block: args.block || args.name,
    State: args.state,
    Country: 'India',
    Pincode: args.pincode,
  };
}
// End asOffice

/**
 * Offline lookup via @twin.techies/india-pincode (bundled India Post dataset).
 * Avoids flaky api.postalpincode.in SSL/network failures from Docker/Node.
 */
function lookupOffline(pin: string): PincodeLocation | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twin = require('@twin.techies/india-pincode') as {
      findByPincode: (p: string) => {
        pincode: string;
        state: string;
        district: string;
        offices: Array<{ name: string; city?: string; district: string; state: string; pincode: string }>;
      } | null;
    };
    const hit = twin.findByPincode(pin);
    if (!hit?.offices?.length) return null;

    const offices = hit.offices.map((o) =>
      asOffice({
        name: o.name,
        district: o.district || o.city || hit.district,
        state: o.state || hit.state,
        pincode: hit.pincode,
        block: o.city || o.name,
      })
    );
    return normalizePostOffices(pin, offices, 'offline');
  } catch {
    return null;
  }
}
// End lookupOffline

/** Live India Post API (often fails from Node due to SSL/DNS). */
async function lookupIndiaPost(pin: string): Promise<PincodeLocation | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as IndiaPostApiEntry[];
    const entry = Array.isArray(data) ? data[0] : null;
    if (!entry || entry.Status !== 'Success' || !entry.PostOffice?.length) return null;
    return normalizePostOffices(pin, entry.PostOffice, 'indiapost');
  } catch {
    return null;
  }
}
// End lookupIndiaPost

/** Zippopotam.in fallback (lighter payload, fewer localities). */
async function lookupZippopotam(pin: string): Promise<PincodeLocation | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/in/${pin}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      'post code'?: string;
      places?: Array<{
        'place name'?: string;
        state?: string;
        latitude?: string;
        longitude?: string;
      }>;
    };
    const places = data.places || [];
    if (!places.length) return null;

    const offices = places.map((p) =>
      asOffice({
        name: (p['place name'] || pin).trim(),
        district: (p.state || '').trim(),
        state: (p.state || '').trim(),
        pincode: pin,
      })
    );
    const loc = normalizePostOffices(pin, offices, 'zippopotam');
    // Zippo often puts city-ish names in "state"; keep district as city when possible.
    if (!loc.city && places[0]?.state) loc.city = places[0].state.trim();
    return loc;
  } catch {
    return null;
  }
}
// End lookupZippopotam

/**
 * Resolves a 6-digit Indian pincode to city / locality / state.
 * Prefers the offline dataset so CRM works without outbound India Post access.
 */
export async function lookupPincode(pincode: string): Promise<PincodeLocation> {
  const pin = pincode.trim();
  if (!isValidPincode(pin)) {
    throw new Error('Enter a valid 6-digit pincode');
  }

  const offline = lookupOffline(pin);
  if (offline) return offline;

  const indiaPost = await lookupIndiaPost(pin);
  if (indiaPost) return indiaPost;

  const zippo = await lookupZippopotam(pin);
  if (zippo) return zippo;

  throw new Error('No post office found for this pincode');
}
// End lookupPincode
