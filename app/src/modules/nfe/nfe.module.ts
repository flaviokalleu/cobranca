import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { NfeController } from './nfe.controller';
import { NfeService } from './nfe.service';

@Module({
  imports: [AuditModule],
  controllers: [NfeController],
  providers: [NfeService],
  exports: [NfeService],
})
export class NfeModule {}
