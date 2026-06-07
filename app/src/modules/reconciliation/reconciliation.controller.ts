import { Body, Controller, Get, Post } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyResource } from '../../auth/decorators/policy.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { RunReconciliationDto } from './dto/reconciliation.dto';
import { ReconciliationService } from './reconciliation.service';

@PolicyResource('Reconciliation')
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliation: ReconciliationService) {}

  @Roles('ADMIN', 'FINANCE')
  @Post('run')
  run(@Tenant() tenantId: string, @Body() dto: RunReconciliationDto) {
    return this.reconciliation.run(tenantId, dto.accountId, dto.from, dto.to);
  }

  @Roles('ADMIN', 'FINANCE')
  @Get('results')
  list(@Tenant() tenantId: string) {
    return this.reconciliation.list(tenantId);
  }
}
