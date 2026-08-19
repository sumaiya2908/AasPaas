export type RagSourceType =
  | 'local_update'
  | 'community'
  | 'moment'
  | 'curated_place'
  | 'official';

export type IngestChunkInput = {
  citySlug: string;
  sourceType: RagSourceType;
  sourceId: string;
  title: string;
  body: string;
  neighborhood?: string | null;
  vibeTags?: string[];
  authorName?: string | null;
  trust?: number;
  expiresAt?: Date | null;
  createdAt?: Date;
};

export type RetrievedChunk = {
  id: string;
  citySlug: string;
  sourceType: string;
  sourceId: string;
  title: string;
  body: string;
  neighborhood: string | null;
  authorName: string | null;
  vibeTags: string[];
  trust?: number;
  score: number;
  semantic: number;
  keyword: number;
  priority: number;
  freshness: number;
  createdAt: string;
};

export type RagCitation = {
  id: string;
  title: string;
  sourceType: string;
  authorName: string | null;
  neighborhood: string | null;
  score: number;
  freshness?: number;
};

export type RagQueryResult = {
  answer: string;
  citations: RagCitation[];
  mode: 'rag' | 'empty_corpus';
  retrieved: number;
  /** true only when answer is built from retrieved citations */
  grounded: boolean;
  /** 0–1 retrieval confidence (top hit score after rerank) */
  confidence: number;
  policy: 'citations_only';
};

export type RagJourneyResult = {
  source: 'rag' | 'empty_corpus' | 'community_first_demo';
  suggestedStops: {
    title: string;
    reason: string;
    neighborhood?: string | null;
    why: string;
    citationId?: string;
  }[];
  whyByTheme: { theme: string; summary: string }[];
  citations: RagCitation[];
  retrieved: number;
  grounded: boolean;
  confidence: number;
  policy: 'citations_only';
};

/** Higher = preferred in ranking (architecture priority). */
export const SOURCE_PRIORITY: Record<string, number> = {
  local_update: 1,
  community: 0.85,
  moment: 0.85,
  curated_place: 0.55,
  official: 0.35,
};
