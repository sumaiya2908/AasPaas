import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerPushToken(
    userId: string,
    input: { token: string; platform?: string },
  ) {
    const token = input.token.trim();
    await this.prisma.pushToken.upsert({
      where: { token },
      create: {
        userId,
        token,
        platform: input.platform || 'unknown',
      },
      update: {
        userId,
        platform: input.platform || 'unknown',
      },
    });
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return { ok: true };
  }

  async setCurrentCity(userId: string, citySlug: string) {
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, currentCitySlug: citySlug },
      update: { currentCitySlug: citySlug },
    });
    return { ok: true, currentCitySlug: citySlug };
  }

  async listForUser(userId: string, limit = 40) {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const unread = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });
    return {
      unread,
      items: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        citySlug: n.citySlug,
        data: JSON.parse(n.dataJson || '{}') as Record<string, unknown>,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    };
  }

  async markRead(userId: string, id?: string) {
    if (id) {
      await this.prisma.notification.updateMany({
        where: { id, userId },
        data: { readAt: new Date() },
      });
    } else {
      await this.prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
    }
    return { ok: true };
  }

  /**
   * Fan-out when someone posts in a city.
   * - Questions → home-city locals + people who saved the city
   * - Experiences / avoid → people currently in that city (+ locals for avoid)
   */
  notifyCityActivityAsync(input: {
    actorUserId: string;
    citySlug: string;
    cityName: string;
    postType: string;
    postId: string;
    text: string;
  }) {
    void this.fanout(input).catch((err) =>
      this.logger.warn(`Notify fanout failed: ${err}`),
    );
  }

  private async fanout(input: {
    actorUserId: string;
    citySlug: string;
    cityName: string;
    postType: string;
    postId: string;
    text: string;
  }) {
    const isQuestion = input.postType === 'question';
    const isAvoid = input.postType === 'avoid';
    const type = isQuestion
      ? 'city_question'
      : isAvoid
        ? 'city_avoid'
        : 'city_update';

    const title = isQuestion
      ? `Someone asked about ${input.cityName}`
      : isAvoid
        ? `Heads-up in ${input.cityName}`
        : `New local note in ${input.cityName}`;

    const body = clip(input.text, 120);
    const recipientIds = new Set<string>();

    if (isQuestion) {
      const homeProfiles = await this.prisma.userProfile.findMany({
        where: {
          OR: [
            { homeCityId: input.citySlug },
            { homeCity: { equals: input.cityName } },
          ],
        },
        select: { userId: true },
      });

      for (const p of homeProfiles) {
        const prefs = await this.prisma.notificationPreference.findUnique({
          where: { userId: p.userId },
        });
        if (!prefs || prefs.questionsInHomeCity) {
          recipientIds.add(p.userId);
        }
      }

      const city = await this.prisma.city.findUnique({
        where: { slug: input.citySlug },
      });
      if (city) {
        const saved = await this.prisma.savedCity.findMany({
          where: { cityId: city.id },
          select: { userId: true },
        });
        for (const s of saved) recipientIds.add(s.userId);
      }
    } else {
      const here = await this.prisma.notificationPreference.findMany({
        where: {
          currentCitySlug: input.citySlug,
          updatesInCurrentCity: true,
        },
        select: { userId: true },
      });
      for (const h of here) recipientIds.add(h.userId);

      if (isAvoid) {
        const homeProfiles = await this.prisma.userProfile.findMany({
          where: {
            OR: [
              { homeCityId: input.citySlug },
              { homeCity: { equals: input.cityName } },
            ],
          },
          select: { userId: true },
        });
        for (const p of homeProfiles) recipientIds.add(p.userId);
      }
    }

    recipientIds.delete(input.actorUserId);

    for (const userId of recipientIds) {
      const note = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          citySlug: input.citySlug,
          dataJson: JSON.stringify({
            postId: input.postId,
            postType: input.postType,
            citySlug: input.citySlug,
          }),
        },
      });
      await this.pushToUser(userId, note.title, note.body, {
        notificationId: note.id,
        citySlug: input.citySlug,
        type,
      });
    }

    this.logger.log(
      `Fanout ${type} in ${input.citySlug} → ${recipientIds.size} users`,
    );
  }

  private async pushToUser(
    userId: string,
    title: string,
    body: string,
    data: Record<string, string>,
  ) {
    const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
    if (!tokens.length) return;

    const messages = tokens.map((t) => ({
      to: t.token,
      sound: 'default' as const,
      title,
      body,
      data,
    }));

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      this.logger.warn(`Expo push failed: ${err}`);
    }
  }
}

function clip(s: string, n: number) {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}
