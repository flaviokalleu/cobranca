import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Roles('ADMIN', 'OPERATIONS', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateProductDto) {
    return this.products.create(tenantId, dto);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.products.list(tenantId);
  }

  @Roles('ADMIN', 'OPERATIONS', 'AGENT')
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'OPERATIONS')
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.products.remove(tenantId, id);
  }
}
