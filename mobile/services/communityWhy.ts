/**
 * Community-first "why" for itinerary stops.
 * Never invents mention counts. Ready for RAG citations later.
 */

import { getMomentsByCity, type LocalMoment } from '@/data/moments';
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
      (e.body &&
        input.stopReason.toLowerCase().includes(e.body.slice(0, 24).toLowerCase())),
  );

  if (savedHit) {
    return {
      summary: `You saved “${savedHit.title}” — this stop keeps that feeling in the plan.`,
    };
  }

  if (moment) {
    return {
      summary: `${moment.author} described this mood near ${moment.placeHint.split('·')[0].trim()}.`,
    };
  }

  if (input.stopReason.trim().length > 20) {
    return {
      summary: `Drawn from how people experience ${input.cityName} — not a guidebook checklist.`,
    };
  }

  return {
    summary: `Still thin on local notes for ${input.cityName}. Ask a local or share an experience to sharpen this plan.`,
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
  saved: SavedExperience[] = [],
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
