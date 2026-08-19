/**
 * RAG eval harness — golden queries, citation checks, refusal tests.
 *
 * Usage:
 *   npm run rag:eval
 *   API_URL=http://127.0.0.1:3001/api npm run rag:eval
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

type GoldenQuery = {
  id: string;
  citySlug: string;
  query: string;
  minCitations?: number;
  mustNotBeEmpty?: boolean;
  expectMode?: 'empty_corpus' | 'rag';
  forbiddenAnswerPatterns?: string[];
};

const API = (process.env.API_URL || 'http://127.0.0.1:3001/api').replace(/\/$/, '');
const goldenPath = path.join(__dirname, '../data/rag/golden-queries.json');
const cases: GoldenQuery[] = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

async function runCase(c: GoldenQuery) {
  const res = await fetch(`${API}/rag/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ citySlug: c.citySlug, query: c.query, topK: 5 }),
  });
  if (!res.ok) {
    return { id: c.id, ok: false, error: `HTTP ${res.status}` };
  }
  const body = (await res.json()) as {
    mode: string;
    citations: unknown[];
    answer: string;
    grounded: boolean;
    retrieved: number;
  };

  const errors: string[] = [];

  if (c.expectMode && body.mode !== c.expectMode) {
    errors.push(`expected mode ${c.expectMode}, got ${body.mode}`);
  }
  if (c.mustNotBeEmpty && body.mode === 'empty_corpus') {
    errors.push('expected citations but got empty_corpus');
  }
  if ((c.minCitations ?? 0) > body.citations.length) {
    errors.push(`expected ≥${c.minCitations} citations, got ${body.citations.length}`);
  }
  if (body.mode === 'rag' && !body.grounded) {
    errors.push('rag mode must be grounded=true');
  }
  if (body.mode === 'empty_corpus' && body.grounded) {
    errors.push('empty_corpus must be grounded=false');
  }
  for (const pat of c.forbiddenAnswerPatterns || []) {
    if (new RegExp(pat, 'i').test(body.answer)) {
      errors.push(`forbidden pattern in answer: ${pat}`);
    }
  }
  if (body.mode === 'rag' && body.citations.length === 0) {
    errors.push('rag mode requires citations');
  }

  return {
    id: c.id,
    ok: errors.length === 0,
    mode: body.mode,
    citations: body.citations.length,
    retrieved: body.retrieved,
    errors,
  };
}

async function main() {
  console.log(`rag:eval — ${cases.length} cases against ${API}\n`);
  let passed = 0;
  for (const c of cases) {
    const result = await runCase(c);
    if (result.ok) {
      passed += 1;
      console.log(`✓ ${result.id} (${result.mode}, ${result.citations} citations)`);
    } else {
      console.log(`✗ ${result.id}`);
      console.log(`  ${result.errors?.join('\n  ') || result.error}`);
    }
  }
  console.log(`\n${passed}/${cases.length} passed`);
  if (passed < cases.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
