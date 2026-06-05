import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { FinancialEntriesService } from './financial-entries.service';
import { UpdateFinancialEntryDto } from './dto/update-financial-entry.dto';

@Controller('financial-entries')
export class FinancialEntriesController {
  constructor(private readonly financialEntries: FinancialEntriesService) {}

  @Get()
  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  list(@Tenant() tenantId: string) {
    return this.financialEntries.list(tenantId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'FINANCE')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFinancialEntryDto,
  ) {
    return this.financialEntries.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'FINANCE')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.financialEntries.remove(tenantId, id);
  }
}
