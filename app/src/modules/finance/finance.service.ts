import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /// Fluxo de caixa projetado: contas a receber e contas a pagar com saldo acumulado.
  async cashFlow(tenantId: string) {
    const [charges, payables] = await Promise.all([
      this.prisma.charge.findMany({
        where: { tenantId },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.payable.findMany({
        where: { tenantId },
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
      return {
        ...row,
        balanceCents: balance,
      };
    });
    return { balanceCents: balance, rows: rows.reverse() };
  }

  /// DRE simplificado + totais a receber/a pagar.
  async summary(tenantId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({ where: { tenantId } });
    const acc: Record<string, number> = {};
    for (const e of entries) {
      const sign = e.direction === 'DEBIT' ? 1 : -1;
      acc[e.accountCode] = (acc[e.accountCode] ?? 0) + sign * e.amountCents;
    }
    const revenueCents = -(acc['REVENUE'] ?? 0); // conta credora
    const expenseCents = acc['EXPENSE'] ?? 0; // conta devedora
    const cashCents = acc['CASH'] ?? 0;

    const recv = await this.prisma.charge.aggregate({
      where: { tenantId, status: 'PENDING' },
      _sum: { amountCents: true },
    });
    const pay = await this.prisma.payable.aggregate({
      where: { tenantId, status: 'PENDING' },
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
}
