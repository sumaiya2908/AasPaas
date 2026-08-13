/**
 * Deterministic city-name normalization for SEARCH/MATCHING only.
 * Never use this to invent a new city record.
 */
export function normalizeCityName(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugifyCityName(name: string): string {
  return (
    normalizeCityName(name).replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') ||
    'city'
  );
}
