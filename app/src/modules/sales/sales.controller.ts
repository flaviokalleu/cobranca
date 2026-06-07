import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@PolicyResource('Sale')
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
  list(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.sales.list(tenantId, query);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'AGENT')
  @PolicyAction('update')
  @Post(':id/confirm')
  confirm(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.sales.confirm(tenantId, id);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'AGENT')
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalesOrderDto,
  ) {
    return this.sales.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'COMMERCIAL')
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.sales.remove(tenantId, id);
  }
}
