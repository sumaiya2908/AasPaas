# AASPAAS RAG Architecture

Community-first retrieval. The model never invents a city’s vibe — it only synthesizes from retrieved community knowledge.

## Goals

1. Ground journey “why” lines and Ask answers in real local content
2. Prefer **fresh** community signals over stale guidebook text
3. **Rerank + diversity** so the latest / most relevant notes surface
4. **Citations-only** synthesis to cut hallucination
5. Stay on **PostgreSQL + pgvector** locally and in production (same stack)

## What gets vectorized?

| Data | Auto-vectorized? |
|------|------------------|
| New **posts** (experience / question / avoid) | Yes — on create (async ingest → embed → `RagChunk`) |
| Demo **moments / pulse** | Yes — `POST /api/rag/seed` |
| Existing posts already in DB | Run `POST /api/rag/reindex` |
| Raw `City` / `User` rows | No — not knowledge content |
| Saves / journeys | No — personal state, not corpus |

**Rule:** only content that should answer travelers is embedded. Pushing a post → it is vectorized. Pushing unrelated tables → not.

## Which DB stores vectors?

| Environment | Database | Vectors |
|-------------|----------|---------|
| **Local + production** | **PostgreSQL + pgvector** | `RagChunk.embedding vector(384)` |

There is **no SQLite vector store** and **no separate Pinecone/Weaviate**.

Local (Docker preferred — same image as production):

```bash
docker compose up -d postgres
cd backend && npm run db:setup
```

Without Docker: Homebrew `postgresql` + `brew install pgvector`, create DB/role `aaspaas`/`aaspaas`, then `npm run db:setup` with the same `DATABASE_URL`.

Embeddings:

- **Default:** `local-hash-v1` (384-d) — no API key
- **Optional:** OpenAI `text-embedding-3-small` with `dimensions: 384` when `RAG_EMBEDDING_PROVIDER=openai`

Retrieval uses pgvector cosine distance (`<=>`), then app-side rerank (freshness / MMR).

## Pipeline

```
Content created (post / moment / place / local update)
        ↓
   Ingest (chunk + metadata)
        ↓
   Embed (async; never blocks the write path)
        ↓
   Vector store (PostgreSQL + pgvector)
        ↓
Query (city + intent + prefs)
        ↓
   Retrieve (city filter → semantic + keyword shortlist)
        ↓
   Rerank (freshness + source priority + MMR diversity + min score)
        ↓
   Synthesize (citations-only; refuse if corpus empty / below floor)
        ↓
   Response + citations + grounded:true
```

## Knowledge priority

| Rank | Source type        | Use |
|------|--------------------|-----|
| 1    | `local_update`     | Today’s pulse (steep freshness half-life ~36h) |
| 2    | `community` / moment | Experiences, avoids, Q&A (~7d half-life) |
| 3    | `curated_place`    | Seeded place notes (~30d) |
| 4    | `official`         | Rare, low weight |
| 5    | LLM world knowledge| **Never used as evidence** |

## Anti-hallucination policy

1. **City hard-filter** — never pull another city’s notes
2. **Score floor** (`RAG_MIN_SCORE`, default `0.18`) — weak matches dropped
3. **Rerank** boosts fresh local_update + keyword intent (e.g. avoid)
4. **MMR** reduces near-duplicate stories in the top-K
5. **Citations-only answers** — synthesizer quotes chunk text; sets `grounded: true`, `policy: "citations_only"`
6. Empty / low corpus → honest “not enough community notes” (no invented places)

When an LLM is plugged in later, it may **only** see retrieved snippets + citation IDs — never free browse of the DB or the open web.

## APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/rag/health` | Chunk count + embedding provider |
| `POST /api/rag/seed` | Seed demo moments |
| `POST /api/rag/reindex` | Vectorize all existing posts |
| `POST /api/rag/query` | Grounded Ask answer |
| `POST /api/rag/journey` | Stops + why from retrieval |

## Production upgrade path

1. Prisma → PostgreSQL + pgvector
2. `OPENAI_API_KEY` + `RAG_EMBEDDING_PROVIDER=openai`
3. BullMQ job for embed on write
4. Optional cross-encoder rerank model
5. Redis cache for hot city queries

## Non-goals (v1)

- Fine-tuned travel model
- Map / GPS ranking
- Cross-city retrieval without explicit city
