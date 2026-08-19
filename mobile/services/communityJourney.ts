/**
 * Build itinerary stops from real community experiences — not tourist templates.
 * Enforces: time-of-day fit, near-duplicate rejection, place/vibe variety.
 */

import { momentTitleFromExperience } from '@/services/cityPulse';
import type { ApiExperienceItem } from '@/services/aaspaasApi';
import type {
  GeneratedDay,
  GeneratedJourney,
  GeneratedStop,
  JourneyPreferences,
} from '@/services/journeyAi';
import type { SavedExperience } from '@/store/useAppStore';

type Slot = 'Morning' | 'Afternoon' | 'Evening';

const DAY_SLOTS: Slot[] = ['Morning', 'Afternoon', 'Evening'];

function interestBlob(prefs: JourneyPreferences) {
  return [prefs.vibe, prefs.style, prefs.food, ...(prefs.interests || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function bodyBlob(item: ApiExperienceItem) {
  return `${item.title} ${item.body} ${(item.vibeTags || []).join(' ')}`.toLowerCase();
}

/** Strip place names so template clones collapse to one fingerprint. */
export function contentFingerprint(item: ApiExperienceItem): string {
  let text = item.body.toLowerCase();
  const place = item.neighborhood?.trim().toLowerCase();
  if (place) {
    text = text.split(place).join(' ');
  }
  // Drop city-ish proper nouns mid-sentence noise; keep structure words
  return text
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 14)
    .join(' ');
}

export function detectSlot(item: ApiExperienceItem): Slot | 'any' {
  const blob = bodyBlob(item);
  const tags = (item.vibeTags || []).map((t) => t.toLowerCase()).join(' ');

  if (
    /before 9|morning|sunrise|dawn|early morning|stalls open soft/.test(blob) ||
    /\bmorning\b/.test(tags)
  ) {
    return 'Morning';
  }
  if (
    /nightlife|live set|after 9|late night|starts late/.test(blob) ||
    /\bnightlife\b|\bmusic\b/.test(tags)
  ) {
    return 'Evening';
  }
  if (
    /after 6|evening|sunset|golden hour|light softens|fills up after/.test(blob) ||
    /\bevening\b|\bsunset\b/.test(tags)
  ) {
    return 'Evening';
  }
  if (/afternoon|lunch|midday|filter coffee|café|cafe/.test(blob) || /\bcafes\b|\bslow\b/.test(tags)) {
    return 'Afternoon';
  }
  if (/food|street|market|chai|thali|noodle/.test(blob) || /food|street|market/.test(tags)) {
    return 'Afternoon';
  }
  if (/walk|nature|green|park|quiet|heritage|temple/.test(blob) || /walk|nature|heritage/.test(tags)) {
    return 'Morning';
  }
  return 'any';
}

function scoreItem(
  item: ApiExperienceItem,
  prefs: JourneyPreferences,
  slot: Slot,
): number {
  const want = interestBlob(prefs);
  const blob = bodyBlob(item);
  let score = 0;

  for (const token of want.split(/\s+/).filter((t) => t.length > 2)) {
    if (blob.includes(token.toLowerCase())) score += 2;
  }
  for (const tag of item.vibeTags || []) {
    if (want.includes(tag.toLowerCase())) score += 3;
  }
  if (prefs.avoidTouristy && /tourist|must.?visit|top attraction/i.test(blob)) {
    score -= 8;
  }
  if (item.neighborhood?.trim()) score += 4;
  if (item.source === 'post') score += 2;

  const detected = detectSlot(item);
  if (detected === slot) score += 12;
  else if (detected === 'any') score += 2;
  else score -= 6; // wrong time-of-day

  return score;
}

function themeLabel(item: ApiExperienceItem): string | null {
  const tags = (item.vibeTags || []).map((t) => t.trim()).filter(Boolean);
  const skip = new Set(['local', 'question', 'avoid']);
  const hit = tags.find((t) => !skip.has(t.toLowerCase()));
  if (!hit) return null;
  return hit.charAt(0).toUpperCase() + hit.slice(1);
}

function editorialTitle(item: ApiExperienceItem): string {
  const place = item.neighborhood?.trim();
  const theme = themeLabel(item);
  if (place && theme) return `${theme} near ${place}`;
  if (place) {
    const base = momentTitleFromExperience(item);
    if (!base.toLowerCase().includes(place.toLowerCase())) {
      return `${base.length > 36 ? `${base.slice(0, 34)}…` : base} · ${place}`;
    }
    return base;
  }
  return momentTitleFromExperience(item);
}

function stopFromExperience(
  item: ApiExperienceItem,
  time: Slot,
  budget?: string,
): GeneratedStop {
  const place = item.neighborhood?.trim() || undefined;
  return {
    time,
    title: editorialTitle(item),
    place,
    reason: item.body.trim(),
    budget,
    why: {
      summary: place
        ? `From ${item.authorName} near ${place} (${item.ago}).`
        : `From ${item.authorName} (${item.ago}).`,
    },
  };
}

function stopFromSaved(
  item: SavedExperience,
  time: Slot,
  budget?: string,
): GeneratedStop {
  return {
    time,
    title: item.title,
    place: undefined,
    reason: (item.body || '').trim() || 'Something you saved to experience here.',
    budget,
    why: {
      summary: `From your saves — keeping “${item.title}” in the plan.`,
    },
  };
}

function primaryVibe(item: ApiExperienceItem): string {
  return (item.vibeTags || [])[0]?.toLowerCase() || 'general';
}

/**
 * Pick one experience per slot with hard uniqueness constraints.
 */
function pickForSlot(input: {
  pool: ApiExperienceItem[];
  usedIds: Set<string>;
  usedFingerprints: Set<string>;
  usedPlaces: Set<string>;
  usedVibes: Set<string>;
  prefs: JourneyPreferences;
  slot: Slot;
}): ApiExperienceItem | null {
  const { pool, usedIds, usedFingerprints, usedPlaces, usedVibes, prefs, slot } =
    input;

  const ranked = pool
    .filter((item) => !usedIds.has(item.id))
    .map((item) => ({ item, score: scoreItem(item, prefs, slot) }))
    .sort((a, b) => b.score - a.score);

  // Pass 1: unique fingerprint + unique place + unique vibe + slot fit preferred
  for (const { item } of ranked) {
    const fp = contentFingerprint(item);
    const place = item.neighborhood?.trim().toLowerCase() || '';
    const vibe = primaryVibe(item);
    if (usedFingerprints.has(fp)) continue;
    if (place && usedPlaces.has(place)) continue;
    if (usedVibes.has(vibe) && ranked.length > 4) continue;
    const detected = detectSlot(item);
    if (detected !== 'any' && detected !== slot) continue;
    return item;
  }

  // Pass 2: relax vibe uniqueness
  for (const { item } of ranked) {
    const fp = contentFingerprint(item);
    const place = item.neighborhood?.trim().toLowerCase() || '';
    if (usedFingerprints.has(fp)) continue;
    if (place && usedPlaces.has(place)) continue;
    const detected = detectSlot(item);
    if (detected !== 'any' && detected !== slot) continue;
    return item;
  }

  // Pass 3: relax place (still no duplicate templates)
  for (const { item } of ranked) {
    const fp = contentFingerprint(item);
    if (usedFingerprints.has(fp)) continue;
    const detected = detectSlot(item);
    if (detected !== 'any' && detected !== slot) continue;
    return item;
  }

  // Pass 4: any unused non-duplicate fingerprint
  for (const { item } of ranked) {
    const fp = contentFingerprint(item);
    if (usedFingerprints.has(fp)) continue;
    return item;
  }

  return null;
}

/** Prefer real posts/stories; never invent places or fake mention counts. */
export function buildJourneyFromCommunity(input: {
  prefs: JourneyPreferences;
  cityName: string;
  experiences: ApiExperienceItem[];
  saved?: SavedExperience[];
  estimate: string;
}): GeneratedJourney | null {
  const posts = input.experiences.filter(
    (e) => e.source === 'post' || e.source === 'story',
  );

  const withPlace = posts.filter((p) => p.neighborhood?.trim());
  const pool = withPlace.length >= 3 ? withPlace : posts;
  const saved = input.saved || [];
  if (posts.length === 0 && saved.length === 0) return null;

  // Collapse obvious template clones up front (keep best-scoring per fingerprint)
  const bestByFp = new Map<string, ApiExperienceItem>();
  for (const item of pool) {
    const fp = contentFingerprint(item);
    const prev = bestByFp.get(fp);
    if (!prev || scoreItem(item, input.prefs, 'Afternoon') > scoreItem(prev, input.prefs, 'Afternoon')) {
      bestByFp.set(fp, item);
    }
  }
  const diversePool = [...bestByFp.values()];

  const days = Math.max(1, Math.min(input.prefs.days, 3));
  const daysPlan: GeneratedDay[] = [];
  const usedIds = new Set<string>();
  const usedFingerprints = new Set<string>();
  // Places may repeat across days; reset vibe soft-set each day
  const usedPlacesGlobal = new Set<string>();

  for (let d = 1; d <= days; d++) {
    const stops: GeneratedStop[] = [];
    const usedVibesDay = new Set<string>();
    const usedPlacesDay = new Set<string>();

    if (d === 1 && saved[0] && !usedIds.has(`saved:${saved[0].id}`)) {
      stops.push(stopFromSaved(saved[0], 'Morning', '₹0'));
      usedIds.add(`saved:${saved[0].id}`);
    }

    for (const slot of DAY_SLOTS) {
      if (stops.some((s) => s.time === slot)) continue;

      const picked = pickForSlot({
        pool: diversePool,
        usedIds,
        usedFingerprints,
        usedPlaces: new Set([...usedPlacesDay, ...usedPlacesGlobal]),
        usedVibes: usedVibesDay,
        prefs: input.prefs,
        slot,
      });

      if (!picked) continue;

      const fp = contentFingerprint(picked);
      const place = picked.neighborhood?.trim().toLowerCase() || '';
      usedIds.add(picked.id);
      usedFingerprints.add(fp);
      if (place) {
        usedPlacesDay.add(place);
        usedPlacesGlobal.add(place);
      }
      usedVibesDay.add(primaryVibe(picked));

      stops.push(
        stopFromExperience(
          picked,
          slot,
          input.prefs.budget.includes('Under') ? '₹300' : '₹500',
        ),
      );
    }

    if (d === 2 && saved[1] && stops.length < 4) {
      const hasAfternoon = stops.some((s) => s.time === 'Afternoon');
      if (!hasAfternoon) {
        stops.splice(1, 0, stopFromSaved(saved[1], 'Afternoon', '₹400'));
      }
    }

    // Keep chronological Morning → Afternoon → Evening
    stops.sort(
      (a, b) =>
        DAY_SLOTS.indexOf(a.time as Slot) - DAY_SLOTS.indexOf(b.time as Slot),
    );

    if (stops.length === 0) break;

    daysPlan.push({
      day: d,
      label:
        d === 1
          ? saved[0]
            ? 'Start from what you saved'
            : 'Local moments first'
          : d === 2
            ? 'Go deeper with locals'
            : 'Quieter corners',
      stops,
    });
  }

  if (!daysPlan.length) return null;

  return {
    title: `Your ${input.cityName}`,
    estimate: input.estimate,
    daysPlan,
    source: 'community_first_demo',
  };
}
