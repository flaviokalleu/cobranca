import { Module } from '@nestjs/common';
import { CompaniesModule } from '../companies/companies.module';
import { FinancialEntriesModule } from '../financial-entries/financial-entries.module';
import { FinancialExtractorModule } from '../financial-extractor/financial-extractor.module';
import { AiModule } from '../ai/ai.module';
import { DeepSeekConsultantService } from './deepseek-consultant.service';
import { MainWhatsappBotService } from './main-whatsapp-bot.service';
import { WhatsappButtonHandler } from './whatsapp-button.handler';
import { WhatsappFileService } from './whatsapp-file.service';
import { WhatsappMessageHandler } from './whatsapp-message.handler';
import { WhatsappOutboundService } from './whatsapp-outbound.service';
import { WhatsappUserStateService } from './whatsapp-user-state.service';

@Module({
  imports: [CompaniesModule, FinancialEntriesModule, FinancialExtractorModule, AiModule],
  providers: [
    MainWhatsappBotService,
    WhatsappButtonHandler,
    WhatsappFileService,
    WhatsappMessageHandler,
    WhatsappOutboundService,
    WhatsappUserStateService,
    DeepSeekConsultantService,
  ],
  exports: [MainWhatsappBotService, WhatsappOutboundService],
})
export class WhatsappBotModule {}
