import { Injectable } from '@nestjs/common';
import { RetrieveService } from './retrieve.service';
import type {
  RagCitation,
  RagJourneyResult,
  RagQueryResult,
  RetrievedChunk,
} from './rag.types';

/**
 * Grounded synthesis only — every sentence must cite retrieved chunks.
 * Never invent places, prices, or vibes outside the corpus.
 */
@Injectable()
export class SynthesizeService {
  constructor(private readonly retrieve: RetrieveService) {}

  async answerQuery(input: {
    citySlug: string;
    query: string;
    topK?: number;
  }): Promise<RagQueryResult> {
    const hits = await this.retrieve.retrieve({
      citySlug: input.citySlug,
      query: input.query,
      topK: input.topK ?? 5,
    });

    if (!hits.length) {
      return {
        answer: `I don’t have enough community-backed notes for that in ${input.citySlug} yet. Share a moment so the next traveler gets a grounded answer.`,
        citations: [],
        mode: 'empty_corpus',
        retrieved: 0,
        grounded: true,
        policy: 'citations_only',
      };
    }

    const lead = hits[0];
    const support = hits.slice(1, 3);

    // Quote-only answer — no invented connective claims about the city
    const lines = [
      `From ${lead.authorName || 'a local'} (“${lead.title}”${lead.neighborhood ? `, ${lead.neighborhood}` : ''}): “${clip(lead.body, 200)}”`,
    ];
    for (const h of support) {
      lines.push(
        `Also: ${h.authorName || 'local'} — “${h.title}”${h.neighborhood ? ` · ${h.neighborhood}` : ''}.`,
      );
    }
    lines.push('Based only on community notes above — not generic guidebook knowledge.');

    return {
      answer: lines.join('\n'),
      citations: toCitations(hits),
      mode: 'rag',
      retrieved: hits.length,
      grounded: true,
      policy: 'citations_only',
    };
  }

  async planJourney(input: {
    citySlug: string;
    cityName?: string;
    days?: number;
    vibe?: string;
    interests?: string[];
    food?: string;
    style?: string;
  }): Promise<RagJourneyResult> {
    const cityName = input.cityName || input.citySlug;
    const interests = input.interests || [];
    const query = [input.vibe, input.style, input.food, ...interests]
      .filter(Boolean)
      .join(' ');

    const hits = await this.retrieve.retrieve({
      citySlug: input.citySlug,
      query: query || 'local quiet food walk evening',
      topK: 8,
    });

    if (!hits.length) {
      return {
        source: 'community_first_demo',
        suggestedStops: [],
        whyByTheme: [],
        citations: [],
        retrieved: 0,
        grounded: true,
        policy: 'citations_only',
      };
    }

    const suggestedStops = hits.slice(0, Math.min(5, hits.length)).map((h) => ({
      title: h.title,
      reason: clip(h.body, 140),
      neighborhood: h.neighborhood,
      why: whyLine(h, cityName),
      citationId: h.id,
    }));

    const themes = groupThemes(hits);

    return {
      source: 'rag',
      suggestedStops,
      whyByTheme: themes,
      citations: toCitations(hits),
      retrieved: hits.length,
      grounded: true,
      policy: 'citations_only',
    };
  }
}

function clip(s: string, n: number) {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function whyLine(h: RetrievedChunk, cityName: string) {
  const who = h.authorName || 'Locals';
  const place = h.neighborhood ? ` near ${h.neighborhood}` : '';
  const age = relativeAge(h.createdAt);
  return `Grounded in ${who}’s note${place} in ${cityName} (${age}). Not model invention.`;
}

function relativeAge(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5;
  if (hours < 24) return 'shared today';
  if (hours < 48) return 'shared yesterday';
  if (hours < 24 * 7) return `shared ${Math.round(hours / 24)}d ago`;
  return `shared ${Math.round(hours / (24 * 7))}w ago`;
}

function toCitations(hits: RetrievedChunk[]): RagCitation[] {
  return hits.map((h) => ({
    id: h.id,
    title: h.title,
    sourceType: h.sourceType,
    authorName: h.authorName,
    neighborhood: h.neighborhood,
    score: Number(h.score.toFixed(4)),
    freshness: Number(h.freshness.toFixed(3)),
  }));
}

function groupThemes(hits: RetrievedChunk[]) {
  const buckets: Record<string, RetrievedChunk[]> = {
    Quiet: [],
    Food: [],
    Walks: [],
  };
  for (const h of hits) {
    const blob = `${h.title} ${h.body} ${h.vibeTags.join(' ')}`.toLowerCase();
    if (/quiet|breathe|soft|reset|sunset|sunrise/.test(blob)) buckets.Quiet.push(h);
    else if (/tea|food|chai|noodle|jalebi|bakery|lunch/.test(blob)) buckets.Food.push(h);
    else if (/walk|lane|street|bazaar|harbor|climb/.test(blob)) buckets.Walks.push(h);
  }
  return Object.entries(buckets)
    .filter(([, list]) => list.length)
    .map(([theme, list]) => ({
      theme,
      summary: `${list.length} cited note${list.length === 1 ? '' : 's'} — e.g. “${list[0].title}” by ${list[0].authorName || 'a local'}.`,
    }));
}
