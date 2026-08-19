/**
 * Simulated community for demos, scale tests, and RAG eval.
 *
 * Tag: User.isSimulated = true
 * Email: sim.{n}@aaspaas.sim
 * Provider: sim
 *
 * Usage:
 *   npm run sim:up
 *   SIM_USERS=1000 npm run sim:up
 *   SIM_USERS=5000 SIM_POSTS_PER_USER=2 npm run sim:up
 *   SIM_INGEST_RAG=1 npm run sim:up   # also embed posts for AI testing
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USER_COUNT = Math.min(
  Math.max(Number(process.env.SIM_USERS || 5000), 1),
  20000,
);
const POSTS_PER_USER = Math.min(
  Math.max(Number(process.env.SIM_POSTS_PER_USER || 2), 0),
  8,
);
const CITY_POOL = Math.min(
  Math.max(Number(process.env.SIM_CITY_POOL || 400), 50),
  2000,
);
const INGEST_RAG = process.env.SIM_INGEST_RAG === '1';
const BATCH = 200;

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Kabir', 'Ananya', 'Aadhya',
  'Diya', 'Saanvi', 'Myra', 'Aarohi', 'Anika', 'Pari', 'Navya', 'Ira',
  'Kiara', 'Meera', 'Priya', 'Neha', 'Riya', 'Isha', 'Kavya', 'Rohan',
  'Rahul', 'Amit', 'Sneha', 'Pooja', 'Nikhil', 'Dev', 'Tara', 'Leah',
  'Omar', 'Fatima', 'Zara', 'Imran', 'Sara', 'Lakshmi', 'Ravi', 'Sita',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Nair', 'Iyer', 'Das',
  'Mehta', 'Joshi', 'Kapoor', 'Khan', 'Ali', 'Chopra', 'Banerjee', 'Ghosh',
  'Pillai', 'Menon', 'Rao', 'Verma', 'Malhotra', 'Bhat', 'Shetty', 'Gupta',
];

const INTERESTS = [
  'food',
  'street food',
  'walks',
  'heritage',
  'markets',
  'cafes',
  'sunsets',
  'temples',
  'nightlife',
  'nature',
  'photography',
  'music',
  'crafts',
];

const TRAVEL_STYLES = [
  'slow travel',
  'weekend escapes',
  'food first',
  'culture & history',
  'offbeat',
  'city breaks',
];

const AREAS = [
  'old market',
  'station road',
  'lake side',
  'fort steps',
  'main chowk',
  'river ghat',
  'temple lane',
  'bus stand corner',
  'university road',
  'evening bazaar',
  'park edge',
  'bridge view',
];

type PostTemplate = {
  type: 'experience' | 'question' | 'avoid';
  interests: string[];
  text: (city: string, area: string) => string;
  neighborhood: (area: string) => string;
  tags: string[];
};

const TEMPLATES: PostTemplate[] = [
  {
    type: 'experience',
    interests: ['food', 'street food'],
    text: (city, area) =>
      `The chai stall by ${area} in ${city} still fills up after 6. Same steel tumblers, same sweet cut — go before the rush if you want a seat.`,
    neighborhood: (area) => area,
    tags: ['food', 'local', 'evening'],
  },
  {
    type: 'experience',
    interests: ['food', 'street food', 'markets'],
    text: (city, area) =>
      `Ask for the second round near ${area}. In ${city}, the best bites rarely have English boards — follow the locals standing, not the photos.`,
    neighborhood: (area) => area,
    tags: ['street food', 'markets'],
  },
  {
    type: 'experience',
    interests: ['walks', 'sunsets', 'photography'],
    text: (city, area) =>
      `Walk past ${area} when the light softens. ${city} goes quiet for twenty minutes and the main road noise drops enough to hear yourself think.`,
    neighborhood: (area) => area,
    tags: ['walks', 'evening', 'slow'],
  },
  {
    type: 'experience',
    interests: ['heritage', 'temples', 'culture'],
    text: (city, area) =>
      `Around ${area}, people still gather without itineraries. In ${city}, arrive curious, keep your voice low, and ask before you photograph.`,
    neighborhood: (area) => area,
    tags: ['heritage', 'culture'],
  },
  {
    type: 'experience',
    interests: ['cafes', 'slow travel'],
    text: (city, area) =>
      `Tiny place off ${area} — no playlist war, just filter coffee and regulars who stay for one more cup. My reset corner in ${city}.`,
    neighborhood: (area) => area,
    tags: ['cafes', 'slow'],
  },
  {
    type: 'experience',
    interests: ['markets', 'crafts'],
    text: (city, area) =>
      `Morning at ${area} before 9am. In ${city}, stalls open soft and sellers have time to talk — better than the afternoon crush.`,
    neighborhood: (area) => area,
    tags: ['markets', 'morning'],
  },
  {
    type: 'experience',
    interests: ['nature', 'walks'],
    text: (city, area) =>
      `Skip the viewpoint parking lot. Take the side path near ${area} — ${city}'s quieter green patch most guides never mention.`,
    neighborhood: (area) => area,
    tags: ['nature', 'offbeat'],
  },
  {
    type: 'experience',
    interests: ['nightlife', 'music'],
    text: (city, area) =>
      `Live set near ${area} starts late and stays small. In ${city}, ask a regular which night the locals actually show up.`,
    neighborhood: (area) => area,
    tags: ['nightlife', 'music'],
  },
  {
    type: 'question',
    interests: ['food', 'street food'],
    text: (city, area) =>
      `Visiting ${city} this weekend — where do locals actually eat near ${area} after 9pm? Not the Instagram spots.`,
    neighborhood: (area) => area,
    tags: ['question', 'food'],
  },
  {
    type: 'question',
    interests: ['walks', 'heritage'],
    text: (city) =>
      `First time in ${city}. What's one lane or corner that still feels like the city people grew up with?`,
    neighborhood: () => 'city centre',
    tags: ['question', 'local'],
  },
  {
    type: 'question',
    interests: ['markets', 'crafts'],
    text: (city, area) =>
      `Anyone know a fair-price stall around ${area} in ${city} for everyday crafts — not tourist markup?`,
    neighborhood: (area) => area,
    tags: ['question', 'markets'],
  },
  {
    type: 'avoid',
    interests: ['walks', 'nightlife'],
    text: (city, area) =>
      `Avoid the shortcut past ${area} after dark this week — poor lighting and a few bike snatch reports. Stick to the lit main road in ${city}.`,
    neighborhood: (area) => area,
    tags: ['avoid', 'safety'],
  },
  {
    type: 'avoid',
    interests: ['food', 'markets'],
    text: (city, area) =>
      `That crowded cart by ${area} has been recycling oil hard lately. Locals moved two stalls down — follow them in ${city}.`,
    neighborhood: (area) => area,
    tags: ['avoid', 'food'],
  },
];

const STORY_SNIPPETS = [
  (city: string) =>
    `I tell friends ${city} isn't a checklist. It's the ten quiet minutes between errands when the city suddenly feels familiar.`,
  (city: string) =>
    `If you only see ${city} from a cab window, you'll miss the part that stays with people who live here.`,
  (city: string) =>
    `My ${city} is early mornings and shared tables — not the postcard version.`,
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function hashInterest(interests: string[], i: number): PostTemplate {
  const interest = pick(interests, i);
  const matches = TEMPLATES.filter((t) =>
    t.interests.some((x) => interest.includes(x) || x.includes(interest)),
  );
  return pick(matches.length ? matches : TEMPLATES, i);
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

/** Embed sim posts without Nest DI (keeps scripts out of the API build). */
async function ingestSimPostsToRag() {
  const {
    embedLocal,
    LOCAL_EMBED_DIMS,
    LOCAL_EMBED_MODEL,
  } = await import('../src/rag/embedding.util');
  const { pgVectorSql } = await import('../src/rag/pgvector');
  const { createId } = await import('../src/rag/ids');

  const simPostsForRag = await prisma.post.findMany({
    where: { author: { isSimulated: true }, moderation: 'visible' },
    include: {
      author: { select: { name: true } },
      city: { select: { slug: true } },
    },
  });
  console.log(`Ingesting ${simPostsForRag.length} sim posts into RAG…`);

  let ingested = 0;
  for (const post of simPostsForRag) {
    const sourceType = post.type === 'avoid' ? 'local_update' : 'community';
    const sourceId = `post:${post.id}`;
    const title =
      post.type === 'avoid'
        ? 'Avoid note'
        : post.type === 'question'
          ? 'Local question'
          : 'Community experience';
    const body = post.text.trim();
    const neighborhood = post.neighborhood?.trim() || null;
    const vibeTags = JSON.parse(post.vibeTagsJson || '[]') as string[];
    const vibeTagsJson = JSON.stringify(vibeTags);
    const authorName = post.author.name;
    const trust = 0.75;
    const expiresAt = post.expiresAt;
    const citySlug = post.city.slug;
    const textForEmbed = `${title}\n${body}\n${vibeTags.join(' ')}`;
    const vector = embedLocal(textForEmbed);
    const vecSql = pgVectorSql(vector);
    const model = LOCAL_EMBED_MODEL;
    const dims = LOCAL_EMBED_DIMS;

    const existing = await prisma.ragChunk.findUnique({
      where: { sourceType_sourceId: { sourceType, sourceId } },
    });

    if (existing) {
      await prisma.$executeRaw`
        UPDATE "RagChunk"
        SET
          "citySlug" = ${citySlug},
          title = ${title},
          body = ${body},
          neighborhood = ${neighborhood},
          "vibeTagsJson" = ${vibeTagsJson},
          "authorName" = ${authorName},
          trust = ${trust},
          embedding = ${vecSql},
          model = ${model},
          dims = ${dims},
          "expiresAt" = ${expiresAt},
          "updatedAt" = NOW()
        WHERE id = ${existing.id}
      `;
    } else {
      const id = createId();
      await prisma.$executeRaw`
        INSERT INTO "RagChunk" (
          id, "citySlug", "sourceType", "sourceId", title, body, neighborhood,
          "vibeTagsJson", "authorName", trust, embedding, model, dims, "expiresAt",
          "createdAt", "updatedAt"
        ) VALUES (
          ${id},
          ${citySlug},
          ${sourceType},
          ${sourceId},
          ${title},
          ${body},
          ${neighborhood},
          ${vibeTagsJson},
          ${authorName},
          ${trust},
          ${vecSql},
          ${model},
          ${dims},
          ${expiresAt},
          ${post.createdAt},
          NOW()
        )
      `;
    }

    ingested += 1;
    if (ingested % 200 === 0) {
      console.log(`… rag ${ingested}/${simPostsForRag.length}`);
    }
  }
  console.log(`RAG ingest done: ${ingested} chunks`);
}

