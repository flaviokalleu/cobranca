import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PayablesService } from './payables.service';
import { CreatePayableDto } from './dto/create-payable.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('payables')
export class PayablesController {
  constructor(private readonly payables: PayablesService) {}

  @Roles('ADMIN', 'FINANCE', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreatePayableDto) {
    return this.payables.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.payables.list(tenantId);
  }

  @Roles('ADMIN', 'FINANCE')
  @Post(':id/pay')
  pay(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.payables.pay(tenantId, id);
  }
}
