import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CitiesService } from './cities.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateCityStoryDto } from './dto/create-city-story.dto';

@Controller('cities')
export class CitiesController {
  constructor(private readonly cities: CitiesService) {}

  @Get('search')
  search(
    @Query('q') q = '',
    @Query('limit') limit?: string,
  ) {
    return this.cities.search(q, limit ? Number(limit) : undefined);
  }

  @Get('nearby')
  nearby(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.cities.nearby(
      Number(lat),
      Number(lng),
      radiusKm ? Number(radiusKm) : undefined,
    );
  }

  @Get('discover')
  discover(@Query('limit') limit?: string) {
    return this.cities.discover(limit ? Number(limit) : undefined);
  }

  @Get('home')
  home(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('limit') limit?: string,
    @Query('focusCityId') focusCityId?: string,
  ) {
    const hasCoords =
      lat != null &&
      lng != null &&
      lat !== '' &&
      lng !== '' &&
      Number.isFinite(Number(lat)) &&
      Number.isFinite(Number(lng));
    return this.cities.home({
      lat: hasCoords ? Number(lat) : undefined,
      lng: hasCoords ? Number(lng) : undefined,
      limit: limit ? Number(limit) : undefined,
      focusCityId: focusCityId?.trim() || undefined,
    });
  }

  @Get()
  list() {
    return this.cities.list();
  }

  @Get(':idOrSlug/stories')
  stories(@Param('idOrSlug') idOrSlug: string) {
    return this.cities.listStories(idOrSlug);
  }

  @Get(':idOrSlug/today')
  today(@Param('idOrSlug') idOrSlug: string) {
    return this.cities.today(idOrSlug);
  }

  @Get(':idOrSlug/experiences')
  experiences(
    @Param('idOrSlug') idOrSlug: string,
    @Query('limit') limit?: string,
  ) {
    return this.cities.experiences(
      idOrSlug,
      limit ? Number(limit) : undefined,
    );
  }

  @Get(':idOrSlug')
  getOne(@Param('idOrSlug') idOrSlug: string) {
    return this.cities.getBySlugOrId(idOrSlug);
  }

  /** Free-text create disabled — returns 400. */
  @UseGuards(JwtAuthGuard)
  @Post()
  create() {
    return this.cities.findOrCreate({ name: '' });
  }

  @UseGuards(JwtAuthGuard)
  @Post('stories')
  addStory(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCityStoryDto,
  ) {
    return this.cities.addStory({
      cityId: dto.cityId,
      userId: user.userId,
      content: dto.content,
      source: dto.source,
    });
  }
}
