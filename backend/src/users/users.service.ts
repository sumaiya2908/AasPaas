import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.toPublic(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        homeCityId: dto.homeCityId,
        homeCity: dto.homeCity?.trim(),
        interests: JSON.stringify(dto.interests ?? []),
        travelStyle: dto.travelStyle,
        aboutCity: dto.aboutCity,
        completed: dto.completed ?? true,
      },
      update: {
        homeCityId: dto.homeCityId,
        homeCity: dto.homeCity?.trim(),
        interests: dto.interests ? JSON.stringify(dto.interests) : undefined,
        travelStyle: dto.travelStyle,
        aboutCity: dto.aboutCity,
        completed: dto.completed ?? true,
      },
    });

    return this.findPublicById(userId).then((u) => ({
      ...u,
      profile: {
        homeCityId: profile.homeCityId,
        homeCity: profile.homeCity,
        interests: JSON.parse(profile.interests || '[]') as string[],
        travelStyle: profile.travelStyle,
        aboutCity: profile.aboutCity,
        completed: profile.completed,
      },
    }));
  }

  private toPublic(user: {
    id: string;
    email: string;
    name: string;
    provider: string;
    profile: {
      homeCityId: string | null;
      homeCity: string | null;
      interests: string;
      travelStyle: string | null;
      aboutCity: string | null;
      completed: boolean;
    } | null;
  }) {
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
      },
      profile: user.profile
        ? {
            homeCityId: user.profile.homeCityId,
            homeCity: user.profile.homeCity,
            interests: JSON.parse(user.profile.interests || '[]') as string[],
            travelStyle: user.profile.travelStyle,
            aboutCity: user.profile.aboutCity,
            completed: user.profile.completed,
          }
        : null,
    };
  }
}
