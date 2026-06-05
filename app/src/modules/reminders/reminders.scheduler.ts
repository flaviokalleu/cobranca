import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueueService } from '../../common/queue/queue.service';
import { WhatsappOutboundService } from '../whatsapp-bot/whatsapp-outbound.service';
import { REMINDER_JOB, ReminderJobPayload } from './reminder.types';

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger('RemindersScheduler');

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly outbound: WhatsappOutboundService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDaily(): Promise<void> {
    const [charges, owners] = await Promise.all([
      this.enqueueDue(),
      this.sendOwnerDailySummary(),
    ]);
    this.logger.log(`Lembretes clientes: ${charges} | Resumos enviados aos donos: ${owners}`);
  }

  async enqueueDue(): Promise<number> {
    const limit = new Date();
    limit.setDate(limit.getDate() + 3);

    const charges = await this.prisma.charge.findMany({
      where: { status: 'PENDING', dueDate: { lte: limit } },
      include: { customer: true },
    });

    for (const charge of charges) {
      const payload: ReminderJobPayload = {
        tenantId: charge.tenantId,
        chargeId: charge.id,
        customerName: charge.customer.name,
        phone: charge.customer.phone,
        amountCents: charge.amountCents,
        dueDate: charge.dueDate.toISOString(),
      };
      this.queue.enqueue(REMINDER_JOB, payload);
    }
    return charges.length;
  }

  async sendOwnerDailySummary(): Promise<number> {
    const { todayStart, todayEnd, tomorrowEnd } = this.dayRanges();

    const tenants = await this.prisma.whatsappUser.findMany({
      where: { status: 'ACTIVE' },
      select: { tenantId: true, phone: true },
    });

    // deduplica: um resumo por tenant (usa o primeiro usuario ativo encontrado)
    const byTenant = new Map<string, string>();
    for (const u of tenants) {
      if (!byTenant.has(u.tenantId)) byTenant.set(u.tenantId, u.phone);
    }

    let sent = 0;
    for (const [tenantId, phone] of byTenant) {
      const [tasksToday, tasksTomorrow, payablesToday, payablesTomorrow] =
        await Promise.all([
          this.prisma.task.findMany({
            where: { tenantId, done: false, dueDate: { gte: todayStart, lte: todayEnd } },
            orderBy: { priority: 'desc' },
          }),
          this.prisma.task.findMany({
            where: { tenantId, done: false, dueDate: { gt: todayEnd, lte: tomorrowEnd } },
            orderBy: { priority: 'desc' },
          }),
          this.prisma.payable.findMany({
            where: { tenantId, status: 'PENDING', dueDate: { gte: todayStart, lte: todayEnd } },
          }),
          this.prisma.payable.findMany({
            where: { tenantId, status: 'PENDING', dueDate: { gt: todayEnd, lte: tomorrowEnd } },
          }),
        ]);

      if (!tasksToday.length && !tasksTomorrow.length && !payablesToday.length && !payablesTomorrow.length) {
        continue;
      }

      const lines: string[] = ['*Bom dia! Aqui esta seu resumo do dia:*\n'];

      if (tasksToday.length) {
        lines.push(`*Tarefas para HOJE (${tasksToday.length}):*`);
        for (const t of tasksToday) {
          const flag = t.priority === 'HIGH' ? '🔴' : t.priority === 'LOW' ? '🟢' : '🟡';
          lines.push(`${flag} ${t.title}`);
        }
        lines.push('');
      }

      if (payablesToday.length) {
        const total = payablesToday.reduce((s, p) => s + p.amountCents, 0);
        lines.push(`*Contas a pagar HOJE (${payablesToday.length}) — ${this.money(total)}:*`);
        for (const p of payablesToday) lines.push(`• ${p.description} — ${this.money(p.amountCents)}`);
        lines.push('');
      }

      if (tasksTomorrow.length) {
        lines.push(`*Tarefas para AMANHA (${tasksTomorrow.length}):*`);
        for (const t of tasksTomorrow) lines.push(`• ${t.title}`);
        lines.push('');
      }

      if (payablesTomorrow.length) {
        const total = payablesTomorrow.reduce((s, p) => s + p.amountCents, 0);
        lines.push(`*Contas vencendo amanha (${payablesTomorrow.length}) — ${this.money(total)}:*`);
        for (const p of payablesTomorrow) lines.push(`• ${p.description} — ${this.money(p.amountCents)}`);
      }

      try {
        await this.outbound.sendText(phone, lines.join('\n').trim());
        sent++;
      } catch (err) {
        this.logger.warn(`Falha ao enviar resumo para ${phone}: ${String(err)}`);
      }
    }
    return sent;
  }

  private dayRanges() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
    return { todayStart, todayEnd, tomorrowEnd };
  }

  private money(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
