import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SavesService } from './saves.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateSavedExperienceDto } from './dto/create-saved-experience.dto';
import { ToggleSavedCityDto } from './dto/toggle-saved-city.dto';

@Controller('saves')
@UseGuards(JwtAuthGuard)
export class SavesController {
  constructor(private readonly saves: SavesService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.saves.list(user.userId);
  }

  @Post('cities')
  toggleCity(
    @CurrentUser() user: { userId: string },
    @Body() dto: ToggleSavedCityDto,
  ) {
    return this.saves.toggleCity(user.userId, dto.cityId);
  }

  @Post('experiences')
  saveExperience(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateSavedExperienceDto,
  ) {
    return this.saves.saveExperience(user.userId, dto);
  }

  @Delete('experiences/:id')
  removeExperience(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.saves.removeExperience(user.userId, id);
  }
}
