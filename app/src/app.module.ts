import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './common/prisma/prisma.module';
import { AuditModule } from './common/audit/audit.module';
import { QueueModule } from './common/queue/queue.module';
import { SettingsModule } from './common/settings/settings.module';

import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

import { HealthController } from './health.controller';
import { PixModule } from './modules/pix/pix.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ChargesModule } from './modules/charges/charges.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ProductsModule } from './modules/products/products.module';
import { StockModule } from './modules/stock/stock.module';
import { PayablesModule } from './modules/payables/payables.module';
import { FinanceModule } from './modules/finance/finance.module';
import { SalesModule } from './modules/sales/sales.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { LeadsModule } from './modules/leads/leads.module';
import { TenantsModule } from './modules/tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuditModule,
    QueueModule,
    SettingsModule,
    AuthModule,
    PixModule,
    RemindersModule,
    CustomersModule,
    ChargesModule,
    LedgerModule,
    SuppliersModule,
    ProductsModule,
    StockModule,
    PayablesModule,
    FinanceModule,
    SalesModule,
    PurchasesModule,
    TasksModule,
    LeadsModule,
    TenantsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Autenticacao (JWT) em todas as rotas, exceto @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Autorizacao (RBAC) por @Roles(). Roda depois da autenticacao.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
