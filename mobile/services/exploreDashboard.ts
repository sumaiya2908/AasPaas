import { getCityIdentity } from '@/data/cityVibes';
import type { ApiCity } from '@/services/aaspaasApi';
import type { SavedExperience, UserProfile } from '@/store/useAppStore';

export type StoryPull = {
  city: ApiCity;
  quote: string;
  meta: string;
  kind: 'community' | 'localTake';
};

export type BecauseSaved = {
  save: SavedExperience;
  city: ApiCity;
  hook: string;
  tease: string;
};

export type VibeTile = {
  city: ApiCity;
  icon: string;
  title: string;
  description: string;
};

/** Map curated city vibe facets → experience-oriented Explore labels. */
const VIBE_EXPERIENCE: Record<
  string,
  { title: string; description: string }
> = {
  'food & street life': {
    title: 'Eat somewhere local',
    description: 'Small places, big stories.',
  },
  'food & spice': {
    title: 'Eat somewhere local',
    description: 'Small places, big stories.',
  },
  'culture & history': {
    title: "Find the city's character",
    description: 'Art, streets & local stories.',
  },
  'heritage walks': {
    title: "Find the city's character",
    description: 'Art, streets & local stories.',
  },
  'sunsets & slow evenings': {
    title: 'Slow down somewhere beautiful',
    description: 'Sea air, sunsets & quiet corners.',
  },
  'sunrise climbs': {
    title: 'Slow down somewhere beautiful',
    description: 'Sea air, sunsets & quiet corners.',
  },
  'beaches & breeze': {
    title: 'Slow down somewhere beautiful',
    description: 'Sea air, sunsets & quiet corners.',
  },
  'nightlife & energy': {
    title: 'See the city after dark',
    description: 'When the streets soften and open up.',
  },
  'quiet village lanes': {
    title: 'Get away from the usual',
    description: 'Quieter corners locals still keep.',
  },
  'ruins & rockscapes': {
    title: 'Get away from the usual',
    description: 'Quieter corners locals still keep.',
  },
  'walks & hidden corners': {
    title: 'Wander without a plan',
    description: 'Lanes worth getting lost in.',
  },
  'slow walks': {
    title: 'Wander without a plan',
    description: 'Lanes worth getting lost in.',
  },
  'cafés & easy days': {
    title: 'Wander without a plan',
    description: 'Lanes worth getting lost in.',
  },
  'quiet cafés': {
    title: 'Wander without a plan',
    description: 'Lanes worth getting lost in.',
  },
  'harbor & nets': {
    title: 'Slow down somewhere beautiful',
    description: 'Sea air, sunsets & quiet corners.',
  },
  'rainy stone streets': {
    title: 'Get away from the usual',
    description: 'Quieter corners locals still keep.',
  },
};

const FALLBACK_EXPERIENCES: { title: string; description: string; icon: string }[] = [
  {
    icon: '🍜',
    title: 'Eat somewhere local',
    description: 'Small places, big stories.',
  },
  {
    icon: '🎨',
    title: "Find the city's character",
    description: 'Art, streets & local stories.',
  },
  {
    icon: '🌅',
    title: 'Slow down somewhere beautiful',
    description: 'Sea air, sunsets & quiet corners.',
  },
  {
    icon: '🌙',
    title: 'See the city after dark',
    description: 'When the streets soften and open up.',
  },
  {
    icon: '🌿',
    title: 'Get away from the usual',
    description: 'Quieter corners locals still keep.',
  },
  {
    icon: '🚶',
    title: 'Wander without a plan',
    description: 'Lanes worth getting lost in.',
  },
];

