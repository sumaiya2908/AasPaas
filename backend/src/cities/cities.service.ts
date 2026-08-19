import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeCityName } from './normalize';

export type PublicCity = {
  /** Canonical AASPAAS city_id (cuid) */
  id: string;
  slug: string;
  geonameId: number | null;
  name: string;
  state: string;
  country: string;
  stateObj: { id: string; name: string } | null;
  countryObj: { id: string; name: string; iso2: string } | null;
  latitude: number | null;
  longitude: number | null;
  population: number | null;
  status: string;
  weather: string;
  tempC: number;
  mood: string[];
  briefing: string;
  /** @deprecated alias of id — kept during mobile migration */
  dbId: string;
};

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(status = 'ACTIVE') {
    const rows = await this.prisma.city.findMany({
      where: { status },
      include: { countryRef: true, stateRef: true },
      orderBy: [{ population: 'desc' }, { name: 'asc' }],
      take: 100,
    });
    return rows.map((c) => this.toPublic(c));
  }

  async getBySlugOrId(idOrSlug: string) {
    const city =
      (await this.prisma.city.findUnique({
        where: { id: idOrSlug },
        include: { countryRef: true, stateRef: true },
      })) ||
      (await this.prisma.city.findUnique({
        where: { slug: idOrSlug },
        include: { countryRef: true, stateRef: true },
      }));
    if (!city) throw new NotFoundException('City not found');
    return this.toPublic(city);
  }

  /**
   * Resolve a city by canonical id or slug. Never creates from free text.
   */
  async resolveCanonical(idOrSlug: string) {
    return this.getBySlugOrId(idOrSlug);
  }

  /**
   * @deprecated Free-text city creation is disabled. Use search + select.
   */
  async findOrCreate(_dto: { name: string }) {
    throw new BadRequestException(
      'Free-text city creation is disabled. Search and select a canonical city.',
    );
  }

  async search(q: string, limit = 8) {
    const query = q.trim();
    if (query.length < 2) return [];

    const normalized = normalizeCityName(query);
    const take = Math.min(
      Math.max(limit, 1),
      Number(process.env.CITY_SEARCH_LIMIT || 10),
    );

    const byName = await this.prisma.city.findMany({
      where: {
        status: { in: ['ACTIVE', 'COMING_SOON'] },
        OR: [
          { normalizedName: { startsWith: normalized } },
          { name: { contains: query, mode: 'insensitive' } },
          { asciiName: { contains: query, mode: 'insensitive' } },
          { state: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: { countryRef: true, stateRef: true, aliases: true },
      take: 60,
      orderBy: [{ population: 'desc' }],
    });

    const aliasHits = await this.prisma.cityAlias.findMany({
      where: {
        OR: [
          { normalizedAlias: { startsWith: normalized } },
          { alias: { contains: query } },
        ],
      },
      include: {
        city: { include: { countryRef: true, stateRef: true, aliases: true } },
      },
      take: 40,
    });

    const map = new Map<string, (typeof byName)[0] & { _score?: number }>();
    for (const c of byName) map.set(c.id, c);
    for (const a of aliasHits) {
      if (a.city.status === 'HIDDEN') continue;
      map.set(a.city.id, a.city);
    }

    const scored = Array.from(map.values()).map((c) => {
      const n = c.normalizedName || normalizeCityName(c.name);
      let score = 0;
      if (n === normalized) score += 1000;
      else if (n.startsWith(normalized)) score += 700;
      else if (n.includes(normalized)) score += 400;

      const aliasExact = (c.aliases || []).some(
        (a) => a.normalizedAlias === normalized,
      );
      const aliasPrefix = (c.aliases || []).some((a) =>
        a.normalizedAlias.startsWith(normalized),
      );
      if (aliasExact) score += 850;
      else if (aliasPrefix) score += 550;

      if (c.status === 'ACTIVE') score += 100;
      score += Math.min(80, Math.log10((c.population || 1) + 1) * 20);

      // State-name hits (e.g. "sikkim") — prefer larger towns in that state
      const stateName = normalizeCityName(c.state || c.stateRef?.name || '');
      if (stateName && (stateName === normalized || stateName.startsWith(normalized))) {
        score += n.startsWith(normalized) ? 120 : 280;
      }

      return { city: c, score };
    });

    return scored
      .sort((a, b) => b.score - a.score || (b.city.population || 0) - (a.city.population || 0))
      .slice(0, take)
      .map((s) => this.toPublic(s.city));
  }

  /**
   * Approximate nearby city from lat/lng (haversine). No external maps.
   */
  async nearby(lat: number, lng: number, radiusKm = 80) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('lat and lng are required');
    }
    const latDelta = radiusKm / 111;
    const cos = Math.cos((lat * Math.PI) / 180);
    const lngDelta = radiusKm / (111 * Math.max(0.2, Math.abs(cos)));

    const cities = await this.prisma.city.findMany({
      where: {
        status: 'ACTIVE',
        latitude: { gte: lat - latDelta, lte: lat + latDelta },
        longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
      },
      include: { countryRef: true, stateRef: true },
      take: 800,
    });

    let best: { city: (typeof cities)[0]; km: number } | null = null;
    for (const c of cities) {
      if (c.latitude == null || c.longitude == null) continue;
      const km = haversineKm(lat, lng, c.latitude, c.longitude);
      if (!best || km < best.km) best = { city: c, km };
    }
    if (!best || best.km > radiusKm) {
      return { city: null, distanceKm: null };
    }
    return {
      city: this.toPublic(best.city),
      distanceKm: Math.round(best.km * 10) / 10,
    };
  }

  /**
   * Discover ranking (deterministic V1):
   * recent posts + stories + saves + briefing quality + population.
   */
  async discover(limit = 8) {
    const take = Math.min(Math.max(limit, 1), 16);
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [cities, postGroups, storyGroups, saveGroups] = await Promise.all([
      this.prisma.city.findMany({
        where: { status: 'ACTIVE' },
        include: { countryRef: true, stateRef: true },
        take: 80,
      }),
      this.prisma.post.groupBy({
        by: ['cityId'],
        where: {
          moderation: 'visible',
          createdAt: { gte: since },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        _count: { _all: true },
      }),
      this.prisma.cityStory.groupBy({
        by: ['cityId'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      this.prisma.savedCity.groupBy({
        by: ['cityId'],
        _count: { _all: true },
      }),
    ]);

    const postsBy = new Map(postGroups.map((g) => [g.cityId, g._count._all]));
    const storiesBy = new Map(storyGroups.map((g) => [g.cityId, g._count._all]));
    const savesBy = new Map(saveGroups.map((g) => [g.cityId, g._count._all]));

    const scored = cities.map((c) => {
      const posts = postsBy.get(c.id) || 0;
      const stories = storiesBy.get(c.id) || 0;
      const saves = savesBy.get(c.id) || 0;
      const briefingBonus =
        c.briefing && !c.briefing.includes('Community pulse will fill')
          ? 40
          : c.moodJson && c.moodJson !== '[]'
            ? 20
            : 0;
      const popBonus = Math.min(80, Math.log10((c.population || 1) + 1) * 20);
      const score =
        posts * 25 + stories * 18 + saves * 12 + briefingBonus + popBonus;
      return { city: c, score, posts, stories, saves };
    });

    return scored
      .sort(
        (a, b) =>
          b.score - a.score ||
          (b.city.population || 0) - (a.city.population || 0) ||
          a.city.name.localeCompare(b.city.name),
      )
      .slice(0, take)
      .map((s) => ({
        ...this.toPublic(s.city),
        activity: {
          recentPosts: s.posts,
          recentStories: s.stories,
          saves: s.saves,
          score: Math.round(s.score),
        },
      }));
  }

  /** Recent time-sensitive signals for a city (Today section).
   *  Excludes experience posts — those belong under People / City Pulse. */
  async today(idOrSlug: string) {
    const city = await this.resolveCityRow(idOrSlug);
    const since = new Date(Date.now() - 36 * 60 * 60 * 1000);
    const posts = await this.prisma.post.findMany({
      where: {
        cityId: city.id,
        moderation: 'visible',
        createdAt: { gte: since },
        type: { in: ['avoid'] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    const items = posts.map((p) => ({
      id: p.id,
      type: p.type,
      text: p.text,
      neighborhood: p.neighborhood,
      vibeTags: JSON.parse(p.vibeTagsJson || '[]') as string[],
      warn: p.type === 'avoid',
      ago: relativeAgo(p.createdAt),
      createdAt: p.createdAt,
      author: p.author,
    }));

    return {
      city: this.toPublic(city),
      items,
      emptyMessage:
        items.length === 0
          ? 'No major updates today.'
          : null,
    };
  }

  /** Experiences + stories for City Page “People are saying”. */
  async experiences(idOrSlug: string, limit = 6) {
    const city = await this.resolveCityRow(idOrSlug);
    const take = Math.min(Math.max(limit, 1), 20);

    const [posts, stories, experienceCount] = await Promise.all([
      this.prisma.post.findMany({
        where: {
          cityId: city.id,
          type: 'experience',
          moderation: 'visible',
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.cityStory.findMany({
        where: { cityId: city.id },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.post.count({
        where: {
          cityId: city.id,
          type: 'experience',
          moderation: 'visible',
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
    ]);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekCount = await this.prisma.post.count({
      where: {
        cityId: city.id,
        type: 'experience',
        moderation: 'visible',
        createdAt: { gte: weekAgo },
      },
    });

    const fromPosts = posts.map((p) => ({
      id: p.id,
      source: 'post' as const,
      title: p.neighborhood?.trim() || 'A local shared this',
      body: p.text,
      neighborhood: p.neighborhood,
      vibeTags: JSON.parse(p.vibeTagsJson || '[]') as string[],
      ago: relativeAgo(p.createdAt),
      createdAt: p.createdAt.toISOString(),
      authorName: p.author.name,
    }));

    const fromStories = stories.map((s) => ({
      id: s.id,
      source: 'story' as const,
      title:
        s.source === 'ONBOARDING'
          ? 'A feeling from someone who lives here'
          : 'Community note',
      body: s.content,
      neighborhood: null as string | null,
      vibeTags: [] as string[],
      ago: relativeAgo(s.createdAt),
      createdAt: s.createdAt.toISOString(),
      authorName: s.user.name,
    }));

    const merged = [...fromPosts, ...fromStories]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, take);

    return {
      city: this.toPublic(city),
      items: merged,
      experienceCount,
      weekCount,
      emptyMessage:
        merged.length === 0
          ? 'People are just starting to share what this city means to them.'
          : null,
    };
  }

  /**
   * Curated home payload so mobile doesn't fan out many calls.
   * Optional lat/lng enrich nearby. focusCityId fills day digest when no GPS.
   */
  async home(input?: {
    lat?: number;
    lng?: number;
    limit?: number;
    focusCityId?: string;
  }) {
    const limit = input?.limit ?? 8;
    const discover = await this.discover(limit);

    let nearby: {
      city: PublicCity | null;
      distanceKm: number | null;
      today: Awaited<ReturnType<CitiesService['today']>> | null;
    } = { city: null, distanceKm: null, today: null };

    if (
      input?.lat != null &&
      input?.lng != null &&
      Number.isFinite(input.lat) &&
      Number.isFinite(input.lng)
    ) {
      const near = await this.nearby(input.lat, input.lng);
      if (near.city) {
        const today = await this.today(near.city.id);
        nearby = {
          city: near.city,
          distanceKm: near.distanceKm,
          today,
        };
      } else {
        nearby = { city: null, distanceKm: null, today: null };
      }
    }

    const dayDigest = await this.buildDayDigest({
      nearbyCity: nearby.city,
      nearbyToday: nearby.today,
      distanceKm: nearby.distanceKm,
      focusCityId: input?.focusCityId,
    });

    return {
      nearby,
      dayDigest,
      discoverCities: discover.filter(
        (c) => c.id !== nearby.city?.id && c.id !== dayDigest?.city.id,
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Aggregated “today on AASPAAS” for the focus city (nearby → focusCityId).
   * Real counts only — never fabricates events.
   */
  private async buildDayDigest(input: {
    nearbyCity: PublicCity | null;
    nearbyToday: Awaited<ReturnType<CitiesService['today']>> | null;
    distanceKm: number | null;
    focusCityId?: string;
  }) {
    let city = input.nearbyCity;
    let source: 'nearby' | 'focus' | null = city ? 'nearby' : null;
    let todayPayload = input.nearbyToday;
    let distanceKm = input.distanceKm;

    if (!city && input.focusCityId) {
      try {
        todayPayload = await this.today(input.focusCityId);
        city = todayPayload.city;
        source = 'focus';
        distanceKm = null;
      } catch {
        return null;
      }
    }

    if (!city) return null;

    const cityId = city.id;
    const [experiences, openQuestions] = await Promise.all([
      this.experiences(cityId, 3),
      this.prisma.post.count({
        where: {
          cityId,
          type: 'question',
          moderation: 'visible',
          createdAt: { gte: new Date(Date.now() - 36 * 60 * 60 * 1000) },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
    ]);

    const updates = todayPayload?.items ?? [];
    const updateCount = updates.length;
    const tryToday = experiences.items.slice(0, 2);
    const experienceCount = experiences.items.length;
    const avoidCount = updates.filter((u) => u.warn).length;

    const summaryParts: string[] = [];
    if (updateCount > 0) {
      summaryParts.push(
        `${updateCount} update${updateCount === 1 ? '' : 's'} today`,
      );
    }
    if (experienceCount > 0) {
      summaryParts.push(
        `${Math.min(experienceCount, 3)} experience${experienceCount === 1 ? '' : 's'} to try`,
      );
    }
    if (openQuestions > 0) {
      summaryParts.push(
        `${openQuestions} question${openQuestions === 1 ? '' : 's'} from travelers`,
      );
    }
    if (avoidCount > 0) {
      summaryParts.push(
        `${avoidCount} heads-up${avoidCount === 1 ? '' : 's'}`,
      );
    }

    const summary =
      summaryParts.length > 0
        ? summaryParts.join(' · ')
        : 'Quiet so far — explore the city through people.';

    const hour = new Date().getHours();
    const dayLabel =
      hour < 11 ? 'This morning' : hour < 17 ? 'This afternoon' : 'This evening';

    return {
      city,
      source,
      distanceKm,
      dayLabel,
      headline: `Today in ${city.name}`,
      summary,
      counts: {
        updates: updateCount,
        experiences: experienceCount,
        questions: openQuestions,
        avoids: avoidCount,
      },
      updates: updates.slice(0, 3),
      tryToday,
      mood: city.mood?.slice(0, 3) ?? [],
      empty: updateCount === 0 && experienceCount === 0,
    };
  }

  private async resolveCityRow(idOrSlug: string) {
    const city =
      (await this.prisma.city.findUnique({
        where: { id: idOrSlug },
        include: { countryRef: true, stateRef: true },
      })) ||
      (await this.prisma.city.findUnique({
        where: { slug: idOrSlug },
        include: { countryRef: true, stateRef: true },
      }));
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  async addStory(input: {
    cityId: string;
    userId: string;
    content: string;
    source?: 'ONBOARDING' | 'COMMUNITY';
  }) {
    const city = await this.prisma.city.findFirst({
      where: {
        OR: [{ id: input.cityId }, { slug: input.cityId }],
      },
    });
    if (!city) throw new NotFoundException('City not found');
    if (city.status === 'HIDDEN') {
      throw new BadRequestException('City is not available');
    }

    const story = await this.prisma.cityStory.create({
      data: {
        cityId: city.id,
        userId: input.userId,
        content: input.content.trim(),
        source: input.source || 'ONBOARDING',
      },
    });

    return {
      id: story.id,
      cityId: city.id,
      citySlug: city.slug,
      cityName: city.name,
      content: story.content,
      source: story.source,
      createdAt: story.createdAt,
    };
  }

  async listStories(cityIdOrSlug: string, take = 10) {
    const city = await this.prisma.city.findFirst({
      where: { OR: [{ id: cityIdOrSlug }, { slug: cityIdOrSlug }] },
    });
    if (!city) throw new NotFoundException('City not found');
    const rows = await this.prisma.cityStory.findMany({
      where: { cityId: city.id },
      orderBy: { createdAt: 'desc' },
      take,
      include: { user: { select: { id: true, name: true } } },
    });
    return rows.map((s) => ({
      id: s.id,
      cityId: city.id,
      content: s.content,
      source: s.source,
      author: s.user,
      createdAt: s.createdAt,
    }));
  }

  private toPublic(city: {
    id: string;
    slug: string;
    geonameId?: number | null;
    name: string;
    state: string | null;
    country: string;
    latitude?: number | null;
    longitude?: number | null;
    population?: number | null;
    status?: string | null;
    weather: string | null;
    tempC: number | null;
    moodJson: string;
    briefing: string | null;
    countryRef?: { id: string; name: string; iso2: string } | null;
    stateRef?: { id: string; name: string } | null;
  }): PublicCity {
    return {
      id: city.id,
      slug: city.slug,
      geonameId: city.geonameId ?? null,
      name: city.name,
      state: city.stateRef?.name || city.state || city.country,
      country: city.countryRef?.name || city.country,
      stateObj: city.stateRef
        ? { id: city.stateRef.id, name: city.stateRef.name }
        : city.state
          ? { id: '', name: city.state }
          : null,
      countryObj: city.countryRef
        ? {
            id: city.countryRef.id,
            name: city.countryRef.name,
            iso2: city.countryRef.iso2,
          }
        : { id: '', name: city.country, iso2: '' },
      latitude: city.latitude ?? null,
      longitude: city.longitude ?? null,
      population: city.population ?? null,
      status: city.status || 'ACTIVE',
      weather: city.weather || 'Check local conditions',
      tempC: city.tempC ?? 0,
      mood: JSON.parse(city.moodJson || '[]') as string[],
      briefing:
        city.briefing ||
        `${city.name} is ready to explore. Community pulse will fill in as locals share what’s happening.`,
      dbId: city.id,
    };
  }
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function relativeAgo(date: Date) {
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}
