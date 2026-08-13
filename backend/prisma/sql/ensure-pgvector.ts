/**
 * Ensure pgvector extension + HNSW index exist (safe to re-run).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
  // HNSW works well for growing corpora; created after table exists via prisma db push
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS rag_chunk_embedding_hnsw
    ON "RagChunk"
    USING hnsw (embedding vector_cosine_ops)
  `);
  console.log('pgvector extension + HNSW index ready');
}

main()
  .catch((e) => {
    // Index may fail if table empty / extension timing — log and continue
    console.warn('pgvector ensure warning:', e?.message || e);
  })
  .finally(() => prisma.$disconnect());
