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
import { DocumentsModule } from './modules/documents/documents.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AiModule } from './modules/ai/ai.module';
import { PersonalFinanceModule } from './modules/personal-finance/personal-finance.module';
import { BillingModule } from './modules/billing/billing.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { FinancialEntriesModule } from './modules/financial-entries/financial-entries.module';
import { FinancialExtractorModule } from './modules/financial-extractor/financial-extractor.module';
import { WhatsappAdminModule } from './modules/whatsapp-admin/whatsapp-admin.module';
import { WhatsappBotModule } from './modules/whatsapp-bot/whatsapp-bot.module';

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
    DocumentsModule,
    CalendarModule,
    NotificationsModule,
    AiModule,
    PersonalFinanceModule,
    BillingModule,
    CompaniesModule,
    FinancialExtractorModule,
    FinancialEntriesModule,
    WhatsappBotModule,
    WhatsappAdminModule,
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
