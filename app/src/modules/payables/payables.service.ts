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
        recurrence: dto.recurrence ?? 'ONCE',
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
    const isPending = payable.status === 'PENDING';
    if (!isPending && dto.amountCents !== undefined && dto.amountCents !== payable.amountCents) {
      throw new BadRequestException('Valor de conta ja paga nao pode ser alterado.');
    }
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });
      if (!supplier) throw new NotFoundException('Fornecedor nao encontrado.');
    }

    const amountDelta = isPending
      ? (dto.amountCents ?? payable.amountCents) - payable.amountCents
      : 0;
    const updated = await this.prisma.$transaction(async (db) => {
      const next = await db.payable.update({
        where: { id: payable.id },
        data: {
          description: dto.description,
          amountCents: isPending ? dto.amountCents : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          supplierId: dto.supplierId === undefined ? undefined : dto.supplierId,
          category: dto.category === undefined ? undefined : dto.category,
          recurrence:
            dto.recurrence === undefined || dto.recurrence === null
              ? undefined
              : dto.recurrence,
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
    const linkedPurchases = await this.prisma.purchaseOrder.findMany({
      where: { tenantId, payableId: payable.id },
      select: { id: true },
    });

    await this.prisma.$transaction(async (db) => {
      await db.purchaseOrder.updateMany({
        where: { tenantId, payableId: payable.id },
        data: { payableId: null },
      });
      await db.calendarEvent.deleteMany({
        where: { tenantId, payableId: payable.id },
      });
      await db.notification.deleteMany({
        where: { tenantId, entityType: 'Payable', entityId: payable.id },
      });
      await db.ledgerEntry.deleteMany({
        where: {
          tenantId,
          OR: [
            { transactionId: `payable:${payable.id}` },
            { transactionId: `payable-pay:${payable.id}` },
            { transactionId: `payable-cancel:${payable.id}` },
            { transactionId: { startsWith: `payable-adjust:${payable.id}:` } },
          ],
        },
      });
      await db.payable.delete({ where: { id: payable.id } });
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PAYABLE_DELETED',
      entityType: 'Payable',
      entityId: payable.id,
      metadata: {
        previousStatus: payable.status,
        linkedPurchaseIds: linkedPurchases.map((purchase) => purchase.id),
      },
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
