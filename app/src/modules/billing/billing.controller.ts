import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ChangePlanDto } from './dto/change-plan.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { IsArray, IsString } from 'class-validator';

class UpdatePlanFeaturesDto {
  @IsArray()
  @IsString({ each: true })
  features!: string[];
}

@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Roles('ADMIN', 'AGENT')
  @Get('plans')
  plans() {
    return this.billing.plans();
  }

  @Roles('ADMIN', 'AGENT')
  @Get('subscription')
  subscription(@Tenant() tenantId: string) {
    return this.billing.subscription(tenantId);
  }

  @Roles('ADMIN')
  @Post('subscription/change')
  change(@Tenant() tenantId: string, @Body() dto: ChangePlanDto) {
    return this.billing.changePlan(tenantId, dto.planCode);
  }

  @Roles('SUPERADMIN')
  @Put('plans/:planCode/features')
  updatePlanFeatures(
    @Param('planCode') planCode: string,
    @Body() dto: UpdatePlanFeaturesDto,
  ) {
    return this.billing.updatePlanFeatures(planCode, dto.features);
  }

  @Roles('SUPERADMIN')
  @Get('plans/:planCode/features')
  getPlanFeatures(@Param('planCode') planCode: string) {
    return this.billing.getPlanFeatures(planCode);
  }
}
