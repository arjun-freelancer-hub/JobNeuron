import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
