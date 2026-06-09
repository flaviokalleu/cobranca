import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueueService } from '../../common/queue/queue.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../../common/audit/audit.service';
import { WhatsappOutboundService } from '../whatsapp-bot/whatsapp-outbound.service';
import { REMINDER_JOB, ReminderJobPayload } from './reminder.types';

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger('RemindersScheduler');

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
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
    this.logger.log(`[Scheduler] enqueueDue: processando ate 500 registros`);
    const limit = new Date();
    limit.setDate(limit.getDate() + 3);

    const charges = await this.prisma.charge.findMany({
      where: { status: 'PENDING', dueDate: { lte: limit } },
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            whatsapp: true,
            notifyConsented: true,
          },
        },
      },
      take: 500,
    });

    let enqueued = 0;
    for (const charge of charges) {
      // Only send WhatsApp if customer consented (LGPD)
      if (!charge.customer.notifyConsented) continue;

      const payload: ReminderJobPayload = {
        tenantId: charge.tenantId,
        chargeId: charge.id,
        customerName: charge.customer.name,
        phone: charge.customer.whatsapp ?? charge.customer.phone,
        amountCents: charge.amountCents,
        dueDate: charge.dueDate.toISOString(),
      };
      this.queue.enqueue(REMINDER_JOB, payload);
      enqueued++;
    }
    this.logger.log(`[Scheduler] enqueueDue: ${enqueued} lembretes enfileirados de ${charges.length} cobrancas`);
    return enqueued;
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

  // Roda no dia 1 de cada mes as 8h: envia resumo financeiro pessoal por WhatsApp.
  @Cron('0 8 1 * *')
  async sendMonthlyPersonalReport(): Promise<void> {
    this.logger.log(`[Scheduler] sendMonthlyPersonalReport: processando ate 500 registros`);
    const tenants = await this.prisma.whatsappUser.findMany({
      where: { status: 'ACTIVE' },
      select: { tenantId: true, phone: true },
      take: 500,
    });
    const byTenant = new Map<string, string>();
    for (const u of tenants) {
      if (!byTenant.has(u.tenantId)) byTenant.set(u.tenantId, u.phone);
    }
    let sent = 0;
    for (const [, phone] of byTenant) {
      try {
        const now = new Date();
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const start = new Date(prev.getFullYear(), prev.getMonth(), 1);
        const end = new Date(prev.getFullYear(), prev.getMonth() + 1, 0, 23, 59, 59, 999);
        const tenantId = [...byTenant.entries()].find(([, p]) => p === phone)?.[0] ?? '';
        const txs = await this.prisma.personalFinanceTransaction.findMany({
          where: { tenantId, occurredAt: { gte: start, lte: end } },
        });
        const income = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amountCents, 0);
        const expense = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amountCents, 0);
        const result = income - expense;
        const monthName = prev.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const msg = `📊 *Resumo de ${monthName}*\n💰 Receitas: ${this.money(income)}\n💸 Gastos: ${this.money(expense)}\n${result >= 0 ? '✅' : '⚠️'} Resultado: ${this.money(result)}`;
        await this.outbound.sendText(phone, msg);
        sent++;
      } catch (err) {
        this.logger.warn(`Falha ao enviar relatorio mensal: ${String(err)}`);
      }
    }
    this.logger.log(`[Scheduler] sendMonthlyPersonalReport: relatorios enviados: ${sent}`);
  }

  // Roda no dia 1 de cada mes: gera proxima cobranca/conta para recorrencias MONTHLY.
  @Cron('0 6 1 * *')
  async createMonthlyRecurrences(): Promise<void> {
    this.logger.log(`[Scheduler] createMonthlyRecurrences: processando ate 500 registros`);
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const [charges, payables] = await Promise.all([
      this.prisma.charge.findMany({
        where: { recurrence: 'MONTHLY', status: 'PAID' },
        include: { customer: true },
        orderBy: { dueDate: 'desc' },
        take: 500,
      }),
      this.prisma.payable.findMany({
        where: { recurrence: 'MONTHLY', status: 'PAID' },
        orderBy: { dueDate: 'desc' },
        take: 500,
      }),
    ]);

    // Deduplica: apenas a cobranca mais recente por cliente+descricao
    const seenCharges = new Set<string>();
    let chargesCreated = 0;
    for (const c of charges) {
      const key = `${c.tenantId}:${c.customerId}:${c.description}`;
      if (seenCharges.has(key)) continue;
      seenCharges.add(key);

      const dueDate = new Date(c.dueDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
      if (dueDate < now) dueDate.setTime(nextMonth.getTime());

      const newCharge = await this.prisma.charge.create({
        data: {
          tenantId: c.tenantId,
          customerId: c.customerId,
          amountCents: c.amountCents,
          description: c.description,
          category: c.category,
          recurrence: 'MONTHLY',
          dueDate,
        },
      });
      await this.ledger.post(c.tenantId, `charge:${newCharge.id}`, [
        { accountCode: 'ACCOUNTS_RECEIVABLE', direction: 'DEBIT', amountCents: newCharge.amountCents, description: `Cobranca mensal ${newCharge.id}` },
        { accountCode: 'REVENUE', direction: 'CREDIT', amountCents: newCharge.amountCents, description: `Receita mensal ${newCharge.id}` },
      ]);
      await this.audit.record({ tenantId: c.tenantId, actor: 'scheduler', action: 'CHARGE_CREATED', entityType: 'Charge', entityId: newCharge.id, metadata: { recurrence: 'MONTHLY' } });
      this.queue.enqueue(REMINDER_JOB, { tenantId: c.tenantId, chargeId: newCharge.id, customerName: c.customer.name, phone: c.customer.phone, amountCents: newCharge.amountCents, dueDate: newCharge.dueDate.toISOString() } as ReminderJobPayload);
      chargesCreated++;
    }

    // Deduplica payables por descricao+tenant
    const seenPayables = new Set<string>();
    let payablesCreated = 0;
    for (const p of payables) {
      const key = `${p.tenantId}:${p.description}`;
      if (seenPayables.has(key)) continue;
      seenPayables.add(key);

      const dueDate = new Date(p.dueDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
      if (dueDate < now) dueDate.setTime(nextMonth.getTime());

      const newPayable = await this.prisma.payable.create({
        data: {
          tenantId: p.tenantId,
          description: p.description,
          amountCents: p.amountCents,
          dueDate,
          supplierId: p.supplierId,
          category: p.category,
          recurrence: 'MONTHLY',
        },
      });
      await this.ledger.post(p.tenantId, `payable:${newPayable.id}`, [
        { accountCode: 'EXPENSE', direction: 'DEBIT', amountCents: newPayable.amountCents, description: `Despesa mensal ${newPayable.id}` },
        { accountCode: 'ACCOUNTS_PAYABLE', direction: 'CREDIT', amountCents: newPayable.amountCents, description: `Conta a pagar mensal ${newPayable.id}` },
      ]);
      payablesCreated++;
    }

    this.logger.log(`[Scheduler] createMonthlyRecurrences: ${chargesCreated} cobrancas + ${payablesCreated} despesas criadas`);
  }

  private money(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
