import { Controller, Get } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Roles('ADMIN', 'FINANCE', 'AGENT')
  @Get('cashflow')
  cashFlow(@Tenant() tenantId: string) {
    return this.finance.cashFlow(tenantId);
  }

  @Roles('ADMIN', 'FINANCE')
  @Get('summary')
  summary(@Tenant() tenantId: string) {
    return this.finance.summary(tenantId);
  }
}
