import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async cashFlow(tenantId: string, from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);

    const [charges, payables] = await Promise.all([
      this.prisma.charge.findMany({
        where: { tenantId, ...(dateFilter ? { dueDate: dateFilter } : {}) },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.payable.findMany({
        where: { tenantId, ...(dateFilter ? { dueDate: dateFilter } : {}) },
        orderBy: { dueDate: 'asc' },
      }),
    ]);

    const baseRows = [
      ...charges.map((charge) => ({
        id: `charge:${charge.id}`,
        sourceId: charge.id,
        sourceType: 'RECEIVABLE',
        date: charge.status === 'PAID' && charge.paidAt ? charge.paidAt : charge.dueDate,
        description: charge.description,
        category: charge.category,
        recurrence: charge.recurrence,
        status: charge.status,
        inCents: charge.amountCents,
        outCents: 0,
      })),
      ...payables.map((payable) => ({
        id: `payable:${payable.id}`,
        sourceId: payable.id,
        sourceType: 'PAYABLE',
        date: payable.status === 'PAID' && payable.paidAt ? payable.paidAt : payable.dueDate,
        description: payable.description,
        category: payable.category,
        recurrence: payable.recurrence,
        status: payable.status,
        inCents: 0,
        outCents: payable.amountCents,
      })),
    ].sort((a, b) => {
      const byDate = a.date.getTime() - b.date.getTime();
      if (byDate !== 0) return byDate;
      return a.description.localeCompare(b.description);
    });

    let balance = 0;
    const rows = baseRows.map((row) => {
      balance += row.inCents - row.outCents;
      return { ...row, balanceCents: balance };
    });
    return { balanceCents: balance, rows: rows.reverse() };
  }

  async summary(tenantId: string, from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);

    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        tenantId,
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
    });

    const acc: Record<string, number> = {};
    for (const e of entries) {
      const sign = e.direction === 'DEBIT' ? 1 : -1;
      acc[e.accountCode] = (acc[e.accountCode] ?? 0) + sign * e.amountCents;
    }
    const revenueCents = -(acc['REVENUE'] ?? 0);
    const expenseCents = acc['EXPENSE'] ?? 0;
    const cashCents = acc['CASH'] ?? 0;

    const recv = await this.prisma.charge.aggregate({
      where: { tenantId, status: 'PENDING', ...(dateFilter ? { dueDate: dateFilter } : {}) },
      _sum: { amountCents: true },
    });
    const pay = await this.prisma.payable.aggregate({
      where: { tenantId, status: 'PENDING', ...(dateFilter ? { dueDate: dateFilter } : {}) },
      _sum: { amountCents: true },
    });

    return {
      revenueCents,
      expenseCents,
      resultCents: revenueCents - expenseCents,
      cashCents,
      aReceberCents: recv._sum.amountCents ?? 0,
      aPagarCents: pay._sum.amountCents ?? 0,
    };
  }

  private buildDateFilter(from?: string, to?: string) {
    if (!from && !to) return null;
    const filter: { gte?: Date; lte?: Date } = {};
    if (from) filter.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.lte = end;
    }
    return filter;
  }
}
