import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export type Direction = 'DEBIT' | 'CREDIT';

export interface PostingLine {
  accountCode: string;
  direction: Direction;
  amountCents: number;
  description: string;
}

/**
 * Livro-razao em partida dobrada.
 * Regra de ouro: em toda transacao, total de DEBITOS == total de CREDITOS.
 * Se nao bater, o lancamento e rejeitado — garante integridade financeira.
 */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async post(
    tenantId: string,
    transactionId: string,
    lines: PostingLine[],
  ): Promise<void> {
    if (lines.length < 2) {
      throw new BadRequestException(
        'Lancamento exige ao menos 2 partidas (partida dobrada).',
      );
    }
    if (lines.some((l) => l.amountCents <= 0)) {
      throw new BadRequestException(
        'Valores de lancamento devem ser positivos (em centavos).',
      );
    }

    const debits = lines
      .filter((l) => l.direction === 'DEBIT')
      .reduce((sum, l) => sum + l.amountCents, 0);
    const credits = lines
      .filter((l) => l.direction === 'CREDIT')
      .reduce((sum, l) => sum + l.amountCents, 0);

    if (debits !== credits) {
      throw new BadRequestException(
        `Partida dobrada desbalanceada: debitos=${debits} creditos=${credits}.`,
      );
    }

    // Atomico: ou todas as partidas entram, ou nenhuma.
    await this.prisma.$transaction(
      lines.map((l) =>
        this.prisma.ledgerEntry.create({
          data: {
            tenantId,
            transactionId,
            accountCode: l.accountCode,
            direction: l.direction,
            amountCents: l.amountCents,
            description: l.description,
          },
        }),
      ),
    );
  }

  /// Saldo por conta (debitos positivos, creditos negativos), sempre por tenant.
  async balances(tenantId: string): Promise<Record<string, number>> {
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { tenantId },
    });
    const acc: Record<string, number> = {};
    for (const e of entries) {
      const sign = e.direction === 'DEBIT' ? 1 : -1;
      acc[e.accountCode] = (acc[e.accountCode] ?? 0) + sign * e.amountCents;
    }
    return acc;
  }
}