async function main() {
  console.log(
    `sim:up — users=${USER_COUNT}, posts/user≈${POSTS_PER_USER}, cityPool=${CITY_POOL}, rag=${INGEST_RAG}`,
  );

  const existing = await prisma.user.count({ where: { isSimulated: true } });
  if (existing > 0) {
    console.log(
      `Found ${existing} simulated users already. Run npm run sim:down first, or continue to add more.`,
    );
  }

  let cities = await prisma.city.findMany({
    where: {
      status: 'ACTIVE',
      country: 'India',
      population: { gte: 20000 },
    },
    orderBy: { population: 'desc' },
    take: CITY_POOL,
    select: { id: true, name: true, slug: true, state: true, population: true },
  });

  if (cities.length < 20) {
    cities = await prisma.city.findMany({
      where: { status: 'ACTIVE', country: 'India' },
      orderBy: { population: 'desc' },
      take: CITY_POOL,
      select: { id: true, name: true, slug: true, state: true, population: true },
    });
  }

  if (cities.length < 10) {
    throw new Error(
      'Not enough cities in DB. Run npm run geonames:import-india first.',
    );
  }

  const uniqueCities = Array.from(
    new Map(cities.map((c) => [c.id, c])).values(),
  ).slice(0, CITY_POOL);

  console.log(`Using ${uniqueCities.length} cities across India`);

  const passwordHash = await bcrypt.hash('sim-demo-pass', 8);
  const startIndex = existing;

  let usersCreated = 0;
  let postsCreated = 0;
  let storiesCreated = 0;

  for (let offset = 0; offset < USER_COUNT; offset += BATCH) {
    const batchSize = Math.min(BATCH, USER_COUNT - offset);
    const userRows = [];

    for (let j = 0; j < batchSize; j++) {
      const n = startIndex + offset + j + 1;
      const first = pick(FIRST_NAMES, n);
      const last = pick(LAST_NAMES, n * 3);
      const city = pick(uniqueCities, n * 7);
      const interestCount = 2 + (n % 3);
      const interests = Array.from({ length: interestCount }, (_, k) =>
        pick(INTERESTS, n + k * 5),
      );
      const uniqueInterests = [...new Set(interests)];

      userRows.push({
        email: `sim.${n}@aaspaas.sim`,
        name: `${first} ${last}`,
        passwordHash,
        provider: 'sim',
        providerId: `sim-${n}`,
        isSimulated: true,
        homeCityId: city.id,
        homeCity: city.name,
        interests: uniqueInterests,
        travelStyle: pick(TRAVEL_STYLES, n),
        city,
      });
    }

    // create users
    await prisma.user.createMany({
      data: userRows.map((u) => ({
        email: u.email,
        name: u.name,
        passwordHash: u.passwordHash,
        provider: u.provider,
        providerId: u.providerId,
        isSimulated: true,
      })),
      skipDuplicates: true,
    });

    const createdUsers = await prisma.user.findMany({
      where: {
        isSimulated: true,
        email: { in: userRows.map((u) => u.email) },
      },
      select: { id: true, email: true, name: true },
    });
    const byEmail = new Map(createdUsers.map((u) => [u.email, u]));

    const profiles = [];
    const posts = [];
    const stories = [];

    for (const row of userRows) {
      const user = byEmail.get(row.email);
      if (!user) continue;
      usersCreated += 1;

      profiles.push({
        userId: user.id,
        homeCityId: row.homeCityId,
        homeCity: row.homeCity,
        interests: JSON.stringify(row.interests),
        travelStyle: row.travelStyle,
        aboutCity: `I know ${row.homeCity} through everyday places — markets, walks, and small food stops.`,
        completed: true,
      });

      const postCount =
        POSTS_PER_USER === 0
          ? 0
          : 1 + ((user.email.length + postsCreated) % POSTS_PER_USER);

      for (let p = 0; p < postCount; p++) {
        const tmpl = hashInterest(row.interests, p + usersCreated);
        const area = pick(AREAS, usersCreated + p * 11);
        const hours = (usersCreated * 3 + p * 5) % 48;
        const createdAt = hoursAgo(hours);
        const text = tmpl.text(row.city.name, area);
        const neighborhood = tmpl.neighborhood(area);
        const vibeTagsJson = JSON.stringify(tmpl.tags);
        const expiresAt =
          tmpl.type === 'avoid' || tmpl.type === 'question'
            ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            : null;

        posts.push({
          authorId: user.id,
          cityId: row.city.id,
          type: tmpl.type,
          text,
          neighborhood,
          vibeTagsJson,
          moderation: 'visible',
          expiresAt,
          createdAt,
        });
      }

      if (usersCreated % 7 === 0) {
        stories.push({
          cityId: row.city.id,
          userId: user.id,
          content: pick(STORY_SNIPPETS, usersCreated)(row.city.name),
          source: 'COMMUNITY',
          createdAt: hoursAgo((usersCreated * 2) % 72),
        });
      }
    }

    if (profiles.length) {
      await prisma.userProfile.createMany({ data: profiles, skipDuplicates: true });
    }

    if (posts.length) {
      await prisma.post.createMany({ data: posts });
      postsCreated += posts.length;
    }

    if (stories.length) {
      await prisma.cityStory.createMany({ data: stories });
      storiesCreated += stories.length;
    }

    console.log(
      `… ${Math.min(offset + batchSize, USER_COUNT)}/${USER_COUNT} users (posts=${postsCreated}, stories=${storiesCreated})`,
    );
  }

  if (INGEST_RAG) {
    await ingestSimPostsToRag();
  } else {
    console.log(
      'Tip: SIM_INGEST_RAG=1 npm run sim:up — or after API is up: curl -X POST http://localhost:3001/api/rag/reindex',
    );
  }

  const simUsers = await prisma.user.count({ where: { isSimulated: true } });
  const simPosts = await prisma.post.count({
    where: { author: { isSimulated: true } },
  });

  console.log('\nsim:up complete');
  console.log(
    JSON.stringify(
      {
        simulatedUsers: simUsers,
        simulatedPosts: simPosts,
        storiesCreated,
        tag: 'User.isSimulated=true',
        wipe: 'npm run sim:down',
      },
      null,
      2,
    ),
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
