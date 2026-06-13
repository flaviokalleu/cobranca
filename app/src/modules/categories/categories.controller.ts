import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  list(@Tenant() tenantId: string, @Query('type') type?: string) {
    return this.svc.list(tenantId, type);
  }

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateCategoryDto) {
    return this.svc.create(tenantId, dto);
  }

  @Patch(':id')
  update(@Tenant() tenantId: string, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.svc.remove(tenantId, id);
  }

  @Post('seed')
  seed(@Tenant() tenantId: string) {
    return this.svc.seedDefault(tenantId);
  }
}
