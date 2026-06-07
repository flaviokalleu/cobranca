import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(tenantId: string) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const [overdueCharges, overduePayables, lowStock, overdueTasks, pendingFinancialEntries, chargingDueToday] =
      await Promise.all([
        this.prisma.charge.findMany({ where: { tenantId, status: 'PENDING', dueDate: { lt: todayStart } } }),
        this.prisma.payable.findMany({ where: { tenantId, status: 'PENDING', dueDate: { lt: todayStart } } }),
        this.prisma.product.findMany({ where: { tenantId, stockQty: { lte: 0 }, active: true }, take: 10 }),
        this.prisma.task.count({ where: { tenantId, done: false, dueDate: { lt: todayStart } } }),
        this.prisma.financialEntry.count({ where: { tenantId, status: 'pending_confirmation' } }),
        this.prisma.charge.findMany({ where: { tenantId, status: 'PENDING', dueDate: { gte: todayStart, lte: todayEnd } } }),
      ]);
    return {
      overdueCharges: {
        count: overdueCharges.length,
        totalCents: overdueCharges.reduce((sum, item) => sum + item.amountCents, 0),
      },
      overduePayables: {
        count: overduePayables.length,
        totalCents: overduePayables.reduce((sum, item) => sum + item.amountCents, 0),
      },
      lowStock: {
        count: lowStock.length,
        items: lowStock.map((item) => ({ productId: item.id, productName: item.name, quantity: item.stockQty })),
      },
      overdueTasks: { count: overdueTasks },
      pendingFinancialEntries: { count: pendingFinancialEntries },
      chargingDueToday: {
        count: chargingDueToday.length,
        totalCents: chargingDueToday.reduce((sum, item) => sum + item.amountCents, 0),
        charges: chargingDueToday.map((item) => ({ id: item.id, description: item.description, amountCents: item.amountCents })),
      },
    };
  }

  @Cron('0 8 * * *')
  async dailyAlertDigest() {
    const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      const summary = await this.summary(tenant.id);
      const total =
        summary.overdueCharges.count +
        summary.overduePayables.count +
        summary.overdueTasks.count +
        summary.pendingFinancialEntries.count;
      if (total === 0) continue;
      await this.prisma.notification.create({
        data: {
          tenantId: tenant.id,
          channel: 'SYSTEM',
          title: 'Relatorio diario de atencao',
          message: `${summary.overdueCharges.count} cobrancas vencidas, ${summary.overduePayables.count} contas vencidas, ${summary.overdueTasks.count} tarefas atrasadas.`,
          status: 'UNREAD',
          entityType: 'Alert',
          entityId: tenant.id,
        },
      });
    }
  }
}
