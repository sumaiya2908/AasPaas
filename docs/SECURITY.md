# AASPAAS — Security & RAG production checklist

## Mobile (App Store)

| Area | Status | Notes |
|------|--------|-------|
| JWT storage | ✅ SecureStore | Keychain / Keystore via `expo-secure-store` — not AsyncStorage |
| Token migration | ✅ | Legacy v5 AsyncStorage token moved once, then cleared |
| Logout wipe | ✅ | `clearAccessToken()` on sign-out / exit-to-sign-in |
| HTTPS API | ⚠️ | Set `EXPO_PUBLIC_API_URL=https://…` in production builds |
| Dev SSO | ⚠️ | `EXPO_PUBLIC_AUTH_DEV_SSO` must be **false** in release |
| OAuth in URL | ⚠️ | Google flow still passes JWT in deep-link `payload` — migrate to one-time code before wide release |
| Account deletion | ❌ | Required for App Store — add API + UI |
| Biometric lock | ❌ | Optional future |

## Backend API

| Area | Status | Notes |
|------|--------|-------|
| JWT secret | ✅ prod guard | Boot fails if weak/missing in `NODE_ENV=production` |
| AUTH_DEV_SSO | ✅ prod guard | Must be `false` in production |
| Helmet | ✅ | HTTP security headers |
| CORS | ✅ | Allowlist via `CORS_ORIGINS` (strict in prod) |
| Rate limiting | ✅ | Global 120/min + tighter RAG query/journey |
| RAG seed/reindex | ✅ | `x-rag-admin-key` header (`RAG_ADMIN_KEY`) |
| RAG query/journey | ✅ public | Rate-limited; citations-only synthesis |
| Post delete → RAG | ✅ | Orphan chunks removed on post delete |

## RAG — grounded answers (no hallucination)

**Policy: `citations_only`**

1. **Retrieve** — pgvector + city scope + freshness
2. **Rerank** — heuristic score floor (`RAG_MIN_SCORE`) + MMR diversity
3. **Synthesize** — **quote-only** template; no LLM generation today
4. **Empty corpus** — honest refusal, `grounded: false`, `confidence: 0`
5. **Eval** — `npm run rag:eval` against golden queries

### Before shipping “Ask a local” widely

- [ ] Run `npm run rag:eval` in CI
- [ ] Use real embeddings (`RAG_EMBEDDING_PROVIDER=openai` or equivalent)
- [ ] Expand golden queries per launch city
- [ ] If adding an LLM later: constrain to retrieved quotes only + citation audit

### Env (production)

```bash
NODE_ENV=production
JWT_SECRET=<32+ random chars>
AUTH_DEV_SSO=false
RAG_ADMIN_KEY=<random>
CORS_ORIGINS=https://api.yourdomain.com
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
EXPO_PUBLIC_AUTH_DEV_SSO=false
```

## Commands

```bash
# RAG eval (grounding + refusal tests)
cd backend && npm run rag:eval

# Seed corpus (admin key required when RAG_ADMIN_KEY set)
RAG_ADMIN_KEY=your-key npm run rag:seed

# Reindex community posts into vectors
RAG_ADMIN_KEY=your-key npm run rag:reindex
```
