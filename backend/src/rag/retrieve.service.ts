import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { RerankService } from './rerank.service';
import { keywordOverlap } from './embedding.util';
import { pgVectorSql } from './pgvector';
import { SOURCE_PRIORITY, type RetrievedChunk } from './rag.types';

type VectorHit = {
  id: string;
  citySlug: string;
  sourceType: string;
  sourceId: string;
  title: string;
  body: string;
  neighborhood: string | null;
  authorName: string | null;
  vibeTagsJson: string;
  trust: number;
  createdAt: Date;
  semantic: number;
};

@Injectable()
export class RetrieveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
    private readonly rerank: RerankService,
  ) {}

  async retrieve(input: {
    citySlug: string;
    query: string;
    topK?: number;
    sourceTypes?: string[];
    candidateK?: number;
  }): Promise<RetrievedChunk[]> {
    const topK = input.topK ?? 6;
    const candidateK = input.candidateK ?? Math.max(24, topK * 4);
    const now = new Date();
    const citySlug = await this.resolveCitySlug(input.citySlug);
    const { vector: qVec } = await this.embeddings.embed(input.query);
    const vecSql = pgVectorSql(qVec);

    const typeFilter =
      input.sourceTypes?.length && input.sourceTypes.length > 0
        ? Prisma.sql`AND "sourceType" IN (${Prisma.join(input.sourceTypes)})`
        : Prisma.empty;

    // pgvector cosine distance <=> ; similarity = 1 - distance
    const rows = await this.prisma.$queryRaw<VectorHit[]>`
      SELECT
        id,
        "citySlug",
        "sourceType",
        "sourceId",
        title,
        body,
        neighborhood,
        "authorName",
        "vibeTagsJson",
        trust,
        "createdAt",
        (1 - (embedding <=> ${vecSql}))::float8 AS semantic
      FROM "RagChunk"
      WHERE "citySlug" = ${citySlug}
        AND embedding IS NOT NULL
        AND ("expiresAt" IS NULL OR "expiresAt" > ${now})
        ${typeFilter}
      ORDER BY embedding <=> ${vecSql}
      LIMIT ${candidateK}
    `;

    const candidates: RetrievedChunk[] = rows.map((row) => {
      const keyword = keywordOverlap(
        input.query,
        `${row.title} ${row.body} ${(JSON.parse(row.vibeTagsJson || '[]') as string[]).join(' ')}`,
      );
      const priority = SOURCE_PRIORITY[row.sourceType] ?? 0.4;
      const ageHours =
        (now.getTime() - new Date(row.createdAt).getTime()) / (1000 * 60 * 60);
      const halfLifeHours =
        row.sourceType === 'local_update'
          ? 36
          : row.sourceType === 'community' || row.sourceType === 'moment'
            ? 24 * 7
            : 24 * 30;
      const freshness = Math.exp((-Math.LN2 * ageHours) / halfLifeHours);
      const semantic = Number(row.semantic) || 0;
      const score =
        0.55 * semantic +
        0.2 * keyword +
        0.15 * priority +
        0.1 * freshness * row.trust;

      return {
        id: row.id,
        citySlug: row.citySlug,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        title: row.title,
        body: row.body,
        neighborhood: row.neighborhood,
        authorName: row.authorName,
        vibeTags: JSON.parse(row.vibeTagsJson || '[]') as string[],
        trust: row.trust,
        score,
        semantic,
        keyword,
        priority,
        freshness,
        createdAt: new Date(row.createdAt).toISOString(),
      };
    });

    return this.rerank.rerank(input.query, candidates, topK);
  }

  /** Accept slug, cuid, or plain name → canonical citySlug used on RagChunk. */
  private async resolveCitySlug(raw: string): Promise<string> {
    const key = raw.trim();
    if (!key) return key;

    const byIdOrSlug = await this.prisma.city.findFirst({
      where: {
        OR: [{ id: key }, { slug: key }],
      },
      select: { slug: true },
    });
    if (byIdOrSlug) return byIdOrSlug.slug;

    const byName = await this.prisma.city.findFirst({
      where: {
        name: { equals: key, mode: 'insensitive' },
        status: 'ACTIVE',
      },
      orderBy: [{ population: 'desc' }],
      select: { slug: true },
    });
    return byName?.slug ?? key;
  }
}
