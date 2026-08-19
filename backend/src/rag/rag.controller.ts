import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { IngestService } from './ingest.service';
import { SynthesizeService } from './synthesize.service';
import { RagJourneyDto, RagQueryDto } from './dto/rag.dto';
import { PrismaService } from '../prisma/prisma.service';
import { isProduction } from '../config/env';

@Controller('rag')
export class RagController {
  constructor(
    private readonly ingest: IngestService,
    private readonly synthesize: SynthesizeService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  @SkipThrottle()
  async health() {
    const count = await this.prisma.ragChunk.count();
    return {
      ok: true,
      chunks: count,
      embeddingProvider: process.env.RAG_EMBEDDING_PROVIDER || 'local',
      policy: 'citations_only',
      ...(isProduction()
        ? {}
        : {
            modelHint:
              process.env.RAG_EMBEDDING_PROVIDER === 'openai'
                ? process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
                : 'local-hash-v1',
          }),
    };
  }

  /** Seed demo community corpus — admin only. */
  @Post('seed')
  @UseGuards(AdminKeyGuard)
  @SkipThrottle()
  seed() {
    return this.ingest.seedDemoCorpus();
  }

  /** Vectorize posts into RagChunk — admin only. */
  @Post('reindex')
  @UseGuards(AdminKeyGuard)
  @SkipThrottle()
  reindex() {
    return this.ingest.reindexPosts();
  }

  /** Grounded Q&A — quotes retrieved community notes only. */
  @Post('query')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  query(@Body() dto: RagQueryDto) {
    return this.synthesize.answerQuery(dto);
  }

  /** Grounded journey stops from retrieved notes. */
  @Post('journey')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  journey(@Body() dto: RagJourneyDto) {
    return this.synthesize.planJourney(dto);
  }
}
