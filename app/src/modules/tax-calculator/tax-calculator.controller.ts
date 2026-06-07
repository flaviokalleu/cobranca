import { Controller, Get, Post, Query } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyResource } from '../../auth/decorators/policy.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { TaxCalculatorService } from './tax-calculator.service';

@PolicyResource('Tax')
@Controller('tax')
export class TaxCalculatorController {
  constructor(private readonly tax: TaxCalculatorService) {}

  @Roles('ADMIN', 'FINANCE')
  @Post('calculate')
  calculate(
    @Tenant() tenantId: string,
    @Query('regime') regime = 'MEI',
    @Query('faturamento12m') faturamento12m = '0',
    @Query('faturamentoMes') faturamentoMes = '0',
    @Query('period') period?: string,
  ) {
    return this.tax.calculate(tenantId, regime, Number(faturamento12m), Number(faturamentoMes), period);
  }

  @Roles('ADMIN', 'FINANCE')
  @Get('history')
  history(@Tenant() tenantId: string) {
    return this.tax.history(tenantId);
  }
}
