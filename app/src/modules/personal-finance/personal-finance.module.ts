import { Module } from '@nestjs/common';
import { PersonalFinanceController } from './personal-finance.controller';
import { PersonalFinanceService } from './personal-finance.service';
import { AiModule } from '../ai/ai.module';
import { WhatsappBotModule } from '../whatsapp-bot/whatsapp-bot.module';

@Module({
  imports: [AiModule, WhatsappBotModule],
  controllers: [PersonalFinanceController],
  providers: [PersonalFinanceService],
})
export class PersonalFinanceModule {}
