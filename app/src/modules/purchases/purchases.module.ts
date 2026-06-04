import { Module } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { StockModule } from '../stock/stock.module';
import { PayablesModule } from '../payables/payables.module';

@Module({
  imports: [StockModule, PayablesModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
