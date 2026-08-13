# AasPaas API

NestJS + Prisma on **PostgreSQL + pgvector** (same as production). JWT auth; cities and posts are first-class.

## Setup

```bash
# Prefer Docker (matches production image)
cd .. && docker compose up -d postgres

# Or Homebrew Postgres + `brew install pgvector` with DATABASE_URL pointing at local aaspaas DB

cd backend
npm install
npm run db:setup   # prisma generate + db push + pgvector index + seed
npm run start:dev
```

API: `http://localhost:3001/api`

Default `DATABASE_URL`:

```
postgresql://aaspaas:aaspaas@localhost:5432/aaspaas?schema=public
```

After the API is up, seed RAG chunks:

```bash
npm run rag:seed
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | Health check |
| POST | `/auth/register` | — | `{ name, email, password }` |
| POST | `/auth/login` | — | `{ email, password }` |
| GET | `/auth/me` | JWT | Current user + profile |
| PATCH | `/users/me/profile` | JWT | Save home city, interests, style |
| GET | `/cities/search?q=` | — | Canonical city search |
| GET | `/cities` | — | List cities |
| GET | `/cities/:idOrSlug` | — | City detail |
| GET | `/posts?cityId=&type=` | — | List posts |
| POST | `/posts` | JWT | Create experience / question / avoid |
| DELETE | `/posts/:id` | JWT | Delete own post |
| POST | `/rag/seed` | — | Seed demo RAG corpus |
| POST | `/rag/query` | — | Retrieve + synthesize |

## Mobile

The Expo app resolves the API host automatically (Android emulator → `10.0.2.2`, LAN IP for devices). Override with:

```bash
EXPO_PUBLIC_API_URL=http://YOUR_IP:3001/api
```
