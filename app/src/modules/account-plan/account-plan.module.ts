import { Module } from '@nestjs/common';
import { AccountPlanController } from './account-plan.controller';
import { AccountPlanService } from './account-plan.service';

@Module({
  controllers: [AccountPlanController],
  providers: [AccountPlanService],
})
export class AccountPlanModule {}
