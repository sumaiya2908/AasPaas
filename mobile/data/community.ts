/**
 * Community content types prepared for future RAG / moderation pipeline.
 * Frontend-only contracts — no fake AI behavior.
 */

export type CommunityContentType =
  | 'experience'
  | 'question'
  | 'warning'
  | 'local_update'
  | 'recommendation'
  | 'hidden_gem';

export type VibeTag =
  | 'quiet'
  | 'local'
  | 'adventurous'
  | 'foodie'
  | 'crowded'
  | 'hiddenGem'
  | 'worthIt'
  | 'avoid'
  | 'sunset'
  | 'nightlife'
  | 'family'
  | 'budget';

export const VIBE_TAG_OPTIONS: { id: VibeTag; label: string }[] = [
  { id: 'quiet', label: 'Quiet' },
  { id: 'local', label: 'Local' },
  { id: 'adventurous', label: 'Adventurous' },
  { id: 'foodie', label: 'Foodie' },
  { id: 'crowded', label: 'Crowded' },
  { id: 'hiddenGem', label: 'Hidden gem' },
  { id: 'worthIt', label: 'Worth it' },
  { id: 'avoid', label: 'Avoid' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'family', label: 'Family' },
  { id: 'budget', label: 'Budget' },
];

/** Suggested TTL hours by content type — for future expiry UI */
export const CONTENT_TTL_HOURS: Record<CommunityContentType, number | null> = {
  experience: null,
  recommendation: null,
  hidden_gem: null,
  question: 72,
  warning: 24,
  local_update: 24,
};

export type CommunityPostDraft = {
  contentType: CommunityContentType;
  cityId: string;
  text: string;
  placeName?: string;
  neighborhood?: string;
  vibeTags: VibeTag[];
  /** ISO — set when persisted to backend */
  createdAt?: string;
  expiresAt?: string;
};

export type CommunityPostMeta = {
  cityId: string;
  neighborhood?: string;
  category?: string;
  vibeTags: VibeTag[];
  timestamp: string;
  freshnessLabel: string;
  contentType: CommunityContentType;
  engagement?: { confirms: number; helpful: number };
  moderationState?: 'pending' | 'approved' | 'flagged' | 'removed';
};
