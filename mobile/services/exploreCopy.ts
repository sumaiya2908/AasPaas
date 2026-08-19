import { createCityShell, type City } from '@/data/cities';
import { getCityIdentity } from '@/data/cityVibes';
import type { ApiCity } from '@/services/aaspaasApi';

/** Short editorial line for Explore cards — curated identity, not fabricated live data. */
export function cityFeelingLine(city: { slug?: string; id: string; name: string; briefing?: string }) {
  return cityExploreLine(city);
}

/** Travel-first city invite — AASPAAS philosophy without overusing “feel”. */
export function cityExploreLine(city: { slug?: string; id: string; name: string; briefing?: string }) {
  const key = city.slug || city.id;
  const identity = getCityIdentity(key, city.name);
  if (
    identity.tagline &&
    !identity.tagline.toLowerCase().includes('waiting to be felt') &&
    !identity.tagline.toLowerCase().includes('still getting to know') &&
    !identity.tagline.toLowerCase().startsWith('discover ')
  ) {
    // Prefer human invite over raw vibe tagline on Home continue cards
    return `See ${city.name} through the people who know it.`;
  }
  if (city.briefing && city.briefing.length < 120 && !city.briefing.includes('Community pulse')) {
    return city.briefing;
  }
  return `See ${city.name} through the people who know it.`;
}

export function mapApiCityToLocal(r: ApiCity): City {
  const shell = createCityShell({
    id: r.id,
    slug: r.slug,
    name: r.name,
    state: r.stateObj?.name || r.state,
    country: r.countryObj?.name || r.country,
  });
  return {
    ...shell,
    weather: r.weather || shell.weather,
    tempC: r.tempC ?? shell.tempC,
    mood: r.mood?.length ? r.mood : shell.mood,
    briefing: r.briefing || shell.briefing,
  };
}

export function greetingForNow(name?: string | null) {
  const hour = new Date().getHours();
  const base =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${base}, ${first}` : base;
}
