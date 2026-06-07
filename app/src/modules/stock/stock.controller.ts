import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { StockService } from './stock.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { UpdateStockMovementDto } from './dto/update-stock-movement.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@PolicyResource('Stock')
@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Roles('ADMIN', 'OPERATIONS', 'AGENT')
  @Get('movements')
  movements(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.stock.movements(tenantId, query);
  }

  @Roles('ADMIN', 'OPERATIONS', 'AGENT')
  @PolicyAction('create')
  @Post('adjust')
  adjust(@Tenant() tenantId: string, @Body() dto: AdjustStockDto) {
    return this.stock.adjust(tenantId, dto);
  }

  @Roles('ADMIN', 'OPERATIONS')
  @Patch('movements/:id')
  updateMovement(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStockMovementDto,
  ) {
    return this.stock.updateMovement(tenantId, id, dto);
  }

  @Roles('ADMIN', 'OPERATIONS')
  @Delete('movements/:id')
  removeMovement(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.stock.removeMovement(tenantId, id);
  }
}
