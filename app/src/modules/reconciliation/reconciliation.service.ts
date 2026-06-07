import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

  async run(tenantId: string, accountId: string, from?: string, to?: string) {
    const account = await this.prisma.openFinanceBankAccount.findFirst({ where: { tenantId, id: accountId } });
    if (!account) throw new NotFoundException('Conta bancaria nao encontrada.');
    const dateFilter = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
    const [transactions, charges] = await Promise.all([
      this.prisma.openFinanceTransaction.findMany({
        where: { tenantId, accountId, type: 'CREDIT', ...(from || to ? { date: dateFilter } : {}) },
        orderBy: { date: 'asc' },
      }),
      this.prisma.charge.findMany({ where: { tenantId, status: 'PENDING' }, include: { customer: true } }),
    ]);
    const matched = [];
    const suspects = [];
    const unmatched = [];
    for (const tx of transactions) {
      const exact = charges.find(
        (charge) => charge.amountCents === tx.amountCents && Math.abs(charge.dueDate.getTime() - tx.date.getTime()) <= 3 * 86_400_000,
      );
      if (exact) {
        matched.push({ transactionId: tx.id, chargeId: exact.id, amountCents: tx.amountCents });
        continue;
      }
      const suspect = charges.find((charge) => Math.abs(charge.amountCents - tx.amountCents) <= Math.round(charge.amountCents * 0.05));
      if (suspect) suspects.push({ transactionId: tx.id, chargeId: suspect.id, amountCents: tx.amountCents });
      else unmatched.push({ transactionId: tx.id, amountCents: tx.amountCents, description: tx.description });
    }
    const period = from ? from.slice(0, 7) : new Date().toISOString().slice(0, 7);
    return this.prisma.reconciliationResult.create({
      data: {
        tenantId,
        accountId,
        period,
        matchedCount: matched.length,
        suspectCount: suspects.length,
        unmatchedCount: unmatched.length,
        totalMatchedCents: matched.reduce((sum, item) => sum + item.amountCents, 0),
        details: { matched, suspects, unmatched },
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.reconciliationResult.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }
}
