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
    const revenueCents = -((acc['REVENUE'] ?? 0) + (acc['INTEREST_REVENUE'] ?? 0));
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

  async kpis(tenantId: string, from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);
    const [charges, payables, whatsappEntries, openTasks, leadCount, customerCount] =
      await Promise.all([
        this.prisma.charge.findMany({
          where: { tenantId, ...(dateFilter ? { dueDate: dateFilter } : {}) },
          select: {
            amountCents: true,
            status: true,
            dueDate: true,
            paidAt: true,
            createdAt: true,
            category: true,
          },
        }),
        this.prisma.payable.findMany({
          where: { tenantId, ...(dateFilter ? { dueDate: dateFilter } : {}) },
          select: {
            amountCents: true,
            status: true,
            dueDate: true,
            paidAt: true,
            category: true,
          },
        }),
        this.prisma.financialEntry.findMany({
          where: {
            tenantId,
            status: { notIn: ['cancelled', 'error'] },
            ...(dateFilter ? { createdAt: dateFilter } : {}),
          },
          select: {
            tipo: true,
            valorCents: true,
            dataTransacao: true,
            createdAt: true,
            recorrencia: true,
            confianca: true,
            pagadorNome: true,
            recebedorNome: true,
          },
        }),
        this.prisma.task.count({ where: { tenantId, done: false } }),
        this.prisma.lead.count({ where: { tenantId } }),
        this.prisma.customer.count({ where: { tenantId } }),
      ]);

    const now = Date.now();
    const pendingCharges = charges.filter((charge) => charge.status === 'PENDING');
    const paidCharges = charges.filter((charge) => charge.status === 'PAID');
    const pendingPayables = payables.filter((payable) => payable.status === 'PENDING');
    const paidPayables = payables.filter((payable) => payable.status === 'PAID');
    const whatsappIncome = whatsappEntries.filter((entry) => entry.tipo === 'receita');
    const whatsappExpenses = whatsappEntries.filter((entry) => entry.tipo === 'gasto');

    const pendingReceivablesCents = this.sum(pendingCharges.map((charge) => charge.amountCents));
    const receivedCents = this.sum(paidCharges.map((charge) => charge.amountCents));
    const pendingPayablesCents = this.sum(pendingPayables.map((payable) => payable.amountCents));
    const paidExpensesCents = this.sum(paidPayables.map((payable) => payable.amountCents));
    const whatsappIncomeCents = this.sum(whatsappIncome.map((entry) => entry.valorCents));
    const whatsappExpenseCents = this.sum(whatsappExpenses.map((entry) => entry.valorCents));
    const totalIncomeCents = receivedCents + whatsappIncomeCents;
    const totalExpenseCents = paidExpensesCents + whatsappExpenseCents;
    const totalReceivableBase = pendingReceivablesCents + totalIncomeCents;
    const overdueCharges = pendingCharges.filter(
      (charge) => charge.dueDate.getTime() < now,
    ).length;

    const dsoDays = paidCharges.length
      ? Math.round(
          paidCharges.reduce((sum, charge) => {
            const paidAt = charge.paidAt ?? charge.dueDate;
            return sum + (paidAt.getTime() - charge.createdAt.getTime()) / 86_400_000;
          }, 0) / paidCharges.length,
        )
      : 0;
    const defaultRate =
      charges.length > 0 ? Math.round((overdueCharges / charges.length) * 100) : 0;

    return {
      pendingReceivablesCents,
      receivedCents,
      pendingPayablesCents,
      paidExpensesCents,
      whatsappIncomeCents,
      whatsappExpenseCents,
      totalIncomeCents,
      totalExpenseCents,
      balanceCents: totalIncomeCents - totalExpenseCents,
      projectedBalanceCents:
        totalIncomeCents + pendingReceivablesCents - totalExpenseCents - pendingPayablesCents,
      collectionRate: totalReceivableBase
        ? Math.round((totalIncomeCents / totalReceivableBase) * 100)
        : 0,
      overdueCharges,
      dsoDays,
      defaultRate,
      openTasks,
      leadCount,
      customerCount,
      whatsappCount: whatsappEntries.length,
      chart: this.buildKpiChart(charges, payables, whatsappEntries, from, to),
    };
  }

  async cashFlowProjection(tenantId: string, days = 90) {
    const safeDays = Math.max(1, Math.min(180, days || 90));
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + safeDays - 1);
    end.setHours(23, 59, 59, 999);
    const [summary, charges, payables] = await Promise.all([
      this.summary(tenantId),
      this.prisma.charge.findMany({
        where: { tenantId, status: 'PENDING', dueDate: { gte: start, lte: end } },
        include: { customer: { select: { name: true } } },
      }),
      this.prisma.payable.findMany({
        where: { tenantId, status: 'PENDING', dueDate: { gte: start, lte: end } },
      }),
    ]);
    let accumulatedCents = summary.cashCents;
    const rows = [];
    for (let index = 0; index < safeDays; index += 1) {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      const dayCharges = charges.filter((charge) => charge.dueDate.toISOString().slice(0, 10) === key);
      const dayPayables = payables.filter((payable) => payable.dueDate.toISOString().slice(0, 10) === key);
      const expectedInCents = this.sum(dayCharges.map((charge) => charge.amountCents));
      const expectedOutCents = this.sum(dayPayables.map((payable) => payable.amountCents));
      accumulatedCents += expectedInCents - expectedOutCents;
      rows.push({
        date: key,
        expectedInCents,
        expectedOutCents,
        accumulatedCents,
        charges: dayCharges.map((charge) => ({
          id: charge.id,
          customer: charge.customer.name,
          amountCents: charge.amountCents,
        })),
        payables: dayPayables.map((payable) => ({
          id: payable.id,
          description: payable.description,
          amountCents: payable.amountCents,
        })),
      });
    }
    const negative = rows.find((row) => row.accumulatedCents < 0);
    return {
      initialCashCents: summary.cashCents,
      days: rows,
      alert: Boolean(negative),
      alertDate: negative?.date ?? null,
      alertAmountCents: negative?.accumulatedCents ?? 0,
    };
  }

  async dre(tenantId: string, from?: string, to?: string) {
    const dateFilter = this.buildDateFilter(from, to);
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { tenantId, ...(dateFilter ? { createdAt: dateFilter } : {}) },
    });
    const revenue = entries.filter((entry) =>
      ['REVENUE', 'INTEREST_REVENUE'].includes(entry.accountCode) && entry.direction === 'CREDIT',
    );
    const expenses = entries.filter((entry) =>
      entry.accountCode === 'EXPENSE' && entry.direction === 'DEBIT',
    );
    const byAccount = (items: typeof entries) =>
      Object.values(
        items.reduce<Record<string, { account: string; amountCents: number }>>((acc, entry) => {
          acc[entry.accountCode] ??= { account: entry.accountCode, amountCents: 0 };
          acc[entry.accountCode].amountCents += entry.amountCents;
          return acc;
        }, {}),
      );
    const revenueTotal = this.sum(revenue.map((entry) => entry.amountCents));
    const expenseTotal = this.sum(expenses.map((entry) => entry.amountCents));
    return {
      revenue: { totalCents: revenueTotal, breakdown: byAccount(revenue) },
      expenses: { totalCents: expenseTotal, breakdown: byAccount(expenses) },
      grossProfitCents: revenueTotal - expenseTotal,
      operatingProfitCents: revenueTotal - expenseTotal,
      netProfitCents: revenueTotal - expenseTotal,
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

  private buildKpiChart(
    charges: Array<{ amountCents: number; status: string; dueDate: Date; paidAt: Date | null }>,
    payables: Array<{ amountCents: number; status: string; dueDate: Date; paidAt: Date | null }>,
    entries: Array<{
      tipo: string;
      valorCents: number;
      dataTransacao: Date | null;
      createdAt: Date;
    }>,
    from?: string,
    to?: string,
  ) {
    const start = from ? new Date(from) : this.relativeStart(30);
    start.setHours(0, 0, 0, 0);
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
    const monthly = days > 45;
    const points = new Map<string, { label: string; incomeCents: number; expenseCents: number }>();

    const ensure = (date: Date) => {
      const key = monthly
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        : date.toISOString().slice(0, 10);
      if (!points.has(key)) {
        points.set(key, {
          label: monthly
            ? date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
            : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          incomeCents: 0,
          expenseCents: 0,
        });
      }
      return points.get(key)!;
    };

    for (let cursor = new Date(start); cursor <= end; ) {
      ensure(cursor);
      if (monthly) cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      else cursor.setDate(cursor.getDate() + 1);
    }

    for (const charge of charges) {
      if (charge.status === 'CANCELED') continue;
      ensure(charge.paidAt ?? charge.dueDate).incomeCents += charge.amountCents;
    }
    for (const payable of payables) {
      if (payable.status === 'CANCELED') continue;
      ensure(payable.paidAt ?? payable.dueDate).expenseCents += payable.amountCents;
    }
    for (const entry of entries) {
      const point = ensure(entry.dataTransacao ?? entry.createdAt);
      if (entry.tipo === 'receita') point.incomeCents += entry.valorCents;
      if (entry.tipo === 'gasto') point.expenseCents += entry.valorCents;
    }

    return Array.from(points.entries()).map(([key, value]) => ({ key, ...value }));
  }

  private relativeStart(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1));
    return date;
  }

  private sum(values: number[]) {
    return values.reduce((total, value) => total + value, 0);
  }
}
