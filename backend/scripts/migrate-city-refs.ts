/**
 * Best-effort migration: map legacy slug / free-text homeCityId values
 * onto canonical City.id when a confident match exists.
 *
 * Does NOT invent cities. Unmatched rows are reported, not force-linked.
 *
 * Usage: npx ts-node scripts/migrate-city-refs.ts
 */

import { PrismaClient } from '@prisma/client';
import { normalizeCityName } from '../src/cities/normalize';

const prisma = new PrismaClient();

async function resolveCityId(raw: string | null | undefined) {
  if (!raw) return null;
  const byId = await prisma.city.findUnique({ where: { id: raw } });
  if (byId) return byId.id;
  const bySlug = await prisma.city.findUnique({ where: { slug: raw } });
  if (bySlug) return bySlug.id;
  const n = normalizeCityName(raw);
  const byName = await prisma.city.findFirst({
    where: { normalizedName: n, status: 'ACTIVE' },
  });
  if (byName) return byName.id;
  const alias = await prisma.cityAlias.findFirst({
    where: { normalizedAlias: n },
    include: { city: true },
  });
  if (alias && alias.city.status === 'ACTIVE') return alias.cityId;
  return null;
}

async function main() {
  const profiles = await prisma.userProfile.findMany();
  let updated = 0;
  const unmatched: string[] = [];

  for (const p of profiles) {
    const next = await resolveCityId(p.homeCityId) || await resolveCityId(p.homeCity);
    if (!next) {
      if (p.homeCityId || p.homeCity) unmatched.push(`${p.userId}:${p.homeCityId}/${p.homeCity}`);
      continue;
    }
    if (next !== p.homeCityId) {
      await prisma.userProfile.update({
        where: { id: p.id },
        data: { homeCityId: next },
      });
      updated += 1;
    }
  }

  console.log(JSON.stringify({ updated, unmatched }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
