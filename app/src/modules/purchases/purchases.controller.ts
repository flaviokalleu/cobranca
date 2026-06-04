import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchases: PurchasesService) {}

  @Roles('ADMIN', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchases.create(tenantId, dto);
  }

  @Roles('ADMIN', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.purchases.list(tenantId);
  }

  @Roles('ADMIN', 'AGENT')
  @Post(':id/receive')
  receive(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.purchases.receive(tenantId, id);
  }
}
