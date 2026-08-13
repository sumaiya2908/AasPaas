import { Injectable } from '@nestjs/common';
import type { RetrievedChunk } from './rag.types';

/**
 * Second-stage ranking: freshness-heavy for pulse, diversity (MMR),
 * and a hard floor so weak matches never reach the LLM / synthesizer.
 */
@Injectable()
export class RerankService {
  /** Minimum combined score after rerank to keep a hit. */
  readonly minScore = Number(process.env.RAG_MIN_SCORE || 0.18);

  rerank(
    query: string,
    candidates: RetrievedChunk[],
    topK: number,
  ): RetrievedChunk[] {
    if (!candidates.length) return [];

    const rescored = candidates.map((c) => {
      const freshnessBoost = freshnessWeight(c.sourceType, c.freshness);
      const localPulseBoost =
        c.sourceType === 'local_update' && c.freshness > 0.5 ? 0.08 : 0;
      const avoidBoost =
        /\b(avoid|skip|crowd|chaotic|parking)\b/i.test(query) &&
        /\b(avoid|skip|crowd|chaotic|parking)\b/i.test(`${c.title} ${c.body}`)
          ? 0.06
          : 0;

      const score =
        0.38 * c.semantic +
        0.14 * c.keyword +
        0.22 * freshnessBoost +
        0.16 * c.priority +
        0.1 * (c.trust ?? 0.7) +
        localPulseBoost +
        avoidBoost;

      return { ...c, score, freshness: freshnessBoost };
    });

    const filtered = rescored
      .filter((c) => c.score >= this.minScore)
      .sort((a, b) => b.score - a.score);

    return mmrSelect(filtered, topK, 0.7);
  }
}

function freshnessWeight(sourceType: string, rawFreshness: number): number {
  // local_update: very steep — yesterday matters, last month barely
  if (sourceType === 'local_update') {
    return Math.pow(rawFreshness, 0.45);
  }
  // community / moments: prefer recent week
  if (sourceType === 'community' || sourceType === 'moment') {
    return Math.pow(rawFreshness, 0.7);
  }
  // curated / official: slower decay OK
  return Math.pow(Math.max(rawFreshness, 0.35), 0.9);
}

/**
 * Maximal Marginal Relevance — keep relevance while reducing near-duplicate stories.
 */
function mmrSelect(
  ranked: RetrievedChunk[],
  topK: number,
  lambda: number,
): RetrievedChunk[] {
  if (ranked.length <= topK) return ranked;

  const selected: RetrievedChunk[] = [];
  const remaining = [...ranked];

  while (selected.length < topK && remaining.length) {
    let bestIdx = 0;
    let bestVal = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const relevance = cand.score;
      const redundancy = selected.length
        ? Math.max(...selected.map((s) => textOverlap(cand, s)))
        : 0;
      const mmr = lambda * relevance - (1 - lambda) * redundancy;
      if (mmr > bestVal) {
        bestVal = mmr;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected;
}

function textOverlap(a: RetrievedChunk, b: RetrievedChunk): number {
  const ta = new Set(
    `${a.title} ${a.body}`
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 2),
  );
  const tb = new Set(
    `${b.title} ${b.body}`
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 2),
  );
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit++;
  return hit / Math.min(ta.size, tb.size);
}
