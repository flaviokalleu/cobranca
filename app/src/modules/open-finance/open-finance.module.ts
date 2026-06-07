import { Module } from '@nestjs/common';
import { OpenFinanceController } from './open-finance.controller';
import { OpenFinanceService } from './open-finance.service';
import { PluggyClientService } from './pluggy-client.service';

@Module({
  controllers: [OpenFinanceController],
  providers: [OpenFinanceService, PluggyClientService],
  exports: [OpenFinanceService],
})
export class OpenFinanceModule {}
