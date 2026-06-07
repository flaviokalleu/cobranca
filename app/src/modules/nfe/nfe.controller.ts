import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { CancelNfeDto } from './dto/nfe.dto';
import { NfeService } from './nfe.service';

@PolicyResource('NFe')
@Controller('nfe')
export class NfeController {
  constructor(private readonly nfe: NfeService) {}

  @Roles('ADMIN', 'FINANCE')
  @Post('charges/:chargeId/emit')
  emit(@Tenant() tenantId: string, @Param('chargeId') chargeId: string) {
    return this.nfe.emitForCharge(tenantId, chargeId);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.nfe.list(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @Get(':id')
  status(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.nfe.status(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE')
  @PolicyAction('delete')
  @Post(':id/cancel')
  cancel(@Tenant() tenantId: string, @Param('id') id: string, @Body() dto: CancelNfeDto) {
    return this.nfe.cancel(tenantId, id, dto.reason);
  }
}
