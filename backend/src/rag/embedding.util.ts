/**
 * Local hashed bag-of-words embeddings — no API key required.
 * Swap for OpenAI via EmbeddingProvider; vectors always land in pgvector.
 */

export const LOCAL_EMBED_DIMS = 384;
export const LOCAL_EMBED_MODEL = 'local-hash-v1';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function hashToken(token: string, dims: number): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % dims;
}

function signToken(token: string): number {
  let h = 0;
  for (let i = 0; i < token.length; i++) h = (h * 31 + token.charCodeAt(i)) | 0;
  return h & 1 ? 1 : -1;
}

export function embedLocal(text: string, dims = LOCAL_EMBED_DIMS): number[] {
  const vec = new Array<number>(dims).fill(0);
  const tokens = tokenize(text);
  if (!tokens.length) return vec;

  for (const t of tokens) {
    const i = hashToken(t, dims);
    vec[i] += signToken(t);
  }
  return l2Normalize(vec);
}

export function l2Normalize(vec: number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

export function keywordOverlap(query: string, body: string): number {
  const q = new Set(tokenize(query));
  const b = new Set(tokenize(body));
  if (!q.size || !b.size) return 0;
  let hit = 0;
  for (const t of q) if (b.has(t)) hit++;
  return hit / q.size;
}
