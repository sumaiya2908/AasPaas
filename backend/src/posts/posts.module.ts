import { Module } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { CitiesModule } from '../cities/cities.module';
import { RagModule } from '../rag/rag.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [CitiesModule, RagModule, NotificationsModule],
  providers: [PostsService],
  controllers: [PostsController],
})
export class PostsModule {}
