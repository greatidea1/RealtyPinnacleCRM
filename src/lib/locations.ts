import { db } from '@/lib/db';

/** Trims and collapses whitespace in a location name. */
export function normalizeLocationName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
// End normalizeLocationName

/** Case-insensitive equality check for location names. */
export function locationNamesEqual(a: string, b: string): boolean {
  return normalizeLocationName(a).toLowerCase() === normalizeLocationName(b).toLowerCase();
}
// End locationNamesEqual

/** Finds a city by case-insensitive name, or creates it. */
export async function findOrCreateCity(rawName: string) {
  const name = normalizeLocationName(rawName);
  if (!name) throw new Error('City name is required');

  const existing = await db.city.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) return existing;

  try {
    return await db.city.create({ data: { name } });
  } catch (err: unknown) {
    // Race: another request may have created the same city
    const again = await db.city.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (again) return again;
    throw err;
  }
}
// End findOrCreateCity

/** Finds a locality under a city by case-insensitive name, or creates it. */
export async function findOrCreateLocality(cityId: string, rawName: string) {
  const name = normalizeLocationName(rawName);
  if (!name) throw new Error('Locality name is required');

  const existing = await db.locality.findFirst({
    where: { cityId, name: { equals: name, mode: 'insensitive' } },
  });
  if (existing) return existing;

  try {
    return await db.locality.create({ data: { name, cityId } });
  } catch (err: unknown) {
    const again = await db.locality.findFirst({
      where: { cityId, name: { equals: name, mode: 'insensitive' } },
    });
    if (again) return again;
    throw err;
  }
}
// End findOrCreateLocality

/** Ensures city + locality exist and returns both with denormalized names. */
export async function resolveCityAndLocality(input: {
  cityId?: string | null;
  localityId?: string | null;
  city?: string | null;
  locality?: string | null;
}) {
  let city =
    input.cityId
      ? await db.city.findUnique({ where: { id: input.cityId } })
      : null;

  if (!city && input.city?.trim()) {
    city = await findOrCreateCity(input.city);
  }

  let locality = input.localityId
    ? await db.locality.findUnique({ where: { id: input.localityId } })
    : null;

  if (locality && !city) {
    city = await db.city.findUnique({ where: { id: locality.cityId } });
  }

  if (!locality && city && input.locality?.trim()) {
    locality = await findOrCreateLocality(city.id, input.locality);
  }

  if (locality && city && locality.cityId !== city.id) {
    throw new Error('Locality does not belong to the selected city');
  }

  return {
    cityId: city?.id ?? null,
    localityId: locality?.id ?? null,
    city: city?.name ?? (input.city ? normalizeLocationName(input.city) : ''),
    locality: locality?.name ?? (input.locality ? normalizeLocationName(input.locality) : ''),
  };
}
// End resolveCityAndLocality

/** Builds denormalized client preferred-location fields from master IDs/names. */
export async function resolveClientPreferredLocation(input: {
  preferredCityId?: string | null;
  preferredLocalityId?: string | null;
  preferredCity?: string | null;
  preferredLocality?: string | null;
}) {
  const resolved = await resolveCityAndLocality({
    cityId: input.preferredCityId,
    localityId: input.preferredLocalityId,
    city: input.preferredCity,
    locality: input.preferredLocality,
  });

  const preferredLocality = resolved.locality || null;
  const preferredCity = resolved.city || null;
  const preferredLocation = [preferredLocality, preferredCity].filter(Boolean).join(', ') || null;

  return {
    preferredCityId: resolved.cityId,
    preferredLocalityId: resolved.localityId,
    preferredCity,
    preferredLocality,
    preferredLocation,
  };
}
// End resolveClientPreferredLocation

/** Backfills Location Master from existing free-text Property/Client values. */
export async function seedLocationsFromExistingData() {
  const properties = await db.property.findMany({
    select: { id: true, city: true, locality: true },
  });
  const clients = await db.client.findMany({
    select: {
      id: true,
      preferredCity: true,
      preferredLocality: true,
      preferredCityId: true,
      preferredLocalityId: true,
    },
  });

  let linkedProperties = 0;
  let linkedClients = 0;

  for (const p of properties) {
    if (!p.city?.trim() || !p.locality?.trim()) continue;
    const city = await findOrCreateCity(p.city);
    const locality = await findOrCreateLocality(city.id, p.locality);
    await db.property.update({
      where: { id: p.id },
      data: {
        cityId: city.id,
        localityId: locality.id,
        city: city.name,
        locality: locality.name,
      },
    });
    linkedProperties += 1;
  }

  for (const c of clients) {
    if (!c.preferredCity?.trim() && !c.preferredLocality?.trim()) continue;
    const resolved = await resolveClientPreferredLocation({
      preferredCityId: c.preferredCityId,
      preferredLocalityId: c.preferredLocalityId,
      preferredCity: c.preferredCity,
      preferredLocality: c.preferredLocality,
    });
    await db.client.update({ where: { id: c.id }, data: resolved });
    linkedClients += 1;
  }

  return { linkedProperties, linkedClients };
}
// End seedLocationsFromExistingData

/** Parses CSV text expecting Column A = Locality, Column B = City. */
export function parseLocationCsv(csvText: string): { locality: string; city: string }[] {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) throw new Error('CSV is empty');

  const rows: { locality: string; city: string }[] = [];
  let start = 0;

  const firstCells = splitCsvLine(lines[0]);
  const looksLikeHeader =
    firstCells.length >= 2 &&
    /locality/i.test(firstCells[0]) &&
    /city/i.test(firstCells[1]);
  if (looksLikeHeader) start = 1;

  for (let i = start; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length < 2) {
      throw new Error(`Invalid CSV format on row ${i + 1}: expected Locality,City`);
    }
    const locality = normalizeLocationName(cells[0]);
    const city = normalizeLocationName(cells[1]);
    if (!locality || !city) {
      throw new Error(`Invalid CSV format on row ${i + 1}: Locality and City are required`);
    }
    rows.push({ locality, city });
  }

  if (rows.length === 0) throw new Error('CSV has no data rows');
  return rows;
}
// End parseLocationCsv

/** Splits a single CSV line, supporting simple quoted fields. */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
// End splitCsvLine

/** Builds CSV export content for Location Master rows. */
export function buildLocationCsv(rows: { locality: string; city: string }[]): string {
  const header = 'Locality,City';
  const body = rows.map((r) => `${escapeCsv(r.locality)},${escapeCsv(r.city)}`).join('\n');
  return `${header}\n${body}\n`;
}
// End buildLocationCsv

/** Escapes a CSV cell when it contains commas, quotes, or newlines. */
function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
// End escapeCsv
