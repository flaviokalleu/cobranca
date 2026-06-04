import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { StockModule } from '../stock/stock.module';
import { ChargesModule } from '../charges/charges.module';

@Module({
  imports: [StockModule, ChargesModule],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
