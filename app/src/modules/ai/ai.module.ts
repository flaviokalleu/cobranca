import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DeepSeekService } from './deepseek.service';

@Module({
  controllers: [AiController],
  providers: [AiService, DeepSeekService],
  exports: [DeepSeekService],
})
export class AiModule {}
