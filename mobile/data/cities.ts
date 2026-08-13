/**
 * City + community mock data.
 * Structured so freshness, avoid signals, and aggregation can later come from the backend/RAG.
 */

export type CommunityTone = 'hot' | 'warn' | 'calm' | 'food';

export type TrendingItem = {
  icon: string;
  label: string;
  tone: CommunityTone;
  /** Relative freshness label — replace with ISO timestamp from API later */
  ago?: string;
};

export type LocalUpdate = {
  id: string;
  icon: string;
  text: string;
  ago: string;
  confirms: number;
  /** Content type for TTL / RAG metadata */
  contentType?: 'event' | 'traffic' | 'food' | 'tip' | 'warning';
};

export type AvoidItem = {
  id: string;
  label: string;
  reason: string;
  ago: string;
};

/** Aggregated pulse signals — mock until backend aggregation exists */
export type PulseSignals = {
  updateCountToday: number;
  mentions: { label: string; count: number }[];
};

export type City = {
  /** Canonical city_id (cuid from API) or legacy local slug */
  id: string;
  /** Stable content key for moments/vibes — e.g. jaipur */
  slug?: string;
  name: string;
  state: string;
  country?: string;
  weather: string;
  tempC: number;
  mood: string[];
  briefing: string;
  pulseSignals: PulseSignals;
  trending: TrendingItem[];
  avoid: AvoidItem[];
  localUpdates: LocalUpdate[];
};

export const CITIES: City[] = [
  {
    id: 'jaipur',
    name: 'Jaipur',
    state: 'Rajasthan',
    weather: 'Pleasant evening',
    tempC: 28,
    mood: ['Creative', 'Busy', 'Street Food', 'Festival Energy'],
    briefing:
      'Jaipur feels lively today. Street food markets are busy, the weather is pleasant, and several cultural performances are happening this evening.',
    pulseSignals: {
      updateCountToday: 18,
      mentions: [
        { label: 'street food', count: 7 },
        { label: 'festivals', count: 5 },
        { label: 'busy markets', count: 4 },
      ],
    },
    trending: [
      { icon: '🎵', label: 'Folk festival starts in 40 mins', tone: 'hot', ago: '12 min ago' },
      { icon: '🍜', label: 'Most recommended today: Johari Bazaar chaat', tone: 'food', ago: '32 min ago' },
      { icon: '🌅', label: 'Beautiful sunset expected at Nahargarh', tone: 'calm', ago: '1h ago' },
    ],
    avoid: [
      {
        id: 'ja-av1',
        label: 'Amer Fort',
        reason: 'Unusually crowded — parking after 4pm is rough',
        ago: '18 min ago',
      },
      {
        id: 'ja-av2',
        label: 'Heavy traffic near Amer Fort road',
        reason: 'Locals confirming delays both ways',
        ago: '25 min ago',
      },
    ],
    localUpdates: [
      { id: 'ju1', icon: '🎵', text: 'Live folk music at Albert Hall lawns', ago: '18 min ago', confirms: 14, contentType: 'event' },
      { id: 'ju2', icon: '🍜', text: 'Lassi wali gali is packed but moving fast', ago: '32 min ago', confirms: 9, contentType: 'food' },
      { id: 'ju3', icon: '⚠️', text: 'Avoid Amer Fort parking after 4pm', ago: '1h ago', confirms: 21, contentType: 'warning' },
      { id: 'ju4', icon: '🌅', text: 'Golden hour at Nahargarh is crystal clear', ago: '2h ago', confirms: 11, contentType: 'tip' },
    ],
  },
  {
    id: 'goa',
    name: 'Goa',
    state: 'Goa',
    weather: 'Breezy coastal',
    tempC: 30,
    mood: ['Relaxed', 'Beach', 'Nightlife', 'Backpacker Friendly'],
    briefing:
      'Goa feels easy today. Beaches are calm in the morning, cafés in Assagao are buzzing, and Anjuna has a low-key sunset crowd.',
    pulseSignals: {
      updateCountToday: 12,
      mentions: [
        { label: 'cafés', count: 5 },
        { label: 'quiet beaches', count: 4 },
        { label: 'sunset', count: 3 },
      ],
    },
    trending: [
      { icon: '🏖', label: 'Palolem quieter than expected', tone: 'calm', ago: '45 min ago' },
      { icon: '☕', label: 'Assagao cafés trending with locals', tone: 'food', ago: '1h ago' },
      { icon: '🎵', label: 'Acoustic set in Anjuna tonight', tone: 'hot', ago: '2h ago' },
    ],
    avoid: [
      {
        id: 'go-av1',
        label: 'Light drizzle after 7pm',
        reason: 'Coastal showers possible — carry a light cover',
        ago: '1h ago',
      },
    ],
    localUpdates: [
      { id: 'gu1', icon: '☕', text: 'Hidden courtyard café in Assagao just reopened', ago: '25 min ago', confirms: 7, contentType: 'food' },
      { id: 'gu2', icon: '🎵', text: 'Free acoustic set near Anjuna flea stalls', ago: '40 min ago', confirms: 12, contentType: 'event' },
      { id: 'gu3', icon: '🏖', text: 'Palolem morning swim is glassy calm', ago: '3h ago', confirms: 16, contentType: 'tip' },
    ],
  },
  {
    id: 'kochi',
    name: 'Kochi',
    state: 'Kerala',
    weather: 'Humid & bright',
    tempC: 31,
    mood: ['Coastal', 'Heritage', 'Foodie', 'Slow Travel'],
    briefing:
      'Kochi feels coastal and curious. Fort Kochi lanes are walkable, seafood stalls are firing up early, and Jew Town has a soft evening buzz.',
    pulseSignals: {
      updateCountToday: 14,
      mentions: [
        { label: 'seafood', count: 6 },
        { label: 'art walks', count: 4 },
        { label: 'heritage lanes', count: 3 },
      ],
    },
    trending: [
      { icon: '🐟', label: 'Fresh catch specials near Chinese Fishing Nets', tone: 'food', ago: '20 min ago' },
      { icon: '🎨', label: 'Pop-up art walk in Fort Kochi', tone: 'hot', ago: '50 min ago' },
      { icon: '☕', label: 'Best filter coffee under ₹80 today', tone: 'calm', ago: '2h ago' },
    ],
    avoid: [
      {
        id: 'ko-av1',
        label: 'Marine Drive',
        reason: 'Brief shower risk — umbrella useful',
        ago: '1h ago',
      },
    ],
    localUpdates: [
      { id: 'ku1', icon: '🎨', text: 'Art walk starts near Parade Ground in 1 hour', ago: '12 min ago', confirms: 8, contentType: 'event' },
      { id: 'ku2', icon: '🐟', text: 'Seafood thali spot by the nets is excellent', ago: '55 min ago', confirms: 19, contentType: 'food' },
      { id: 'ku3', icon: '☔', text: 'Light rain near Marine Drive — umbrella useful', ago: '1h ago', confirms: 6, contentType: 'warning' },
    ],
  },
  {
    id: 'hampi',
    name: 'Hampi',
    state: 'Karnataka',
    weather: 'Clear & warm',
    tempC: 33,
    mood: ['Adventure', 'Ruins', 'Sunrise', 'Quiet'],
    briefing:
      'Hampi feels epic and quiet. Sunrise at Matanga is worth the climb, scooter rental lines are short, and riverside cafés are calmer than weekends.',
    pulseSignals: {
      updateCountToday: 9,
      mentions: [
        { label: 'sunrise', count: 5 },
        { label: 'ruins walks', count: 3 },
        { label: 'quiet cafés', count: 2 },
      ],
    },
    trending: [
      { icon: '🌅', label: 'Matanga sunrise is stunning today', tone: 'hot', ago: '3h ago' },
      { icon: '🛵', label: 'Scooter rentals available without wait', tone: 'calm', ago: '1h ago' },
      { icon: '🍜', label: 'Banana leaf thali popular in Hippie Island', tone: 'food', ago: '2h ago' },
    ],
    avoid: [
      {
        id: 'ha-av1',
        label: 'Some cafés offline',
        reason: 'Carry cash — card machines are spotty today',
        ago: '2h ago',
      },
    ],
    localUpdates: [
      { id: 'hu1', icon: '🌅', text: 'Amazing sunrise at Matanga Hill today', ago: '4h ago', confirms: 27, contentType: 'tip' },
      { id: 'hu2', icon: '🛵', text: 'Scooter rentals near bus stand have no queue', ago: '1h ago', confirms: 5, contentType: 'tip' },
    ],
  },
];

