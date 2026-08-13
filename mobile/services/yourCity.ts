/**
 * Lightweight "Your {City}" lens from saves + profile — not ML.
 */

import type { SavedExperience, UserProfile } from '@/store/useAppStore';

export type YourCityLens = {
  headline: string;
  lead: string;
  threads: string[];
};

const THREAD_RULES: { match: RegExp; label: string }[] = [
  { match: /quiet|breathe|soft|calm|hard day|reset|exhale/i, label: 'Quiet evenings' },
  { match: /tea|chai|coffee|café|cafe|food|noodle|lunch|thali|jalebi|bakery/i, label: 'Food corners' },
  { match: /walk|lane|street|bazaar|market|harbor|sea|climb|hill/i, label: 'Walks & lanes' },
  { match: /rain|light|sunset|sunrise|gold|pink|evening/i, label: 'Light & weather' },
  { match: /night|nightlife|social/i, label: 'Night energy' },
  { match: /culture|ruin|fort|heritage|history/i, label: 'Culture & places' },
];

export function buildYourCityLens(
  cityName: string,
  saves: SavedExperience[],
  profile?: UserProfile | null
): YourCityLens | null {
  if (saves.length === 0 && !(profile?.interests?.length || profile?.travelStyle)) {
    return null;
  }

  const blob = saves.map((s) => `${s.title} ${s.body || ''}`).join(' ');
  const threads: string[] = [];

  for (const rule of THREAD_RULES) {
    if (rule.match.test(blob) && !threads.includes(rule.label)) {
      threads.push(rule.label);
    }
    if (threads.length >= 3) break;
  }

  if (profile?.interests?.length) {
    for (const interest of profile.interests) {
      const label =
        interest.toLowerCase() === 'food'
          ? 'Food corners'
          : interest.toLowerCase() === 'walking'
            ? 'Walks & lanes'
            : interest.toLowerCase() === 'nightlife'
              ? 'Night energy'
              : interest.toLowerCase() === 'nature'
                ? 'Open-air resets'
                : interest.toLowerCase() === 'culture'
                  ? 'Culture & places'
                  : interest;
      if (!threads.includes(label)) threads.push(label);
      if (threads.length >= 3) break;
    }
  }

  if (threads.length === 0 && profile?.travelStyle) {
    threads.push(profile.travelStyle);
  }

  if (threads.length === 0 && saves.length > 0) {
    threads.push(...saves.slice(0, 2).map((s) => s.title));
  }

  if (threads.length === 0) return null;

  const lead =
    saves.length >= 2
      ? `From ${saves.length} things you’ve saved here.`
      : saves.length === 1
        ? 'Starting from what you already saved.'
        : profile?.travelStyle
          ? `Tuned to your ${profile.travelStyle.toLowerCase()} style.`
          : 'Shaped by how you like to travel.';

  return {
    headline: `Your ${cityName}`,
    lead,
    threads: threads.slice(0, 3),
  };
}
