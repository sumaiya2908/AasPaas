import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';
import { pgVectorSql } from './pgvector';
import { createId } from './ids';
import type { IngestChunkInput } from './rag.types';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
  ) {}

  async upsertChunk(input: IngestChunkInput) {
    const textForEmbed = `${input.title}\n${input.body}\n${(input.vibeTags || []).join(' ')}`;
    const { vector, model, dims } = await this.embeddings.embed(textForEmbed);

    const existing = await this.prisma.ragChunk.findUnique({
      where: {
        sourceType_sourceId: {
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
    });

    const title = input.title.trim();
    const body = input.body.trim();
    const neighborhood = input.neighborhood?.trim() || null;
    const vibeTagsJson = JSON.stringify(input.vibeTags ?? []);
    const authorName = input.authorName?.trim() || null;
    const trust = input.trust ?? 0.7;
    const expiresAt = input.expiresAt ?? null;
    const citySlug = input.citySlug;
    const vecSql = pgVectorSql(vector);

    if (existing) {
      await this.prisma.$executeRaw`
        UPDATE "RagChunk"
        SET
          "citySlug" = ${citySlug},
          title = ${title},
          body = ${body},
          neighborhood = ${neighborhood},
          "vibeTagsJson" = ${vibeTagsJson},
          "authorName" = ${authorName},
          trust = ${trust},
          embedding = ${vecSql},
          model = ${model},
          dims = ${dims},
          "expiresAt" = ${expiresAt},
          "updatedAt" = NOW()
        WHERE id = ${existing.id}
      `;
      return { id: existing.id, sourceId: existing.sourceId, model };
    }

    const id = createId();
    await this.prisma.$executeRaw`
      INSERT INTO "RagChunk" (
        id, "citySlug", "sourceType", "sourceId", title, body, neighborhood,
        "vibeTagsJson", "authorName", trust, embedding, model, dims, "expiresAt",
        "createdAt", "updatedAt"
      ) VALUES (
        ${id},
        ${citySlug},
        ${input.sourceType},
        ${input.sourceId},
        ${title},
        ${body},
        ${neighborhood},
        ${vibeTagsJson},
        ${authorName},
        ${trust},
        ${vecSql},
        ${model},
        ${dims},
        ${expiresAt},
        ${input.createdAt ?? new Date()},
        NOW()
      )
    `;

    return { id, sourceId: input.sourceId, model };
  }

  /** Fire-and-forget after post create — never block the write path. */
  ingestPostAsync(post: {
    id: string;
    type: string;
    text: string;
    neighborhood: string | null;
    vibeTagsJson: string;
    expiresAt: Date | null;
    createdAt: Date;
    authorName: string;
    citySlug: string;
  }) {
    void this.upsertChunk({
      citySlug: post.citySlug,
      sourceType: post.type === 'avoid' ? 'local_update' : 'community',
      sourceId: `post:${post.id}`,
      title:
        post.type === 'avoid'
          ? 'Avoid note'
          : post.type === 'question'
            ? 'Local question'
            : 'Community experience',
      body: post.text,
      neighborhood: post.neighborhood,
      vibeTags: JSON.parse(post.vibeTagsJson || '[]') as string[],
      authorName: post.authorName,
      trust: 0.75,
      expiresAt: post.expiresAt,
      createdAt: post.createdAt,
    }).catch((err) => this.logger.warn(`Post ingest failed: ${err}`));
  }

  async seedDemoCorpus() {
    const results = [];
    for (const item of DEMO_CORPUS) {
      results.push(await this.upsertChunk(item));
    }
    return { upserted: results.length };
  }

  /** Backfill: vectorize every visible post into RagChunk. */
  async reindexPosts() {
    const posts = await this.prisma.post.findMany({
      where: { moderation: 'visible' },
      include: {
        author: { select: { name: true } },
        city: { select: { slug: true } },
      },
      take: 500,
    });

    let upserted = 0;
    for (const post of posts) {
      await this.upsertChunk({
        citySlug: post.city.slug,
        sourceType: post.type === 'avoid' ? 'local_update' : 'community',
        sourceId: `post:${post.id}`,
        title:
          post.type === 'avoid'
            ? 'Avoid note'
            : post.type === 'question'
              ? 'Local question'
              : 'Community experience',
        body: post.text,
        neighborhood: post.neighborhood,
        vibeTags: JSON.parse(post.vibeTagsJson || '[]') as string[],
        authorName: post.author.name,
        trust: 0.75,
        expiresAt: post.expiresAt,
        createdAt: post.createdAt,
      });
      upserted += 1;
    }
    return { upserted, scanned: posts.length };
  }
}

const DEMO_CORPUS: IngestChunkInput[] = [
  {
    citySlug: 'jaipur',
    sourceType: 'moment',
    sourceId: 'moment:jm1',
    title: 'After a difficult day',
    body: 'I come here when the Old City has been too loud. The light softens around 6:20, and for twenty minutes the whole pink city feels quiet enough to breathe again. Nahargarh western rampart.',
    neighborhood: 'Nahargarh',
    vibeTags: ['quiet', 'sunset', 'reset'],
    authorName: 'Kabir',
    trust: 0.9,
  },
  {
    citySlug: 'jaipur',
    sourceType: 'moment',
    sourceId: 'moment:jm2',
    title: 'The tea stall locals never leave',
    body: 'Blue canopy, same uncle for years. He doesn’t smile for tourists — he smiles when you order the second cup. Masala chai, standing, watching the silver shops wake up. Second lane off Johari Bazaar.',
    neighborhood: 'Johari Bazaar',
    vibeTags: ['tea', 'local', 'foodie'],
    authorName: 'Meera',
    trust: 0.88,
  },
  {
    citySlug: 'jaipur',
    sourceType: 'moment',
    sourceId: 'moment:jm3',
    title: 'A street that feels magical after rain',
    body: 'When it rains, the pink walls darken and the smell of wet stone mixes with jalebi oil. Walk slowly. The tourist rush thins, and the lanes feel like a secret again. Tripolia Bazaar side lanes.',
    neighborhood: 'Tripolia Bazaar',
    vibeTags: ['rain', 'walk', 'hiddenGem'],
    authorName: 'Ananya',
    trust: 0.85,
  },
  {
    citySlug: 'jaipur',
    sourceType: 'moment',
    sourceId: 'moment:jm4',
    title: 'The noodle corner guides never list',
    body: 'No signboard worth photographing. Just a cart, a wok, and regulars who arrive without checking Google. Ask for less oil if you want it the way locals do. Near Chandpole evening cart.',
    neighborhood: 'Chandpole',
    vibeTags: ['foodie', 'hiddenGem', 'budget'],
    authorName: 'Arjun',
    trust: 0.87,
  },
  {
    citySlug: 'jaipur',
    sourceType: 'local_update',
    sourceId: 'update:jaipur-evening',
    title: 'Evening pulse',
    body: 'Johari side lanes are calmer after 7. Avoid main bazaar parking chaos near City Palace until 8.',
    neighborhood: 'Old City',
    vibeTags: ['tonight', 'avoid', 'local'],
    authorName: 'Pulse',
    trust: 0.8,
  },
  {
    citySlug: 'jaipur',
    sourceType: 'curated_place',
    sourceId: 'place:nahargarh',
    title: 'Nahargarh for soft light',
    body: 'Locals recommend the western rampart for quieter evenings — less postcard, more breath.',
    neighborhood: 'Nahargarh',
    vibeTags: ['quiet', 'sunset'],
    authorName: 'AasPaas',
    trust: 0.7,
  },
  {
    citySlug: 'goa',
    sourceType: 'moment',
    sourceId: 'moment:gm1',
    title: 'Where the evening slows down',
    body: 'After the beach noise, I walk these yellow houses until the light turns gold. There’s a tiny bakery that still smells like butter at 7pm — that’s my reset. Fontainhas quiet lane.',
    neighborhood: 'Fontainhas',
    vibeTags: ['quiet', 'evening', 'walk'],
    authorName: 'Leah',
    trust: 0.9,
  },
  {
    citySlug: 'goa',
    sourceType: 'moment',
    sourceId: 'moment:gm2',
    title: 'A stall that feels like home',
    body: 'Same woman, same steel tumblers, same sweet tea. She remembers faces. That matters more than any café ranking. Mapusa market edge.',
    neighborhood: 'Mapusa',
    vibeTags: ['tea', 'local', 'foodie'],
    authorName: 'Rohan',
    trust: 0.86,
  },
  {
    citySlug: 'kochi',
    sourceType: 'moment',
    sourceId: 'moment:km1',
    title: 'Harbor light after a long day',
    body: 'When Chinese nets silhouette against the sky, the city exhales. Bring nothing. Just walk until the ferries look like floating lanterns. Fort Kochi sea walk.',
    neighborhood: 'Fort Kochi',
    vibeTags: ['quiet', 'sunset', 'walk'],
    authorName: 'Nisha',
    trust: 0.9,
  },
  {
    citySlug: 'hampi',
    sourceType: 'moment',
    sourceId: 'moment:hm1',
    title: 'Sunrise that resets everything',
    body: 'Climb in the dark with a small torch. At the top, the ruins wake pink. I’ve never needed a guidebook after that morning — only quieter days. Matanga Hill.',
    neighborhood: 'Matanga Hill',
    vibeTags: ['sunrise', 'quiet', 'nature'],
    authorName: 'Sana',
    trust: 0.92,
  },
];
