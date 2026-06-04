import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { FinancialEntriesService } from './financial-entries.service';

@Controller('financial-entries')
export class FinancialEntriesController {
  constructor(private readonly financialEntries: FinancialEntriesService) {}

  @Get()
  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  list(@Tenant() tenantId: string) {
    return this.financialEntries.list(tenantId);
  }
}
