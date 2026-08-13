import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CitiesModule } from './cities/cities.module';
import { PostsModule } from './posts/posts.module';
import { SavesModule } from './saves/saves.module';
import { RagModule } from './rag/rag.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CitiesModule,
    PostsModule,
    SavesModule,
    RagModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
