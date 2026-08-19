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
            title: savedLead?.title ?? momentLead?.feeling ?? `First hours in ${city.name}`,
            place: savedLead ? undefined : momentLead?.placeHint,
            reason:
              savedLead?.body ??
              momentLead?.story ??
              `Start with a slow loop — then ask locals what ${city.name} is doing today.`,
            budget: '₹0',
          },
          {
            time: 'Afternoon',
            title:
              savedSecond?.title ??
              primary?.name ??
              momentFood?.feeling ??
              'Follow a local food note',
            place: primary?.name ?? momentFood?.placeHint,
            reason:
              savedSecond?.body ??
              primary?.aiSummary ??
              momentFood?.story ??
              `Built around your ${input.food.toLowerCase()} preference — skip the tourist checklist.`,
            budget: input.budget.includes('Under') ? '₹300' : '₹600',
          },
          {
            time: 'Evening',
            title:
              moments[1]?.feeling ??
              city.trending[0]?.label.replace(/^[^ ]+ /, '') ??
              'Evening with locals',
            place: moments[1]?.placeHint,
            reason:
              moments[1]?.story ??
              `Ask one specific question in AASPAAS tonight — answers beat generic “top spots”.`,
            budget: input.budget.includes('4k') ? '₹900' : '₹450',
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
          title: secondary?.name ?? moments[2]?.feeling ?? 'Quiet morning walk',
          place: secondary?.name ?? moments[2]?.placeHint,
          reason:
            secondary?.experiences[0]?.body ??
            moments[2]?.story ??
            'Follow a local recommendation before crowds build.',
          budget: '₹200',
        },
        {
          time: 'Afternoon',
          title: momentFood?.feeling ?? `${input.food} with locals`,
          place: momentFood?.placeHint,
          reason:
            momentFood?.story ??
            `Keep it specific to your ${input.food.toLowerCase()} preference — not a must-visit list.`,
          budget: input.budget.includes('Under') ? '₹350' : '₹700',
        },
        {
          time: 'Evening',
          title: city.localUpdates[0]?.text ?? 'Check today’s local notes',
          reason: city.localUpdates[0]
            ? 'Pulled from a live local update.'
            : 'Open Today on the city page — only real signals belong here.',
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
