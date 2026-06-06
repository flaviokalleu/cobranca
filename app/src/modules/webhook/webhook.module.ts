import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { LedgerModule } from '../ledger/ledger.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [LedgerModule, AuditModule],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
