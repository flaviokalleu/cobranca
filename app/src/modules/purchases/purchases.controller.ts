import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

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
  list(@Tenant() tenantId: string) {
    return this.purchases.list(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'OPERATIONS', 'AGENT')
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
