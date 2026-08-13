/**
 * Import all India cities/towns from GeoNames country dump (IN.zip).
 *
 * Source: https://www.geonames.org/ — CC BY 4.0
 *
 * Usage:
 *   npx ts-node scripts/import-india-geonames.ts
 *   npx ts-node scripts/import-india-geonames.ts --min-population=0
 *   npx ts-node scripts/import-india-geonames.ts --force-download
 *
 * Feature codes imported (populated places):
 *   PPLC, PPLA, PPLA2, PPLA3, PPLA4, PPL, PPLS, PPLG, STLMT
 * Excludes section/abandoned codes (PPLX, PPLQ, PPLW, …).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import {
  normalizeCityName,
  slugifyCityName,
} from '../src/cities/normalize';

const prisma = new PrismaClient();

const DATA_DIR = path.join(__dirname, '../data/geonames/download');
const IN_ZIP = path.join(DATA_DIR, 'IN.zip');
const IN_TXT = path.join(DATA_DIR, 'IN.txt');
const ADMIN1_TXT = path.join(DATA_DIR, 'admin1CodesASCII.txt');

const DUMP_URL = 'https://download.geonames.org/export/dump/IN.zip';
const ADMIN1_URL =
  'https://download.geonames.org/export/dump/admin1CodesASCII.txt';

const INDIA = {
  geonameId: 1269750,
  name: 'India',
  iso2: 'IN',
  iso3: 'IND',
};

/** Populated-place feature codes we treat as cities/towns. */
const PLACE_CODES = new Set([
  'PPLC',
  'PPLA',
  'PPLA2',
  'PPLA3',
  'PPLA4',
  'PPL',
  'PPLS',
  'PPLG',
  'STLMT',
]);

const minPop = Number(
  process.argv.find((a) => a.startsWith('--min-population='))?.split('=')[1] ||
    process.env.CITY_IMPORT_MIN_POPULATION ||
    '0',
);
const forceDownload = process.argv.includes('--force-download');

const stats = {
  rowsSeen: 0,
  placesMatched: 0,
  citiesCreated: 0,
  citiesUpdated: 0,
  aliases: 0,
  skippedLowPop: 0,
  skippedNoAdmin: 0,
  states: 0,
};

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          file.close();
          fs.unlinkSync(dest);
          download(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download failed ${url}: HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      })
      .on('error', (err) => {
        try {
          fs.unlinkSync(dest);
        } catch {
          /* ignore */
        }
        reject(err);
      });
  });
}

async function ensureDumps() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (forceDownload || !fs.existsSync(ADMIN1_TXT)) {
    console.log('Downloading admin1CodesASCII.txt…');
    await download(ADMIN1_URL, ADMIN1_TXT);
  }

  if (forceDownload || !fs.existsSync(IN_TXT)) {
    console.log('Downloading IN.zip (GeoNames India dump)…');
    await download(DUMP_URL, IN_ZIP);
    console.log('Extracting IN.txt…');
    execSync(`unzip -o "${IN_ZIP}" IN.txt -d "${DATA_DIR}"`, {
      stdio: 'inherit',
    });
  }

  if (!fs.existsSync(IN_TXT)) {
    throw new Error(`Missing ${IN_TXT} after download/extract`);
  }
}

type Admin1 = { code: string; name: string; geonameId: number };

function loadAdmin1(): Map<string, Admin1> {
  const map = new Map<string, Admin1>();
  const lines = fs.readFileSync(ADMIN1_TXT, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.startsWith('IN.')) continue;
    const [code, name, , geonameIdStr] = line.split('\t');
    const geonameId = Number(geonameIdStr);
    if (!code || !name || !Number.isFinite(geonameId)) continue;
    map.set(code.replace('IN.', ''), {
      code,
      name,
      geonameId,
    });
  }
  return map;
}

async function upsertIndiaCountry() {
  return prisma.country.upsert({
    where: { geonameId: INDIA.geonameId },
    create: {
      geonameId: INDIA.geonameId,
      name: INDIA.name,
      asciiName: INDIA.name,
      iso2: INDIA.iso2,
      iso3: INDIA.iso3,
    },
    update: {
      name: INDIA.name,
      asciiName: INDIA.name,
      iso2: INDIA.iso2,
      iso3: INDIA.iso3,
    },
  });
}

async function upsertState(
  admin: Admin1,
  countryId: string,
  lat: number,
  lng: number,
) {
  const row = await prisma.adminRegion.upsert({
    where: { geonameId: admin.geonameId },
    create: {
      geonameId: admin.geonameId,
      countryId,
      name: admin.name,
      asciiName: admin.name,
      latitude: lat,
      longitude: lng,
    },
    update: {
      countryId,
      name: admin.name,
      asciiName: admin.name,
    },
  });
  stats.states += 1;
  return row;
}

function buildSlug(ascii: string, stateName: string, geonameId: number) {
  const base = slugifyCityName(ascii);
  const statePart = slugifyCityName(stateName).slice(0, 16);
  // Always include geonameId for uniqueness across India scale
  return `${base}-in-${statePart}-${geonameId}`.replace(/-+/g, '-');
}

/** Keep short experience slugs for curated hubs if they already exist. */
const PRESERVE_SLUG_BY_GEONAME: Record<number, string> = {
  1269515: 'jaipur',
  1270396: 'goa',
  1265873: 'kochi',
  1270101: 'hampi',
};

