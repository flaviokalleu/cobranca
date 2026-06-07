import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@PolicyResource('Purchase')
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}

  @Roles('ADMIN', 'FINANCE', 'OPERATIONS', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchases.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'OPERATIONS', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.purchases.list(tenantId, query);
  }

  @Roles('ADMIN', 'FINANCE', 'OPERATIONS', 'AGENT')
  @PolicyAction('update')
  @Post(':id/receive')
  receive(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.purchases.receive(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'OPERATIONS', 'AGENT')
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.purchases.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'OPERATIONS')
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.purchases.remove(tenantId, id);
  }
}