export function slugifyCity(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'city';
}

/** Empty pulse shell for API / catalog cities until backend fills pulse data. */
export function createCityShell(input: {
  id?: string;
  slug?: string;
  name: string;
  state?: string;
  country?: string;
}): City {
  const name = input.name.trim();
  const slug = input.slug || slugifyCity(name);
  const id = input.id || slug;
  const region = [input.state, input.country].filter(Boolean).join(', ') || 'India';
  return {
    id,
    slug,
    name,
    state: region,
    country: input.country,
    weather: 'Check local conditions',
    tempC: 0,
    mood: ['Local', 'Discovering'],
    briefing: `${name} is ready to explore. Community pulse will fill in as locals share what’s happening.`,
    pulseSignals: { updateCountToday: 0, mentions: [] },
    trending: [],
    avoid: [],
    localUpdates: [],
  };
}

export function contentCityKey(city: City | string) {
  if (typeof city === 'string') return city;
  return city.slug || city.id;
}

export function getCity(id: string, extras: City[] = []) {
  return (
    CITIES.find((c) => c.id === id || c.slug === id) ??
    extras.find((c) => c.id === id || c.slug === id) ??
    createCityShell({ id, name: id.replace(/-/g, ' ') })
  );
}

export function findCityByName(name: string, extras: City[] = []) {
  const key = name.trim().toLowerCase();
  return (
    CITIES.find((c) => c.name.toLowerCase() === key) ??
    extras.find((c) => c.name.toLowerCase() === key) ??
    null
  );
}
