import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { ApplyChargeTemplateDto, CreateChargeTemplateDto, UpdateChargeTemplateDto } from './dto/charge-template.dto';
import { ChargeTemplatesService } from './charge-templates.service';

@PolicyResource('ChargeTemplate')
@Controller('charge-templates')
export class ChargeTemplatesController {
  constructor(private readonly templates: ChargeTemplatesService) {}

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.templates.list(tenantId);
  }

  @Roles('ADMIN', 'FINANCE')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateChargeTemplateDto) {
    return this.templates.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE')
  @Patch(':id')
  update(@Tenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateChargeTemplateDto) {
    return this.templates.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE')
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.templates.remove(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @PolicyAction('create')
  @Post(':id/apply')
  apply(@Tenant() tenantId: string, @Param('id') id: string, @Body() dto: ApplyChargeTemplateDto) {
    return this.templates.apply(tenantId, id, dto);
  }
}
