import { Body, Controller, Get, Post } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { SynthesizeService } from './synthesize.service';
import { RagJourneyDto, RagQueryDto } from './dto/rag.dto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('rag')
export class RagController {
  constructor(
    private readonly ingest: IngestService,
    private readonly synthesize: SynthesizeService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  async health() {
    const count = await this.prisma.ragChunk.count();
    return {
      ok: true,
      chunks: count,
      embeddingProvider: process.env.RAG_EMBEDDING_PROVIDER || 'local',
      modelHint:
        process.env.RAG_EMBEDDING_PROVIDER === 'openai'
          ? process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
          : 'local-hash-v1',
    };
  }

  /** Seed demo community corpus (moments + pulse). Idempotent. */
  @Post('seed')
  seed() {
    return this.ingest.seedDemoCorpus();
  }

  /** Vectorize all existing posts into RagChunk (backfill). */
  @Post('reindex')
  reindex() {
    return this.ingest.reindexPosts();
  }

  @Post('query')
  query(@Body() dto: RagQueryDto) {
    return this.synthesize.answerQuery(dto);
  }

  @Post('journey')
  journey(@Body() dto: RagJourneyDto) {
    return this.synthesize.planJourney(dto);
  }
}
