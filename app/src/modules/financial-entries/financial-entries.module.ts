import { Module } from '@nestjs/common';
import { FinancialExtractorModule } from '../financial-extractor/financial-extractor.module';
import { FinancialEntriesController } from './financial-entries.controller';
import { FinancialEntriesRepository } from './financial-entries.repository';
import { FinancialEntriesService } from './financial-entries.service';

@Module({
  imports: [FinancialExtractorModule],
  controllers: [FinancialEntriesController],
  providers: [FinancialEntriesRepository, FinancialEntriesService],
  exports: [FinancialEntriesService],
})
export class FinancialEntriesModule {}
