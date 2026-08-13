/**
 * Journey AI service boundary.
 * Prefers backend RAG retrieve → synthesize; falls back to local community why.
 */

import { enrichPlanWithCommunityWhy } from '@/services/communityWhy';
import * as api from '@/services/aaspaasApi';
import type { SavedExperience } from '@/store/useAppStore';

export type JourneyPreferences = {
  cityId: string;
  days: number;
  budget: string;
  style: string;
  food: string;
  pace?: 'slow' | 'balanced' | 'packed';
  avoidTouristy?: boolean;
  dislikes?: string[];
  vibe?: string;
  interests?: string[];
};

export type JourneyWhy = {
  summary: string;
  communitySignals?: { label: string; count: number }[];
};

export type GeneratedStop = {
  time: string;
  title: string;
  place?: string;
  reason: string;
  budget?: string;
  why?: JourneyWhy;
};

export type GeneratedDay = {
  day: number;
  label: string;
  stops: GeneratedStop[];
};

export type GeneratedJourney = {
  title: string;
  estimate: string;
  daysPlan: GeneratedDay[];
  source: 'community_first_demo' | 'rag';
};

export type JourneyContext = {
  cityName: string;
  savedExperiences?: SavedExperience[];
};

export async function generateJourneyPlan(
  prefs: JourneyPreferences,
  builder: (p: JourneyPreferences) => Omit<GeneratedJourney, 'source'>,
  context?: JourneyContext
): Promise<GeneratedJourney> {
  const plan = builder(prefs);
  const cityName = context?.cityName || prefs.cityId;

  try {
    const rag = await api.ragJourney({
      citySlug: prefs.cityId,
      cityName,
      days: prefs.days,
      vibe: prefs.vibe || prefs.style,
      style: prefs.style,
      food: prefs.food,
      interests: prefs.interests,
    });

    if (rag.source === 'rag' && rag.suggestedStops.length > 0) {
      const stops = rag.suggestedStops;
      let i = 0;
      const daysPlan = plan.daysPlan.map((day) => ({
        ...day,
        stops: day.stops.map((stop) => {
          const hit = stops[i % stops.length];
          i += 1;
          return {
            ...stop,
            title: hit.title,
            place: hit.neighborhood || stop.place,
            reason: hit.reason,
            why: {
              summary: hit.why,
              communitySignals: [
                { label: 'Retrieved community notes', count: rag.retrieved },
                {
                  label: 'Citations',
                  count: rag.citations.length,
                },
              ],
            },
          };
        }),
      }));

      return {
        ...plan,
        daysPlan,
        source: 'rag',
      };
    }
  } catch {
    // Offline / API down — local enrichment
  }

  await new Promise((r) => setTimeout(r, 400));
  const enriched = enrichPlanWithCommunityWhy(
    plan,
    prefs,
    cityName,
    context?.savedExperiences || []
  );
  return { ...enriched, source: 'community_first_demo' };
}
