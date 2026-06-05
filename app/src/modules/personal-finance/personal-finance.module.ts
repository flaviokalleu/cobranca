import { Module } from '@nestjs/common';
import { PersonalFinanceController } from './personal-finance.controller';
import { PersonalFinanceService } from './personal-finance.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [PersonalFinanceController],
  providers: [PersonalFinanceService],
})
export class PersonalFinanceModule {}
