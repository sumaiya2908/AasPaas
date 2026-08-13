import { Module } from '@nestjs/common';
import { SavesService } from './saves.service';
import { SavesController } from './saves.controller';
import { CitiesModule } from '../cities/cities.module';

@Module({
  imports: [CitiesModule],
  providers: [SavesService],
  controllers: [SavesController],
  exports: [SavesService],
})
export class SavesModule {}
