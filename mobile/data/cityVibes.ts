/**
 * Long-term City Pulse identity — separate from temporary "Today" signals.
 * Seeded from community patterns; evolves slowly. Ready for RAG enrichment later.
 */

export type CityVibeFacet = {
  icon: string;
  label: string;
};

export type CityIdentity = {
  tagline: string;
  vibes: CityVibeFacet[];
  localTake: string;
  localAuthor: string;
};

const DEFAULT_VIBES: CityVibeFacet[] = [
  { icon: '🍜', label: 'Food & street life' },
  { icon: '🎨', label: 'Culture & history' },
  { icon: '🌅', label: 'Sunsets & slow evenings' },
  { icon: '🚶', label: 'Walks & hidden corners' },
];

const IDENTITY: Record<string, CityIdentity> = {
  jaipur: {
    tagline: 'A city of color, chaos & quiet moments.',
    vibes: [
      { icon: '🍜', label: 'Food & street life' },
      { icon: '🎨', label: 'Culture & history' },
      { icon: '🌅', label: 'Sunsets & slow evenings' },
      { icon: '🚶', label: 'Walks & hidden corners' },
    ],
    localTake:
      'The best evenings are spent wandering the old city, stopping for chai and watching the sunset.',
    localAuthor: 'Someone who calls Jaipur home',
  },
  goa: {
    tagline: 'Salt air, slow mornings, and nights that stretch.',
    vibes: [
      { icon: '🏖', label: 'Beaches & breeze' },
      { icon: '☕', label: 'Cafés & easy days' },
      { icon: '🌙', label: 'Nightlife & energy' },
      { icon: '🌿', label: 'Quiet village lanes' },
    ],
    localTake:
      'Skip the loudest beach. Walk inland at golden hour — the villages feel like the Goa people still whisper about.',
    localAuthor: 'A local from Mapusa',
  },
  kochi: {
    tagline: 'Harbor light, spice air, and stories in every lane.',
    vibes: [
      { icon: '⛵', label: 'Harbor & nets' },
      { icon: '🍜', label: 'Food & spice' },
      { icon: '🎨', label: 'Heritage walks' },
      { icon: '🌧', label: 'Rainy stone streets' },
    ],
    localTake:
      'When the Chinese nets silhouette against the sky, walk until the ferries look like lanterns. That’s Kochi exhaling.',
    localAuthor: 'A traveler who stayed too long',
  },
  hampi: {
    tagline: 'Ruins, sunrise, and silence between the boulders.',
    vibes: [
      { icon: '🌅', label: 'Sunrise climbs' },
      { icon: '🪨', label: 'Ruins & rockscapes' },
      { icon: '🚶', label: 'Slow walks' },
      { icon: '☕', label: 'Quiet cafés' },
    ],
    localTake:
      'Climb Matanga in the dark. When the ruins wake pink, you stop needing a guidebook — only quieter days.',
    localAuthor: 'A traveler who stayed too long',
  },
};

export function getCityIdentity(
  cityId: string,
  cityName?: string,
  opts?: { briefing?: string | null },
): CityIdentity {
  const curated = IDENTITY[cityId];
  if (curated) return curated;

  const briefing = opts?.briefing?.trim();
  const usableBriefing =
    briefing &&
    !briefing.includes('Community pulse will fill') &&
    !briefing.includes('ready to explore')
      ? briefing
      : null;

  const name = cityName || 'this city';
  return {
    tagline:
      usableBriefing ||
      `Discover ${name} through local moments and stories.`,
    vibes: DEFAULT_VIBES,
    localTake: usableBriefing
      ? usableBriefing
      : `Slow down. Wander a little.\nThe city tends to reveal itself.`,
    localAuthor: 'AasPaas',
  };
}
