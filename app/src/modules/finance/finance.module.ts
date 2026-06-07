import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { FinanceReportService } from './finance-report.service';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, FinanceReportService],
})
export class FinanceModule {}
