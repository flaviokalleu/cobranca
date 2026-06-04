import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { LedgerService } from '../ledger/ledger.service';
import { CreatePayableDto } from './dto/create-payable.dto';

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
