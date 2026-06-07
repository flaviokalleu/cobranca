import { Module } from '@nestjs/common';
import { ChargesController } from './charges.controller';
import { PublicChargesController } from './public-charges.controller';
import { ChargesService } from './charges.service';
import { ChargesScheduler } from './charges.scheduler';
import { LedgerModule } from '../ledger/ledger.module';
import { WhatsappBotModule } from '../whatsapp-bot/whatsapp-bot.module';
import { NfeModule } from '../nfe/nfe.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [LedgerModule, WhatsappBotModule, NfeModule, PushModule],
  controllers: [ChargesController, PublicChargesController],
  providers: [ChargesService, ChargesScheduler],
  exports: [ChargesService],
})
export class ChargesModule {}
