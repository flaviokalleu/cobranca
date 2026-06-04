import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { CreatePayableDto } from './dto/create-payable.dto';
import { UpdatePayableDto } from './dto/update-payable.dto';

@Injectable()
export class PayablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreatePayableDto) {
    const payable = await this.prisma.payable.create({
      data: {
        tenantId,
        supplierId: dto.supplierId ?? null,
        description: dto.description,
        amountCents: dto.amountCents,
        dueDate: new Date(dto.dueDate),
        category: dto.category ?? null,
      },
    });
    // Reconhece a despesa: Despesa (débito) / Contas a Pagar (crédito).
    await this.ledger.post(tenantId, `payable:${payable.id}`, [
      {
        accountCode: 'EXPENSE',
        direction: 'DEBIT',
        amountCents: payable.amountCents,
        description: `Despesa: ${payable.description}`,
      },
      {
        accountCode: 'ACCOUNTS_PAYABLE',
        direction: 'CREDIT',
        amountCents: payable.amountCents,
        description: `A pagar ${payable.id}`,
      },
    ]);
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PAYABLE_CREATED',
      entityType: 'Payable',
      entityId: payable.id,
      metadata: { amountCents: payable.amountCents },
    });
    return payable;
  }

  list(tenantId: string) {
    return this.prisma.payable.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdatePayableDto) {
    const payable = await this.prisma.payable.findFirst({
      where: { id, tenantId },
    });
    if (!payable) {
      throw new NotFoundException('Conta a pagar nao encontrada neste tenant.');
    }
    if (payable.status !== 'PENDING') {
      throw new BadRequestException('Somente contas pendentes podem ser editadas.');
    }
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });
      if (!supplier) throw new NotFoundException('Fornecedor nao encontrado.');
    }

    const amountDelta = (dto.amountCents ?? payable.amountCents) - payable.amountCents;
    const updated = await this.prisma.$transaction(async (db) => {
      const next = await db.payable.update({
        where: { id: payable.id },
        data: {
          description: dto.description,
          amountCents: dto.amountCents,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          supplierId: dto.supplierId === undefined ? undefined : dto.supplierId,
          category: dto.category === undefined ? undefined : dto.category,
        },
      });

      if (amountDelta !== 0) {
        const absDelta = Math.abs(amountDelta);
        const transactionId = `payable-adjust:${payable.id}:${Date.now()}`;
        const increase = amountDelta > 0;
        await db.ledgerEntry.createMany({
          data: [
            {
              tenantId,
              transactionId,
              accountCode: increase ? 'EXPENSE' : 'ACCOUNTS_PAYABLE',
              direction: 'DEBIT',
              amountCents: absDelta,
              description: `Ajuste a pagar ${payable.id}`,
            },
            {
              tenantId,
              transactionId,
              accountCode: increase ? 'ACCOUNTS_PAYABLE' : 'EXPENSE',
              direction: 'CREDIT',
              amountCents: absDelta,
              description: `Ajuste a pagar ${payable.id}`,
            },
          ],
        });
      }

      return next;
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PAYABLE_UPDATED',
      entityType: 'Payable',
      entityId: payable.id,
      metadata: { amountDelta },
    });
    return updated;
  }

  async remove(tenantId: string, id: string) {
    const payable = await this.prisma.payable.findFirst({
      where: { id, tenantId },
    });
    if (!payable) {
      throw new NotFoundException('Conta a pagar nao encontrada neste tenant.');
    }
    if (payable.status !== 'PENDING') {
      throw new BadRequestException('Somente contas pendentes podem ser canceladas.');
    }
    const linkedPurchase = await this.prisma.purchaseOrder.findFirst({
      where: { tenantId, payableId: payable.id },
    });
    if (linkedPurchase) {
      throw new BadRequestException(
        'Conta vinculada a pedido de compra recebido nao pode ser excluida diretamente.',
      );
    }

    await this.prisma.$transaction(async (db) => {
      await db.payable.update({
        where: { id: payable.id },
        data: { status: 'CANCELED' },
      });
      await db.ledgerEntry.createMany({
        data: [
          {
            tenantId,
            transactionId: `payable-cancel:${payable.id}`,
            accountCode: 'ACCOUNTS_PAYABLE',
            direction: 'DEBIT',
            amountCents: payable.amountCents,
            description: `Cancelamento a pagar ${payable.id}`,
          },
          {
            tenantId,
            transactionId: `payable-cancel:${payable.id}`,
            accountCode: 'EXPENSE',
            direction: 'CREDIT',
            amountCents: payable.amountCents,
            description: `Cancelamento: ${payable.description}`,
          },
        ],
      });
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PAYABLE_CANCELED',
      entityType: 'Payable',
      entityId: payable.id,
    });
    return { ok: true };
  }

  async pay(tenantId: string, id: string) {
    const payable = await this.prisma.payable.findFirst({
      where: { id, tenantId },
    });
    if (!payable) {
      throw new NotFoundException('Conta a pagar não encontrada neste tenant.');
    }
    if (payable.status !== 'PENDING') {
      throw new BadRequestException(
        `Conta não está PENDING (status atual: ${payable.status}).`,
      );
    }
    const updated = await this.prisma.payable.update({
      where: { id: payable.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    // Baixa o pagamento: Contas a Pagar (débito) / Caixa (crédito).
    await this.ledger.post(tenantId, `payable-pay:${payable.id}`, [
      {
        accountCode: 'ACCOUNTS_PAYABLE',
        direction: 'DEBIT',
        amountCents: payable.amountCents,
        description: `Baixa a pagar ${payable.id}`,
      },
      {
        accountCode: 'CASH',
        direction: 'CREDIT',
        amountCents: payable.amountCents,
        description: `Pagamento: ${payable.description}`,
      },
    ]);
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PAYABLE_PAID',
      entityType: 'Payable',
      entityId: payable.id,
    });
    return updated;
  }
}
