/**
 * GeoNames-derived canonical city import (idempotent).
 *
 * V0 uses a curated seed file with real geoname_ids.
 * Optional: --download cities15000 (future expansion) filtered by CITY_IMPORT_MIN_POPULATION.
 *
 * Usage:
 *   npx ts-node scripts/import-geonames.ts
 *   npx ts-node scripts/import-geonames.ts --min-population=50000
 *
 * Geographic data source: GeoNames (https://www.geonames.org/)
 * License: Creative Commons Attribution 4.0
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import {
  normalizeCityName,
  slugifyCityName,
} from '../src/cities/normalize';

type SeedCity = {
  geonameId: number;
  name: string;
  asciiName: string;
  aliases?: string[];
  state: string;
  stateGeonameId: number;
  country: string;
  iso2: string;
  iso3?: string;
  countryGeonameId: number;
  latitude: number;
  longitude: number;
  population: number;
  timezone?: string;
  status?: string;
};

const prisma = new PrismaClient();

const minPop = Number(
  process.argv.find((a) => a.startsWith('--min-population='))?.split('=')[1] ||
    process.env.CITY_IMPORT_MIN_POPULATION ||
    '0',
);

const stats = {
  countries: 0,
  states: 0,
  cities: 0,
  aliases: 0,
  skippedLowPop: 0,
  skippedDup: 0,
};

async function upsertCountry(c: SeedCity) {
  const row = await prisma.country.upsert({
    where: { geonameId: c.countryGeonameId },
    create: {
      geonameId: c.countryGeonameId,
      name: c.country,
      asciiName: c.country,
      iso2: c.iso2,
      iso3: c.iso3 || null,
    },
    update: {
      name: c.country,
      asciiName: c.country,
      iso2: c.iso2,
      iso3: c.iso3 || null,
    },
  });
  stats.countries += 1;
  return row;
}

async function upsertState(c: SeedCity, countryId: string) {
  const row = await prisma.adminRegion.upsert({
    where: { geonameId: c.stateGeonameId },
    create: {
      geonameId: c.stateGeonameId,
      countryId,
      name: c.state,
      asciiName: c.state,
      latitude: c.latitude,
      longitude: c.longitude,
    },
    update: {
      countryId,
      name: c.state,
      asciiName: c.state,
    },
  });
  stats.states += 1;
  return row;
}

async function upsertCity(c: SeedCity, countryId: string, stateId: string) {
  if (c.population < minPop) {
    stats.skippedLowPop += 1;
    return null;
  }

  const ascii = c.asciiName || c.name;
  const baseSlug = slugifyCityName(ascii);
  // Disambiguate same names across countries (Paris FR vs Paris TX)
  const slug = `${baseSlug}-${c.iso2.toLowerCase()}${
    c.state ? `-${slugifyCityName(c.state).slice(0, 12)}` : ''
  }`.replace(/-+/g, '-');

  // Prefer known experience slugs for core India hubs
  const experienceSlugMap: Record<number, string> = {
    1269515: 'jaipur',
    1270396: 'goa',
    1265873: 'kochi',
    1270101: 'hampi',
  };
  const finalSlug = experienceSlugMap[c.geonameId] || slug;

  const existingByGeo = await prisma.city.findUnique({
    where: { geonameId: c.geonameId },
  });
  const existingBySlug = await prisma.city.findUnique({
    where: { slug: finalSlug },
  });

  const data = {
    geonameId: c.geonameId,
    slug: finalSlug,
    name: c.name,
    asciiName: ascii,
    normalizedName: normalizeCityName(ascii),
    state: c.state,
    country: c.country,
    countryId,
    stateId,
    latitude: c.latitude,
    longitude: c.longitude,
    population: c.population,
    timezone: c.timezone || null,
    featureClass: 'P',
    featureCode: 'PPLA',
    status: c.status || 'ACTIVE',
    moodJson: JSON.stringify(['Local', 'Discovering']),
    briefing: `${c.name} is ready to explore. Community pulse will fill in as locals share what’s happening.`,
  };

  let city;
  if (existingByGeo) {
    city = await prisma.city.update({
      where: { id: existingByGeo.id },
      data: { ...data, slug: existingByGeo.slug },
    });
    stats.skippedDup += 1;
  } else if (existingBySlug) {
    city = await prisma.city.update({
      where: { id: existingBySlug.id },
      data,
    });
    stats.skippedDup += 1;
  } else {
    city = await prisma.city.create({ data });
    stats.cities += 1;
  }

  const aliases = new Set<string>([
    c.name,
    ascii,
    ...(c.aliases || []),
  ]);
  for (const alias of aliases) {
    const normalizedAlias = normalizeCityName(alias);
    if (!normalizedAlias) continue;
    await prisma.cityAlias.upsert({
      where: {
        cityId_normalizedAlias: {
          cityId: city.id,
          normalizedAlias,
        },
      },
      create: {
        cityId: city.id,
        alias,
        normalizedAlias,
        source: 'geonames',
      },
      update: { alias },
    });
    stats.aliases += 1;
  }

  return city;
}

async function main() {
  const seedPath = path.join(
    __dirname,
    '../data/geonames/canonical-cities.seed.json',
  );
  const raw = fs.readFileSync(seedPath, 'utf8');
  const cities = JSON.parse(raw) as SeedCity[];

  console.log(
    `Importing ${cities.length} GeoNames-derived cities (min population=${minPop})…`,
  );

  for (const c of cities) {
    const country = await upsertCountry(c);
    const state = await upsertState(c, country.id);
    await upsertCity(c, country.id, state.id);
  }

  console.log('Import complete:');
  console.log(JSON.stringify(stats, null, 2));
  console.log(
    'Source: GeoNames (https://www.geonames.org/) — CC BY 4.0. AASPAAS stores normalized copies.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
