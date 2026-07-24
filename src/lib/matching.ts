import type { Client, Property } from '@/lib/types';

export type MatchCriterionKey = 'propertyType' | 'city' | 'locality' | 'bedrooms';

export interface MatchBreakdown {
  propertyType: boolean | null;
  city: boolean | null;
  locality: boolean | null;
  bedrooms: boolean | null;
}

export interface ScoredPropertyMatch {
  property: Property;
  matchScore: number;
  breakdown: MatchBreakdown;
  matchedCriteria: MatchCriterionKey[];
}

export interface ScoredClientMatch {
  client: Client;
  matchScore: number;
  breakdown: MatchBreakdown;
  matchedCriteria: MatchCriterionKey[];
}

/** Builds a combined location label from preferred city/locality (or legacy field). */
export function formatClientLocation(
  client: Pick<Client, 'preferredCity' | 'preferredLocality' | 'preferredLocation'>
): string {
  const parts = [client.preferredLocality, client.preferredCity].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return client.preferredLocation || '';
} // end formatClientLocation

/** Normalizes free-text for case-insensitive location comparisons. */
function normalizeText(value?: string | null): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
} // end normalizeText

/** Returns true when two location strings overlap (contains either way). */
function locationOverlaps(a?: string | null, b?: string | null): boolean {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
} // end locationOverlaps

/**
 * Scores how well a client’s requirements match a property.
 * Criteria: property type, city, locality, bedrooms (BHK).
 * Prefers preferredCity/preferredLocality; falls back to preferredLocation.
 */
export function scoreClientPropertyMatch(
  client: Pick<Client, 'preferredType' | 'preferredLocation' | 'preferredCity' | 'preferredLocality' | 'preferredBeds'>,
  property: Pick<Property, 'propertyType' | 'city' | 'locality' | 'bedrooms'>
): { matchScore: number; breakdown: MatchBreakdown; matchedCriteria: MatchCriterionKey[] } {
  const breakdown: MatchBreakdown = {
    propertyType: null,
    city: null,
    locality: null,
    bedrooms: null,
  };
  const matchedCriteria: MatchCriterionKey[] = [];
  let applicable = 0;
  let matched = 0;

  if (client.preferredType) {
    applicable += 1;
    const isMatch = normalizeText(client.preferredType) === normalizeText(property.propertyType);
    breakdown.propertyType = isMatch;
    if (isMatch) {
      matched += 1;
      matchedCriteria.push('propertyType');
    }
  }

  const hasStructuredLocation = Boolean(client.preferredCity || client.preferredLocality);
  const cityPreference = client.preferredCity || (!hasStructuredLocation ? client.preferredLocation : undefined);
  const localityPreference = client.preferredLocality || (!hasStructuredLocation ? client.preferredLocation : undefined);

  if (cityPreference && property.city) {
    applicable += 1;
    const cityMatch = locationOverlaps(cityPreference, property.city);
    breakdown.city = cityMatch;
    if (cityMatch) {
      matched += 1;
      matchedCriteria.push('city');
    }
  }

  if (localityPreference && property.locality) {
    applicable += 1;
    const localityMatch = locationOverlaps(localityPreference, property.locality);
    breakdown.locality = localityMatch;
    if (localityMatch) {
      matched += 1;
      matchedCriteria.push('locality');
    }
  }

  if (client.preferredBeds != null && property.bedrooms != null) {
    applicable += 1;
    const bedsMatch = Number(client.preferredBeds) === Number(property.bedrooms);
    breakdown.bedrooms = bedsMatch;
    if (bedsMatch) {
      matched += 1;
      matchedCriteria.push('bedrooms');
    }
  }

  const matchScore = applicable === 0 ? 0 : Math.round((matched / applicable) * 100);
  return { matchScore, breakdown, matchedCriteria };
} // end scoreClientPropertyMatch

/** Ranks properties for a client by descending match score (score > 0 only). */
export function findMatchingProperties(
  client: Client,
  properties: Property[]
): ScoredPropertyMatch[] {
  return properties
    .map((property) => {
      const result = scoreClientPropertyMatch(client, property);
      return { property, ...result };
    })
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.property.title.localeCompare(b.property.title));
} // end findMatchingProperties

/** Ranks clients for a property by descending match score (score > 0 only). */
export function findMatchingClients(
  property: Property,
  clients: Client[]
): ScoredClientMatch[] {
  return clients
    .map((client) => {
      const result = scoreClientPropertyMatch(client, property);
      return { client, ...result };
    })
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || a.client.name.localeCompare(b.client.name));
} // end findMatchingClients
