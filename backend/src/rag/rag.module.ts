import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { IngestService } from './ingest.service';
import { RetrieveService } from './retrieve.service';
import { RerankService } from './rerank.service';
import { SynthesizeService } from './synthesize.service';
import { RagController } from './rag.controller';

@Module({
  providers: [
    EmbeddingService,
    IngestService,
    RetrieveService,
    RerankService,
    SynthesizeService,
  ],
  controllers: [RagController],
  exports: [IngestService, RetrieveService, SynthesizeService],
})
export class RagModule {}
