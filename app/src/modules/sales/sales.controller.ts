import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  @Roles('ADMIN', 'COMMERCIAL', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateSalesOrderDto) {
    return this.sales.create(tenantId, dto);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'FINANCE', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.sales.list(tenantId);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'AGENT')
  @Post(':id/confirm')
  confirm(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.sales.confirm(tenantId, id);
  }
}
