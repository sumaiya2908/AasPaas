import { getCity } from './cities';
import { getPlacesByCity } from './places';
import { getMomentsByCity } from './moments';
import type { JourneyDay } from '@/store/useAppStore';
import { useAppStore } from '@/store/useAppStore';

export type JourneyInput = {
  cityId: string;
  days: number;
  budget: string;
  style: string;
  food: string;
};

export function buildJourney(input: JourneyInput): {
  title: string;
  estimate: string;
  daysPlan: JourneyDay[];
} {
  const city = getCity(input.cityId, useAppStore.getState().customCities);
  const places = getPlacesByCity(input.cityId);
  const moments = getMomentsByCity(input.cityId);
  const saved = useAppStore
    .getState()
    .savedExperiences.filter((e) => e.cityId === input.cityId);
  const primary = places[0];
  const secondary = places[1] ?? places[0];
  const savedLead = saved[0];
  const savedSecond = saved[1];
  const momentLead = moments[0];
  const momentFood = moments.find((m) => /tea|food|noodle|chai|bakery/i.test(m.feeling + m.story));

  const estimateMap: Record<string, string> = {
    Under: '₹1,200 – ₹2,000 / day',
    '₹2–4k': '₹2,000 – ₹4,000 / day',
    '₹4k+': '₹4,000 – ₹7,000 / day',
  };

  const daysPlan: JourneyDay[] = Array.from({ length: input.days }, (_, i) => {
    const day = i + 1;
    if (day === 1) {
      return {
        day,
        label: savedLead ? 'Start from what you saved' : 'Arrive & feel the pulse',
        stops: [
          {
            time: 'Morning',
            title: `Settle into ${city.name}`,
            reason: `Start slow. Today's pulse: ${city.mood.slice(0, 2).join(', ').toLowerCase()}.`,
            budget: '₹0',
          },
          {
            time: 'Afternoon',
            title: savedLead?.title ?? primary?.name ?? 'Local market walk',
            place: primary?.name,
            reason:
              savedLead?.body ??
              primary?.aiSummary ??
              `Explore a local favorite matching your ${input.style.toLowerCase()} style.`,
            budget: input.budget.includes('Under') ? '₹300' : '₹600',
          },
          {
            time: 'Evening',
            title:
              momentLead?.feeling ??
              city.trending[0]?.label.replace(/^[^ ]+ /, '') ??
              'Catch the evening vibe',
            reason:
              momentLead?.story ??
              `Community says this is trending today. Food preference: ${input.food}.`,
            budget: input.budget.includes('4k') ? '₹900' : '₹450',
          },
          {
            time: 'Night',
            title: 'Ask locals one question',
            reason: 'Drop a question in AASPAAS — tonight’s answers are freshest.',
            budget: '₹0',
          },
        ],
      };
    }

    return {
      day,
      label: day === 2 ? 'Go deeper with locals' : 'Hidden corners',
      stops: [
        {
          time: 'Morning',
          title: savedSecond?.title ?? secondary?.name ?? 'Sunrise / quiet walk',
          place: secondary?.name,
          reason:
            savedSecond?.body ??
            secondary?.experiences[0]?.body ??
            'Follow a local recommendation before crowds build.',
          budget: '₹200',
        },
        {
          time: 'Afternoon',
          title: momentFood?.feeling ?? `${input.food} lunch crawl`,
          reason:
            momentFood?.story ??
            `Built around your ${input.food.toLowerCase()} preference and ${input.budget} budget.`,
          budget: input.budget.includes('Under') ? '₹350' : '₹700',
        },
        {
          time: 'Evening',
          title: city.localUpdates[0]?.text ?? 'Follow a live local update',
          reason: 'Pulled from today’s Local Updates so the plan stays alive.',
          budget: '₹400',
        },
      ],
    };
  });

  return {
    title: `${input.days}-Day ${input.style} ${city.name}`,
    estimate: estimateMap[input.budget] ?? '₹2,000 – ₹4,000 / day',
    daysPlan,
  };
}