/** Personal bridge: one save → one other place worth exploring. */
export function buildBecauseYouSaved(
  saves: SavedExperience[],
  destinations: ApiCity[],
  excludeCityId?: string | null,
  interests: string[] = [],
): BecauseSaved | null {
  const save = saves[0];
  if (!save || destinations.length === 0) return null;

  const interestWords = interests.map((i) => i.toLowerCase()).filter(Boolean);

  const scored = destinations
    .filter((c) => c.id !== save.cityId && c.id !== excludeCityId)
    .map((city) => {
      const identity = getCityIdentity(city.slug || city.id, city.name);
      const hay = [
        ...identity.vibes.map((v) => v.label.toLowerCase()),
        identity.tagline.toLowerCase(),
        ...(city.mood || []).map((m) => m.toLowerCase()),
      ].join(' ');
      const interestHits = interestWords.filter((w) => hay.includes(w)).length;
      const titleBits = save.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const titleHits = titleBits.filter((w) => hay.includes(w)).length;
      return {
        city,
        score: interestHits * 3 + titleHits * 2 + (city.activity?.score || 0) / 50,
      };
    })
    .sort((a, b) => b.score - a.score);

  const pick = scored[0]?.city || destinations.find((c) => c.id !== save.cityId);
  if (!pick) return null;

  const shortTitle =
    save.title.length > 42 ? `${save.title.slice(0, 40).trim()}…` : save.title;

  return {
    save,
    city: pick,
    hook: `You saved “${shortTitle}” in ${save.cityName}`,
    tease: `${pick.name} has a similar kind of experience waiting.`,
  };
}

/**
 * Build Explore-by-vibe tiles from discover cities + curated vibe facets.
 * Titles/descriptions are curated mappings — not fabricated live activity.
 */
export function buildVibeTiles(cities: ApiCity[]): VibeTile[] {
  const usedTitles = new Set<string>();
  const tiles: VibeTile[] = [];

  for (let i = 0; i < cities.length && tiles.length < 5; i++) {
    const city = cities[i];
    const identity = getCityIdentity(city.slug || city.id, city.name);
    const facet = identity.vibes[i % Math.max(identity.vibes.length, 1)];
    const key = (facet?.label || '').toLowerCase().trim();
    const mapped = VIBE_EXPERIENCE[key];
    const fallback = FALLBACK_EXPERIENCES[i % FALLBACK_EXPERIENCES.length];

    const title = mapped?.title || fallback.title;
    if (usedTitles.has(title)) {
      const alt = FALLBACK_EXPERIENCES.find((f) => !usedTitles.has(f.title));
      if (!alt) continue;
      usedTitles.add(alt.title);
      tiles.push({
        city,
        icon: facet?.icon || alt.icon,
        title: alt.title,
        description: alt.description,
      });
      continue;
    }

    usedTitles.add(title);
    tiles.push({
      city,
      icon: facet?.icon || fallback.icon,
      title,
      description: mapped?.description || fallback.description,
    });
  }

  return tiles;
}

/** @deprecated use buildVibeTiles */
export function buildMoodTiles(cities: ApiCity[]) {
  return buildVibeTiles(cities).map((t) => ({
    city: t.city,
    feeling: t.title,
    icon: t.icon,
    tagline: t.description,
  }));
}

export function planReadyCity(
  saves: SavedExperience[],
  preferCityId?: string | null,
): { cityId: string; cityName: string; count: number } | null {
  const counts = new Map<string, { cityName: string; count: number }>();
  for (const s of saves) {
    const cur = counts.get(s.cityId) || { cityName: s.cityName, count: 0 };
    cur.count += 1;
    counts.set(s.cityId, cur);
  }
  if (preferCityId && (counts.get(preferCityId)?.count || 0) >= 2) {
    const row = counts.get(preferCityId)!;
    return { cityId: preferCityId, cityName: row.cityName, count: row.count };
  }
  let best: { cityId: string; cityName: string; count: number } | null = null;
  for (const [cityId, row] of counts) {
    if (row.count >= 2 && (!best || row.count > best.count)) {
      best = { cityId, cityName: row.cityName, count: row.count };
    }
  }
  return best;
}

export function profileInterestHint(profile: UserProfile | null) {
  const first = profile?.interests?.[0]?.trim();
  if (!first) return null;
  return first;
}
