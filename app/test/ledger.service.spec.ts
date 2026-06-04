import { BadRequestException } from '@nestjs/common';
import { LedgerService } from '../src/modules/ledger/ledger.service';

/**
 * Testa a regra mais importante do sistema financeiro: a partida dobrada.
 * Usa um Prisma "de mentira" (mock) em memoria — nao precisa de banco.
 */
type Entry = {
  tenantId: string;
  accountCode: string;
  direction: 'DEBIT' | 'CREDIT';
  amountCents: number;
};

function makePrismaMock() {
  const rows: Entry[] = [];
  return {
    rows,
    ledgerEntry: {
      create: (args: { data: Entry }) => {
        rows.push(args.data);
        return Promise.resolve(args.data);
      },
      findMany: (args: { where: { tenantId: string } }) =>
        Promise.resolve(rows.filter((r) => r.tenantId === args.where.tenantId)),
    },
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  };
}

describe('LedgerService (partida dobrada)', () => {
  it('rejeita lancamento desbalanceado (debito != credito)', async () => {
    const ledger = new LedgerService(makePrismaMock() as never);
    await expect(
      ledger.post('t1', 'tx1', [
        { accountCode: 'AR', direction: 'DEBIT', amountCents: 1000, description: 'x' },
        { accountCode: 'REV', direction: 'CREDIT', amountCents: 999, description: 'y' },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige ao menos 2 partidas', async () => {
    const ledger = new LedgerService(makePrismaMock() as never);
    await expect(
      ledger.post('t1', 'tx', [
        { accountCode: 'X', direction: 'DEBIT', amountCents: 10, description: 'z' },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita valores nao positivos', async () => {
    const ledger = new LedgerService(makePrismaMock() as never);
    await expect(
      ledger.post('t1', 'tx', [
        { accountCode: 'A', direction: 'DEBIT', amountCents: 0, description: 'z' },
        { accountCode: 'B', direction: 'CREDIT', amountCents: 0, description: 'z' },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aceita lancamento balanceado e calcula saldos por conta', async () => {
    const prisma = makePrismaMock();
    const ledger = new LedgerService(prisma as never);

    await ledger.post('t1', 'charge:1', [
      { accountCode: 'ACCOUNTS_RECEIVABLE', direction: 'DEBIT', amountCents: 5000, description: 'x' },
      { accountCode: 'REVENUE', direction: 'CREDIT', amountCents: 5000, description: 'y' },
    ]);

    const balances = await ledger.balances('t1');
    expect(balances['ACCOUNTS_RECEIVABLE']).toBe(5000);
    expect(balances['REVENUE']).toBe(-5000);

    // Invariante global: a soma de todos os saldos do tenant deve ser zero.
    const total = Object.values(balances).reduce((s, v) => s + v, 0);
    expect(total).toBe(0);
  });

  it('isola saldos entre tenants', async () => {
    const prisma = makePrismaMock();
    const ledger = new LedgerService(prisma as never);

    await ledger.post('tenantA', 'tx', [
      { accountCode: 'CASH', direction: 'DEBIT', amountCents: 100, description: 'a' },
      { accountCode: 'REVENUE', direction: 'CREDIT', amountCents: 100, description: 'a' },
    ]);

    const balancesB = await ledger.balances('tenantB');
    expect(Object.keys(balancesB)).toHaveLength(0);
  });
});
