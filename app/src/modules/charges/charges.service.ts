import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { QueueService } from '../../common/queue/queue.service';
import { LedgerService } from '../ledger/ledger.service';
import { PixService } from '../pix/pix.service';
import { SettingsService } from '../../common/settings/settings.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { REMINDER_JOB, ReminderJobPayload } from '../reminders/reminder.types';

@Injectable()
export class ChargesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly pix: PixService,
    private readonly settings: SettingsService,
  ) {}

  async create(tenantId: string, dto: CreateChargeDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Cliente nao encontrado neste tenant.');
    }

    const charge = await this.prisma.charge.create({
      data: {
        tenantId,
        customerId: customer.id,
        amountCents: dto.amountCents,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
      },
    });

    await this.ledger.post(tenantId, `charge:${charge.id}`, [
      {
        accountCode: 'ACCOUNTS_RECEIVABLE',
        direction: 'DEBIT',
        amountCents: charge.amountCents,
        description: `Cobranca ${charge.id}`,
      },
      {
        accountCode: 'REVENUE',
        direction: 'CREDIT',
        amountCents: charge.amountCents,
        description: `Receita da cobranca ${charge.id}`,
      },
    ]);

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CHARGE_CREATED',
      entityType: 'Charge',
      entityId: charge.id,
      metadata: { amountCents: charge.amountCents },
    });

    const payload: ReminderJobPayload = {
      tenantId,
      chargeId: charge.id,
      customerName: customer.name,
      phone: customer.phone,
      amountCents: charge.amountCents,
      dueDate: charge.dueDate.toISOString(),
    };
    this.queue.enqueue(REMINDER_JOB, payload);

    return charge;
  }

  list(tenantId: string) {
    return this.prisma.charge.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /// Devolve o PIX copia-e-cola valido para uma cobranca.
  async getPix(tenantId: string, id: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { id, tenantId },
    });
    if (!charge) {
      throw new NotFoundException('Cobranca nao encontrada neste tenant.');
    }
    const cfg = await this.settings.get(tenantId);
    const pixCopyPaste = this.pix.buildCopyPaste({
      pixKey: cfg.pixKey,
      merchantName: cfg.merchantName,
      merchantCity: cfg.merchantCity,
      amountCents: charge.amountCents,
      txid: charge.id,
    });
    return { chargeId: charge.id, amountCents: charge.amountCents, pixCopyPaste };
  }

  async pay(tenantId: string, id: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { id, tenantId },
    });
    if (!charge) {
      throw new NotFoundException('Cobranca nao encontrada neste tenant.');
    }
    if (charge.status !== 'PENDING') {
      throw new BadRequestException(
        `Cobranca nao esta PENDING (status atual: ${charge.status}).`,
      );
    }

    const updated = await this.prisma.charge.update({
      where: { id: charge.id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    await this.ledger.post(tenantId, `payment:${charge.id}`, [
      {
        accountCode: 'CASH',
        direction: 'DEBIT',
        amountCents: charge.amountCents,
        description: `Recebimento da cobranca ${charge.id}`,
      },
      {
        accountCode: 'ACCOUNTS_RECEIVABLE',
        direction: 'CREDIT',
        amountCents: charge.amountCents,
        description: `Baixa de contas a receber ${charge.id}`,
      },
    ]);

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CHARGE_PAID',
      entityType: 'Charge',
      entityId: charge.id,
    });

    return updated;
  }
}
