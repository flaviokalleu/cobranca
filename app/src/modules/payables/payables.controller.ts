import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PayablesService } from './payables.service';
import { CreatePayableDto } from './dto/create-payable.dto';
import { UpdatePayableDto } from './dto/update-payable.dto';
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

  @Roles('ADMIN', 'FINANCE', 'AGENT')
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePayableDto,
  ) {
    return this.payables.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE')
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.payables.remove(tenantId, id);
  }
}
