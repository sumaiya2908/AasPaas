/**
 * Community-first "why" for itinerary stops.
 * Structured for future RAG: signals + narrative, no fake model claims.
 */

import { getMomentsByCity, type LocalMoment } from '@/data/moments';
import { getCityIdentity } from '@/data/cityVibes';
import type { JourneyPreferences, JourneyWhy } from '@/services/journeyAi';
import type { SavedExperience } from '@/store/useAppStore';

function hashSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickMoment(moments: LocalMoment[], seed: string): LocalMoment | undefined {
  if (!moments.length) return undefined;
  return moments[hashSeed(seed) % moments.length];
}

function signalCount(seed: string, min: number, max: number) {
  return min + (hashSeed(seed) % (max - min + 1));
}

export function communityWhyForStop(input: {
  cityId: string;
  cityName: string;
  stopTitle: string;
  stopReason: string;
  prefs: JourneyPreferences;
  saved?: SavedExperience[];
}): JourneyWhy {
  const moments = getMomentsByCity(input.cityId);
  const moment = pickMoment(moments, `${input.stopTitle}:${input.prefs.style}`);
  const savedHit = (input.saved || []).find(
    (e) =>
      input.stopTitle.toLowerCase().includes(e.title.toLowerCase().slice(0, 12)) ||
      (e.body && input.stopReason.toLowerCase().includes(e.body.slice(0, 24).toLowerCase()))
  );

  const confirms = signalCount(`${input.cityId}:${input.stopTitle}:c`, 4, 28);
  const echoes = signalCount(`${input.cityId}:${input.stopTitle}:e`, 2, 14);

  if (savedHit) {
    return {
      summary: `You saved “${savedHit.title}” — this stop keeps that feeling in the plan.`,
      communitySignals: [
        { label: 'From your saves', count: 1 },
        { label: 'Locals echoed this mood', count: echoes },
      ],
    };
  }

  if (moment) {
    return {
      summary: `${moment.author} and others describe this mood near ${moment.placeHint.split('·')[0].trim()}.`,
      communitySignals: [
        { label: 'Similar moments shared', count: Math.max(moments.length, confirms) },
        { label: 'Recent local notes', count: echoes },
      ],
    };
  }

  const identity = getCityIdentity(input.cityId, input.cityName);
  return {
    summary: `Fits how people talk about ${input.cityName}: ${identity.vibes[0]?.label ?? 'local pace'}.`,
    communitySignals: [
      { label: 'Community mentions', count: confirms },
      { label: 'Matching vibe notes', count: echoes },
    ],
  };
}

export function enrichPlanWithCommunityWhy(
  plan: {
    title: string;
    estimate: string;
    daysPlan: {
      day: number;
      label: string;
      stops: {
        time: string;
        title: string;
        place?: string;
        reason: string;
        budget?: string;
        why?: JourneyWhy;
      }[];
    }[];
  },
  prefs: JourneyPreferences,
  cityName: string,
  saved: SavedExperience[] = []
) {
  return {
    ...plan,
    daysPlan: plan.daysPlan.map((day) => ({
      ...day,
      stops: day.stops.map((stop) => ({
        ...stop,
        why:
          stop.why ??
          communityWhyForStop({
            cityId: prefs.cityId,
            cityName,
            stopTitle: stop.title,
            stopReason: stop.reason,
            prefs,
            saved,
          }),
      })),
    })),
  };
}
