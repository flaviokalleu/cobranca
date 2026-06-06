import { Controller, Get, Query } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('finance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Roles('ADMIN', 'FINANCE', 'AGENT')
  @Get('cashflow')
  cashFlow(
    @Tenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.cashFlow(tenantId, from, to);
  }

  @Roles('ADMIN', 'FINANCE')
  @Get('summary')
  summary(
    @Tenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.summary(tenantId, from, to);
  }
}
