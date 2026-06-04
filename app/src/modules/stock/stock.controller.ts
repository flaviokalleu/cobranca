import { Body, Controller, Get, Post } from '@nestjs/common';
import { StockService } from './stock.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Roles('ADMIN', 'AGENT')
  @Get('movements')
  movements(@Tenant() tenantId: string) {
    return this.stock.movements(tenantId);
  }

  @Roles('ADMIN', 'AGENT')
  @Post('adjust')
  adjust(@Tenant() tenantId: string, @Body() dto: AdjustStockDto) {
    return this.stock.adjust(tenantId, dto);
  }
}