async function upsertPlace(input: {
  geonameId: number;
  name: string;
  asciiName: string;
  aliases: string[];
  stateName: string;
  stateGeonameId: number;
  countryId: string;
  stateId: string;
  latitude: number;
  longitude: number;
  population: number;
  timezone: string | null;
  featureCode: string;
}) {
  const ascii = input.asciiName || input.name;
  const preferred = PRESERVE_SLUG_BY_GEONAME[input.geonameId];
  const slug =
    preferred || buildSlug(ascii, input.stateName, input.geonameId);

  const existingByGeo = await prisma.city.findUnique({
    where: { geonameId: input.geonameId },
  });

  const data = {
    geonameId: input.geonameId,
    name: input.name,
    asciiName: ascii,
    normalizedName: normalizeCityName(ascii),
    state: input.stateName,
    country: INDIA.name,
    countryId: input.countryId,
    stateId: input.stateId,
    latitude: input.latitude,
    longitude: input.longitude,
    population: input.population,
    timezone: input.timezone,
    featureClass: 'P',
    featureCode: input.featureCode,
    status: 'ACTIVE',
    moodJson: JSON.stringify(['Local', 'Discovering']),
    briefing: `${input.name} is ready to explore. Community pulse will fill in as locals share what’s happening.`,
  };

  let city;
  if (existingByGeo) {
    city = await prisma.city.update({
      where: { id: existingByGeo.id },
      data: {
        ...data,
        // Preserve existing slug (esp. curated hubs)
        slug: existingByGeo.slug,
      },
    });
    stats.citiesUpdated += 1;
  } else {
    const slugTaken = await prisma.city.findUnique({ where: { slug } });
    const finalSlug = slugTaken
      ? `${slug}-${input.geonameId}`.replace(/-+/g, '-')
      : slug;
    city = await prisma.city.create({
      data: { ...data, slug: finalSlug },
    });
    stats.citiesCreated += 1;
  }

  const aliases = new Set<string>([
    input.name,
    ascii,
    ...input.aliases,
  ]);

  for (const alias of aliases) {
    const normalizedAlias = normalizeCityName(alias);
    if (!normalizedAlias || normalizedAlias.length < 2) continue;
    try {
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
    } catch {
      // rare unique races — skip
    }
  }
}

async function main() {
  console.log(
    `India GeoNames import (min population=${minPop}, place codes=${[
      ...PLACE_CODES,
    ].join(',')})…`,
  );
  await ensureDumps();

  const admin1 = loadAdmin1();
  console.log(`Loaded ${admin1.size} India admin1 regions`);

  const country = await upsertIndiaCountry();
  const stateCache = new Map<string, { id: string; name: string; geonameId: number }>();

  const stream = fs.readFileSync(IN_TXT, 'utf8').split('\n');
  console.log(`Parsing ${stream.length.toLocaleString()} GeoNames rows…`);

  for (const line of stream) {
    if (!line.trim()) continue;
    stats.rowsSeen += 1;

    const cols = line.split('\t');
    // geonameid, name, asciiname, alternatenames, lat, lng, fclass, fcode, country, cc2, admin1, admin2, admin3, admin4, population, elevation, dem, timezone, mod
    const geonameId = Number(cols[0]);
    const name = cols[1];
    const asciiName = cols[2] || name;
    const alternatenames = cols[3] || '';
    const latitude = Number(cols[4]);
    const longitude = Number(cols[5]);
    const featureClass = cols[6];
    const featureCode = cols[7];
    const countryCode = cols[8];
    const admin1Code = cols[10];
    const population = Number(cols[14] || 0);
    const timezone = cols[17] || null;

    if (countryCode !== 'IN') continue;
    if (featureClass !== 'P') continue;
    if (!PLACE_CODES.has(featureCode)) continue;
    if (!Number.isFinite(geonameId) || !name) continue;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    stats.placesMatched += 1;

    if (population < minPop) {
      stats.skippedLowPop += 1;
      continue;
    }

    const admin = admin1.get(admin1Code);
    if (!admin) {
      stats.skippedNoAdmin += 1;
      continue;
    }

    let state = stateCache.get(admin1Code);
    if (!state) {
      const row = await upsertState(admin, country.id, latitude, longitude);
      state = { id: row.id, name: admin.name, geonameId: admin.geonameId };
      stateCache.set(admin1Code, state);
    }

    const aliases = alternatenames
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a.length >= 2 && a.length <= 80)
      .slice(0, 12);

    await upsertPlace({
      geonameId,
      name,
      asciiName,
      aliases,
      stateName: state.name,
      stateGeonameId: state.geonameId,
      countryId: country.id,
      stateId: state.id,
      latitude,
      longitude,
      population: Number.isFinite(population) ? population : 0,
      timezone,
      featureCode,
    });

    if ((stats.citiesCreated + stats.citiesUpdated) % 500 === 0) {
      console.log(
        `… ${stats.citiesCreated + stats.citiesUpdated} cities written (created=${stats.citiesCreated}, updated=${stats.citiesUpdated})`,
      );
    }
  }

  const total = await prisma.city.count({
    where: { country: 'India', status: 'ACTIVE' },
  });

  console.log('\nImport complete:');
  console.log(JSON.stringify({ ...stats, activeIndiaCities: total }, null, 2));
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
