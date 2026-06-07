import { Body, Controller, Get, Param, Patch, Post, HttpCode, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ChangeStageDto } from './dto/change-stage.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Leads')
@ApiBearerAuth('JWT')
@PolicyResource('Lead')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Roles('ADMIN', 'COMMERCIAL', 'AGENT')
  @ApiOperation({ summary: 'Criar lead' })
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateLeadDto) {
    return this.leads.create(tenantId, dto);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'AGENT')
  @ApiOperation({ summary: 'Listar leads do tenant' })
  @Get()
  list(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.leads.list(tenantId, query);
  }

  @Roles('ADMIN', 'COMMERCIAL')
  @PolicyAction('create')
  @ApiOperation({ summary: 'Sincronizar leads a partir dos clientes' })
  @Post('sync-customers')
  @HttpCode(200)
  syncCustomers(@Tenant() tenantId: string) {
    return this.leads.syncCustomers(tenantId);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'AGENT')
  @ApiOperation({ summary: 'Alterar etapa do lead' })
  @Patch(':id/stage')
  changeStage(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ChangeStageDto,
  ) {
    return this.leads.changeStage(tenantId, id, dto);
  }
}
