# AASPAAS — Security & RAG production checklist

## Mobile (App Store)

| Area | Status | Notes |
|------|--------|-------|
| JWT storage | ✅ SecureStore | Keychain / Keystore via `expo-secure-store` — not AsyncStorage |
| Session persistence | ✅ | User + profile in AsyncStorage; JWT in SecureStore — **closing the app does not log you out** |
| Cold-start validation | ✅ | `bootstrapSession()` calls `/auth/me` before routing |
| 401 handling | ✅ | Invalid/expired JWT clears session and returns to Welcome |
| Token migration | ✅ | Legacy v5 AsyncStorage token moved once, then cleared |
| Logout wipe | ✅ | `clearSessionTokens()` on sign-out / exit-to-sign-in |
| Sign out UI | ✅ | Saved tab → Account section |
| HTTPS API | ⚠️ | Set `EXPO_PUBLIC_API_URL=https://…` in production builds |
| Dev SSO | ⚠️ | `EXPO_PUBLIC_AUTH_DEV_SSO` must be **false** in release |
| OAuth in URL | ✅ | One-time `code` → `POST /auth/exchange` (legacy `payload` fallback in app) |
| Refresh tokens | ✅ | Rotating refresh tokens in SecureStore; auto-refresh on 401 |
| Account deletion | ✅ | `DELETE /users/me` + Saved tab UI |
| Biometric lock | ❌ | Optional future |

## Backend API — Auth

| Area | Status | Notes |
|------|--------|-------|
| Email register/login | ✅ | bcrypt, validation, conflict handling |
| Google SSO | ✅ | Server-side code exchange + tokeninfo verification |
| Apple SSO | ⚠️ | Issuer/aud/exp checked; full JWKS signature verify recommended for prod |
| Auth rate limit | ✅ | 15 req/min per IP on `/auth/*` (`AUTH_RATE_LIMIT_PER_MIN`) |
| OAuth redirect allowlist | ✅ | `aaspaas://`, dev `exp://127.0.0.1`, optional `OAUTH_APP_REDIRECT_ALLOWLIST` |
| OAuth exchange | ✅ | `POST /auth/exchange` — 2 min one-time code, no JWT in deep link |
| Refresh tokens | ✅ | `POST /auth/refresh`, `POST /auth/logout`; 90-day rotation |
| Account deletion | ✅ | `DELETE /users/me` — cascades profile, saves, posts, tokens |
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
JWT_ACCESS_EXPIRES_IN=7d
JWT_REFRESH_DAYS=90
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
