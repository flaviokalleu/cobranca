import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { ChargesModule } from '../charges/charges.module';
import { ChargeTemplatesController } from './charge-templates.controller';
import { ChargeTemplatesService } from './charge-templates.service';

@Module({
  imports: [AuditModule, ChargesModule],
  controllers: [ChargeTemplatesController],
  providers: [ChargeTemplatesService],
})
export class ChargeTemplatesModule {}
