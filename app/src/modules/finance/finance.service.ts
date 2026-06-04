import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /// Fluxo de caixa: movimentos na conta CASH com saldo acumulado.
  async cashFlow(tenantId: string) {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { tenantId, accountCode: 'CASH' },
      orderBy: { createdAt: 'asc' },
    });
    let balance = 0;
    const rows = entries.map((e) => {
      const isIn = e.direction === 'DEBIT';
      balance += isIn ? e.amountCents : -e.amountCents;
      return {
        id: e.id,
        date: e.createdAt,
        description: e.description,
        inCents: isIn ? e.amountCents : 0,
        outCents: isIn ? 0 : e.amountCents,
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
