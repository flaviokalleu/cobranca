import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliers: SuppliersService) {}

  @Roles('ADMIN', 'FINANCE', 'OPERATIONS', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateSupplierDto) {
    return this.suppliers.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'OPERATIONS', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.suppliers.list(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'OPERATIONS', 'AGENT')
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliers.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'OPERATIONS')
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.suppliers.remove(tenantId, id);
  }
}
