import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CitiesService } from '../cities/cities.service';
import { CreateSavedExperienceDto } from './dto/create-saved-experience.dto';

@Injectable()
export class SavesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cities: CitiesService,
  ) {}

  async list(userId: string) {
    const [cities, experiences] = await Promise.all([
      this.prisma.savedCity.findMany({
        where: { userId },
        include: { city: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.savedExperience.findMany({
        where: { userId },
        include: { city: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      cities: cities.map((row) => ({
        id: row.city.id,
        slug: row.city.slug,
        dbId: row.city.id,
        name: row.city.name,
        state: row.city.state || row.city.country,
        savedAt: row.createdAt,
      })),
      experiences: experiences.map((row) => ({
        id: row.id,
        cityId: row.city.id,
        citySlug: row.city.slug,
        cityName: row.city.name,
        title: row.title,
        body: row.body,
        source: row.source,
        sourceId: row.sourceId,
        createdAt: row.createdAt,
      })),
    };
  }

  async toggleCity(userId: string, citySlugOrName: string) {
    const city = await this.resolveCity(citySlugOrName);
    const existing = await this.prisma.savedCity.findUnique({
      where: { userId_cityId: { userId, cityId: city.dbId } },
    });
    if (existing) {
      await this.prisma.savedCity.delete({ where: { id: existing.id } });
      return { saved: false, cityId: city.id };
    }
    await this.prisma.savedCity.create({
      data: { userId, cityId: city.dbId },
    });
    return { saved: true, cityId: city.id };
  }

  async saveExperience(userId: string, dto: CreateSavedExperienceDto) {
    const city = await this.resolveCity(dto.cityId || dto.cityName || '');
    if (!city) throw new BadRequestException('City is required');

    if (dto.sourceId) {
      const existing = await this.prisma.savedExperience.findUnique({
        where: { userId_sourceId: { userId, sourceId: dto.sourceId } },
      });
      if (existing) {
        await this.prisma.savedExperience.delete({ where: { id: existing.id } });
        return { saved: false, id: existing.id };
      }
    }

    const row = await this.prisma.savedExperience.create({
      data: {
        userId,
        cityId: city.dbId,
        title: dto.title.trim(),
        body: dto.body?.trim() || null,
        source: dto.source || 'custom',
        sourceId: dto.sourceId || `local_${Date.now()}`,
      },
      include: { city: true },
    });

    return {
      saved: true,
      id: row.id,
      cityId: row.city.id,
      citySlug: row.city.slug,
      cityName: row.city.name,
      title: row.title,
      body: row.body,
      source: row.source,
      sourceId: row.sourceId,
      createdAt: row.createdAt,
    };
  }

  async removeExperience(userId: string, id: string) {
    const row = await this.prisma.savedExperience.findFirst({
      where: { id, userId },
    });
    if (!row) throw new NotFoundException('Saved experience not found');
    await this.prisma.savedExperience.delete({ where: { id } });
    return { ok: true };
  }

  private async resolveCity(slugOrName: string) {
    const key = slugOrName.trim();
    if (!key) throw new BadRequestException('City is required');
    return this.cities.resolveCanonical(key);
  }
}
