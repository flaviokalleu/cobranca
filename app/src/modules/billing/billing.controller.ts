import { Body, Controller, Get, Post } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ChangePlanDto } from './dto/change-plan.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

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
}
