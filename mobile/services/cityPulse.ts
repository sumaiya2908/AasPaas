/**
 * City Pulse helpers — aggregate community signals into slow-changing facets.
 * Ready to swap for RAG summaries without redesigning the City Page.
 */

import type { CityVibeFacet } from '@/data/cityVibes';
import type { ApiExperienceItem } from '@/services/aaspaasApi';

const TAG_TO_FACET: { match: RegExp; icon: string; label: string }[] = [
  { match: /food|street food|chai|cafe|cafés|markets/i, icon: '🍜', label: 'Food & street life' },
  { match: /walk|slow|morning|quiet|lane/i, icon: '🚶', label: 'Slow mornings' },
  { match: /nature|green|park|lake|garden/i, icon: '🌿', label: 'Green corners' },
  { match: /heritage|culture|temple|history|fort/i, icon: '🎨', label: 'Culture & history' },
  { match: /night|evening|sunset|nightlife|music/i, icon: '🌙', label: 'Late evenings' },
  { match: /craft|market|bazaar/i, icon: '🛍', label: 'Markets & crafts' },
  { match: /photo|light|view/i, icon: '📷', label: 'Light & views' },
  { match: /avoid|safety/i, icon: '⚠️', label: 'Local know-how' },
];

const GENERIC_TITLES = new Set([
  'a local shared this',
  'community note',
  'a feeling from someone who lives here',
]);

/** Build pulse facets from experience vibe tags + city mood + curated fallbacks. */
export function buildCityPulseFacets(input: {
  vibeTags: string[];
  mood?: string[];
  curated?: CityVibeFacet[];
  max?: number;
}): CityVibeFacet[] {
  const max = input.max ?? 5;
  const scores = new Map<string, { icon: string; label: string; score: number }>();

  const bump = (icon: string, label: string, n = 1) => {
    const prev = scores.get(label);
    if (prev) prev.score += n;
    else scores.set(label, { icon, label, score: n });
  };

  for (const tag of input.vibeTags) {
    const hit = TAG_TO_FACET.find((r) => r.match.test(tag));
    if (hit) bump(hit.icon, hit.label, 2);
  }

  for (const mood of input.mood || []) {
    const hit = TAG_TO_FACET.find((r) => r.match.test(mood));
    if (hit) bump(hit.icon, hit.label, 1);
    else if (mood.trim()) bump('✨', mood.trim(), 1);
  }

  if (scores.size < 3 && input.curated?.length) {
    for (const c of input.curated) bump(c.icon, c.label, 1);
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ icon, label }) => ({ icon, label }));
}

export function collectExperienceTags(items: ApiExperienceItem[]): string[] {
  const tags: string[] = [];
  for (const item of items) {
    for (const t of item.vibeTags || []) {
      if (t.trim()) tags.push(t.trim());
    }
  }
  return tags;
}

/** Editorial moment title from real post body — does not invent facts. */
export function momentTitleFromExperience(item: {
  title: string;
  body: string;
  neighborhood?: string | null;
}): string {
  const raw = item.title?.trim() || '';
  const isGeneric =
    !raw ||
    GENERIC_TITLES.has(raw.toLowerCase()) ||
    (item.neighborhood && raw.toLowerCase() === item.neighborhood.trim().toLowerCase());

  if (!isGeneric) return raw;

  const first = item.body.trim().split(/[.!?\n]/)[0]?.trim() || raw;
  if (!first) return 'A local moment';
  if (first.length <= 44) return first;
  return `${first.slice(0, 42).trim()}…`;
}

export function isGenericCityBriefing(briefing?: string | null) {
  if (!briefing) return true;
  return (
    briefing.includes('Community pulse will fill') ||
    briefing.includes('ready to explore')
  );
}
