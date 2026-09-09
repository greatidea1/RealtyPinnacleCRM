/** India Post pincode API types and lookup helpers. */

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
export function normalizePostOffices(pincode: string, offices: IndiaPostOffice[]): PincodeLocation {
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
  };
}
// End normalizePostOffices

/**
 * Fetches location data from the public India Post API for a 6-digit pincode.
 * Throws on invalid pin, network failure, or unsuccessful Status.
 */
export async function lookupPincode(pincode: string): Promise<PincodeLocation> {
  const pin = pincode.trim();
  if (!isValidPincode(pin)) {
    throw new Error('Enter a valid 6-digit pincode');
  }

  const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Unable to reach India Post pincode service');
  }

  const data = (await res.json()) as IndiaPostApiEntry[];
  const entry = Array.isArray(data) ? data[0] : null;

  if (!entry || entry.Status !== 'Success' || !entry.PostOffice?.length) {
    throw new Error(entry?.Message || 'No post office found for this pincode');
  }

  return normalizePostOffices(pin, entry.PostOffice);
}
// End lookupPincode
