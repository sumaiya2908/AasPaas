/**
 * pgvector helpers — Prisma can't write Unsupported("vector") via normal create/update.
 */

import { Prisma } from '@prisma/client';
import { LOCAL_EMBED_DIMS } from './embedding.util';

export const RAG_VECTOR_DIMS = Number(
  process.env.RAG_VECTOR_DIMS || LOCAL_EMBED_DIMS || 384,
);

/** Format a JS float array as a pgvector literal: [0.1,0.2,...] */
export function toPgVectorLiteral(vector: number[]): string {
  if (vector.length !== RAG_VECTOR_DIMS) {
    throw new Error(
      `Embedding dims ${vector.length} != RAG_VECTOR_DIMS ${RAG_VECTOR_DIMS}`,
    );
  }
  return `[${vector.map((v) => Number(v).toFixed(8)).join(',')}]`;
}

/** Safe SQL fragment: '[...]'::vector */
export function pgVectorSql(vector: number[]): Prisma.Sql {
  const lit = toPgVectorLiteral(vector).replace(/'/g, '');
  return Prisma.raw(`'${lit}'::vector`);
}
