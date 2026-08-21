#!/usr/bin/env node
/**
 * Production boot: ensure pgvector (best-effort) then sync Prisma schema.
 * Safe to re-run on every Render start.
 */
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
    console.log('pgvector extension ok');
  } catch (e) {
    console.warn(
      'pgvector extension skipped:',
      e?.message || e,
      '(RAG vectors may fail until extension is available)',
    );
  } finally {
    await prisma.$disconnect();
  }

  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
}

main().catch((e) => {
  console.error('DB bootstrap failed:', e);
  process.exit(1);
});
