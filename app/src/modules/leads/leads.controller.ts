import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ChangeStageDto } from './dto/change-stage.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Roles('ADMIN', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateLeadDto) {
    return this.leads.create(tenantId, dto);
  }

  @Roles('ADMIN', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.leads.list(tenantId);
  }

  @Roles('ADMIN', 'AGENT')
  @Patch(':id/stage')
  changeStage(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ChangeStageDto,
  ) {
    return this.leads.changeStage(tenantId, id, dto);
  }
}
