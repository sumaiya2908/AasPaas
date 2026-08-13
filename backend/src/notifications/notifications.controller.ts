import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { RegisterPushDto, SetCurrentCityDto } from './dto/notifications.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.notifications.listForUser(user.userId);
  }

  @Post('push-token')
  registerPush(
    @CurrentUser() user: { userId: string },
    @Body() dto: RegisterPushDto,
  ) {
    return this.notifications.registerPushToken(user.userId, dto);
  }

  @Post('current-city')
  setCity(
    @CurrentUser() user: { userId: string },
    @Body() dto: SetCurrentCityDto,
  ) {
    return this.notifications.setCurrentCity(user.userId, dto.citySlug);
  }

  @Patch('read')
  markAllRead(@CurrentUser() user: { userId: string }) {
    return this.notifications.markRead(user.userId);
  }

  @Patch(':id/read')
  markOne(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.notifications.markRead(user.userId, id);
  }
}
