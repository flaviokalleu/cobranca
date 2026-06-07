import { Body, Controller, Delete, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyResource } from '../../auth/decorators/policy.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { FinancialEntriesService } from './financial-entries.service';
import { UpdateFinancialEntryDto } from './dto/update-financial-entry.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Lançamentos financeiros')
@ApiBearerAuth('JWT')
@PolicyResource('FinancialEntry')
@Controller('financial-entries')
export class FinancialEntriesController {
  constructor(private readonly financialEntries: FinancialEntriesService) {}

  @Get()
  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @ApiOperation({ summary: 'Listar lancamentos financeiros' })
  list(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.financialEntries.list(tenantId, query);
  }

  @Patch(':id')
  @Roles('ADMIN', 'FINANCE')
  @ApiOperation({ summary: 'Atualizar lancamento financeiro' })
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFinancialEntryDto,
  ) {
    return this.financialEntries.update(tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'FINANCE')
  @ApiOperation({ summary: 'Excluir lancamento financeiro' })
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.financialEntries.remove(tenantId, id);
  }
}
