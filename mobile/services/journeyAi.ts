/**
 * Journey AI service boundary.
 * Prefers real community experiences → RAG → soft local fallback.
 * Never invents places or fake “community mention” counts.
 */

import { buildJourneyFromCommunity } from '@/services/communityJourney';
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
  citySlug?: string;
  savedExperiences?: SavedExperience[];
};

const ESTIMATE: Record<string, string> = {
  Under: '₹1,200 – ₹2,000 / day',
  '₹2–4k': '₹2,000 – ₹4,000 / day',
  '₹4k+': '₹4,000 – ₹7,000 / day',
};

export async function generateJourneyPlan(
  prefs: JourneyPreferences,
  builder: (p: JourneyPreferences) => Omit<GeneratedJourney, 'source'>,
  context?: JourneyContext
): Promise<GeneratedJourney> {
  const cityName = context?.cityName || prefs.cityId;
  const cityKey = context?.citySlug || prefs.cityId;
  const estimate = ESTIMATE[prefs.budget] ?? '₹2,000 – ₹4,000 / day';

  // 1) Real community experiences for this city (posts with neighborhoods)
  try {
    const experiences = await api.fetchCityExperiences(prefs.cityId, 20);
    const fromCommunity = buildJourneyFromCommunity({
      prefs,
      cityName,
      experiences: experiences.items,
      saved: context?.savedExperiences || [],
      estimate,
    });
    if (fromCommunity) {
      // Prefer RAG why-lines when corpus exists for this slug
      try {
        const rag = await api.ragJourney({
          citySlug: cityKey,
          cityName,
          days: prefs.days,
          vibe: prefs.vibe || prefs.style,
          style: prefs.style,
          food: prefs.food,
          interests: prefs.interests,
        });
        if (rag.source === 'rag' && rag.suggestedStops.length > 0) {
          return mergeRagFlavor(fromCommunity, rag);
        }
      } catch {
        /* community plan is enough */
      }
      return fromCommunity;
    }
  } catch {
    /* fall through */
  }

  // 2) RAG-only plan when experiences API empty but corpus exists
  try {
    const rag = await api.ragJourney({
      citySlug: cityKey,
      cityName,
      days: prefs.days,
      vibe: prefs.vibe || prefs.style,
      style: prefs.style,
      food: prefs.food,
      interests: prefs.interests,
    });

    if (rag.source === 'rag' && rag.suggestedStops.length > 0) {
      const plan = builder(prefs);
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
            },
          };
        }),
      }));

      return {
        ...plan,
        title: `Your ${cityName}`,
        daysPlan,
        source: 'rag',
      };
    }
  } catch {
    // Offline / API down
  }

  // 3) Soft fallback — strip fake tourist filler language where we can
  await new Promise((r) => setTimeout(r, 200));
  const plan = builder(prefs);
  const enriched = enrichPlanWithCommunityWhy(
    plan,
    prefs,
    cityName,
    context?.savedExperiences || []
  );
  return {
    ...enriched,
    title: `Your ${cityName}`,
    source: 'community_first_demo',
  };
}

function mergeRagFlavor(
  base: GeneratedJourney,
  rag: api.RagJourneyResponse,
): GeneratedJourney {
  const byNeighborhood = new Map(
    rag.suggestedStops
      .filter((s) => s.neighborhood)
      .map((s) => [s.neighborhood!.toLowerCase(), s]),
  );

  return {
    ...base,
    source: 'rag',
    daysPlan: base.daysPlan.map((day) => ({
      ...day,
      stops: day.stops.map((stop) => {
        const key = stop.place?.toLowerCase();
        const hit = key ? byNeighborhood.get(key) : undefined;
        if (!hit) return stop;
        return {
          ...stop,
          why: {
            summary: hit.why,
          },
        };
      }),
    })),
  };
}
