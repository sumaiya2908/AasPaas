import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CitiesService } from '../cities/cities.service';
import { CreatePostDto } from './dto/create-post.dto';
import { IngestService } from '../rag/ingest.service';
import { NotificationsService } from '../notifications/notifications.service';

const TTL_HOURS: Record<string, number | null> = {
  experience: null,
  question: null,
  avoid: 24,
};

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cities: CitiesService,
    private readonly ingest: IngestService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(citySlug?: string, type?: string) {
    let cityId: string | undefined;
    if (citySlug) {
      const city = await this.cities.getBySlugOrId(citySlug);
      cityId = city.dbId;
    }

    const rows = await this.prisma.post.findMany({
      where: {
        ...(cityId ? { cityId } : {}),
        ...(type ? { type } : {}),
        moderation: 'visible',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        author: { select: { id: true, name: true } },
        city: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rows.map((p) => this.toPublic(p));
  }

  async create(authorId: string, dto: CreatePostDto) {
    const city = await this.resolveCity(dto);

    const hours = TTL_HOURS[dto.type] ?? null;
    const expiresAt =
      hours != null ? new Date(Date.now() + hours * 60 * 60 * 1000) : null;

    const post = await this.prisma.post.create({
      data: {
        authorId,
        cityId: city.id,
        type: dto.type,
        text: dto.text.trim(),
        neighborhood: dto.neighborhood?.trim() || null,
        vibeTagsJson: JSON.stringify(dto.vibeTags ?? []),
        expiresAt,
      },
      include: {
        author: { select: { id: true, name: true } },
        city: true,
      },
    });

    this.ingest.ingestPostAsync({
      id: post.id,
      type: post.type,
      text: post.text,
      neighborhood: post.neighborhood,
      vibeTagsJson: post.vibeTagsJson,
      expiresAt: post.expiresAt,
      createdAt: post.createdAt,
      authorName: post.author.name,
      citySlug: post.city.slug,
    });

    this.notifications.notifyCityActivityAsync({
      actorUserId: authorId,
      citySlug: post.city.slug,
      cityName: post.city.name,
      postType: post.type,
      postId: post.id,
      text: post.text,
    });

    return this.toPublic(post);
  }

  async remove(authorId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    await this.prisma.post.delete({ where: { id: postId } });
    return { ok: true };
  }

  private async resolveCity(dto: CreatePostDto) {
    const key = dto.cityId?.trim() || dto.cityName?.trim();
    if (!key) {
      throw new NotFoundException('City is required — select a canonical city');
    }
    // Never create from free text — resolve canonical id or slug only
    return this.cities.resolveCanonical(key);
  }

  private toPublic(post: {
    id: string;
    type: string;
    text: string;
    neighborhood: string | null;
    vibeTagsJson: string;
    moderation: string;
    expiresAt: Date | null;
    createdAt: Date;
    author: { id: string; name: string };
    city: { id: string; slug: string; name: string };
  }) {
    return {
      id: post.id,
      type: post.type,
      text: post.text,
      neighborhood: post.neighborhood,
      vibeTags: JSON.parse(post.vibeTagsJson || '[]') as string[],
      moderation: post.moderation,
      expiresAt: post.expiresAt,
      createdAt: post.createdAt,
      ago: relativeAgo(post.createdAt),
      author: post.author,
      cityId: post.city.id,
      citySlug: post.city.slug,
      cityName: post.city.name,
    };
  }
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
