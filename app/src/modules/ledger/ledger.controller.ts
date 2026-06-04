import { Controller, Get } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('ledger')
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  // Saldos contabeis: visao financeira sensivel, somente ADMIN.
  @Roles('ADMIN')
  @Get('balances')
  balances(@Tenant() tenantId: string) {
    return this.ledger.balances(tenantId);
  }
}
