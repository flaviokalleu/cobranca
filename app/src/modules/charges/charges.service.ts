import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { QueueService } from '../../common/queue/queue.service';
import { LedgerService } from '../ledger/ledger.service';
import { PixService } from '../pix/pix.service';
import { SettingsService } from '../../common/settings/settings.service';
import { WhatsappOutboundService } from '../whatsapp-bot/whatsapp-outbound.service';
import { NfeService } from '../nfe/nfe.service';
import { PushService } from '../push/push.service';
import { AsaasGatewayService } from '../asaas/asaas-gateway.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';
import { REMINDER_JOB, ReminderJobPayload } from '../reminders/reminder.types';
import {
  paginated,
  paginationArgs,
  PaginationDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class ChargesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly pix: PixService,
    private readonly settings: SettingsService,
    private readonly events: EventEmitter2,
    private readonly whatsapp: WhatsappOutboundService,
    private readonly nfe: NfeService,
    private readonly push: PushService,
    private readonly asaas: AsaasGatewayService,
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
        category: dto.category ?? null,
        recurrence: dto.recurrence ?? 'ONCE',
        nextDueAt: this.resolveInitialNextDueAt(dto.dueDate, dto.recurrence, dto.nextDueAt),
        publicToken: this.newPublicToken(),
        interestMode: dto.interestMode ?? 'NONE',
        interestRateBps: dto.interestRateBps ?? 0,
        interestGraceDays: dto.interestGraceDays ?? 0,
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
    await this.syncChargeCalendar(charge);

    // Auto-cria Lead no CRM se ainda nao existir para este cliente
    const existingLead = await this.prisma.lead.findFirst({
      where: { tenantId, customerId: customer.id },
    });
    if (!existingLead) {
      await this.prisma.lead.create({
        data: {
          tenantId,
          customerId: customer.id,
          name: customer.name,
          phone: customer.phone ?? null,
          whatsapp: customer.whatsapp ?? null,
          email: customer.email ?? null,
          city: customer.city ?? null,
          estimatedCents: charge.amountCents,
          stage: 'LEAD', // always start at LEAD; stage progression is manual
        },
      });
    }

    const payload: ReminderJobPayload = {
      tenantId,
      chargeId: charge.id,
      customerName: customer.name,
      phone: customer.phone,
      amountCents: charge.amountCents,
      dueDate: charge.dueDate.toISOString(),
    };
    this.queue.enqueue(REMINDER_JOB, payload);

    // Sincroniza com Asaas via fila (com retry em caso de falha)
    void this.asaas.isEnabled(tenantId).then((enabled) => {
      if (enabled) {
        this.queue.enqueue('asaas.sync', { tenantId, chargeId: charge.id });
      }
    });

    return charge;
  }

  async list(tenantId: string, query: PaginationDto) {
    const { skip, take } = paginationArgs(query);
    const search = query.search?.trim();
    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: 'insensitive' as const } },
              { category: { contains: search, mode: 'insensitive' as const } },
              { customer: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.charge.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true } } },
        skip,
        take,
      }),
      this.prisma.charge.count({ where }),
    ]);
    return paginated(await this.ensurePublicTokens(data), total, query);
  }

  async get(tenantId: string, id: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { tenantId, id },
      include: {
        customer: { select: { id: true, name: true, phone: true, whatsapp: true, email: true } },
        nfe: true,
      },
    });
    if (!charge) throw new NotFoundException('Cobranca nao encontrada neste tenant.');
    const [ledger, calendar] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where: {
          tenantId,
          transactionId: { in: [`charge:${charge.id}`, `payment:${charge.id}`] },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.calendarEvent.findMany({
        where: { tenantId, chargeId: charge.id },
        orderBy: { startsAt: 'asc' },
      }),
    ]);
    const withToken = (await this.ensurePublicTokens([charge]))[0];
    return { ...withToken, ledger, calendar };
  }

  async exportCsv(tenantId: string): Promise<string> {
    const charges = await this.prisma.charge.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    });

    return stringify(
      charges.map((charge) => ({
        customerName: charge.customer.name,
        customerDocument: charge.customer.document ?? '',
        customerPhone: charge.customer.phone,
        customerWhatsapp: charge.customer.whatsapp ?? '',
        customerEmail: charge.customer.email ?? '',
        amountCents: charge.amountCents,
        description: charge.description,
        dueDate: this.formatDate(charge.dueDate),
        status: charge.status,
        category: charge.category ?? '',
        recurrence: charge.recurrence,
        interestMode: charge.interestMode,
        interestRateBps: charge.interestRateBps,
        interestGraceDays: charge.interestGraceDays,
        nextDueAt: charge.nextDueAt ? this.formatDate(charge.nextDueAt) : '',
        publicUrlToken: charge.publicToken ?? '',
        paidAt: charge.paidAt ? charge.paidAt.toISOString() : '',
        paidAmountCents: charge.paidAmountCents ?? '',
        createdAt: charge.createdAt.toISOString(),
      })),
      { header: true },
    );
  }

  async importCsv(tenantId: string, content: string) {
    const rows = this.parseCsv(content);
    const results: { row: number; ok: boolean; error?: string }[] = [];
    let paid = 0;

    await this.prisma.$transaction(async () => {
      for (let i = 0; i < rows.length; i++) {
        try {
          const { charge, status } = await this.rowToChargeDto(tenantId, rows[i]);
          const created = await this.create(tenantId, charge);
          if (status === 'PAID') {
            await this.pay(tenantId, created.id);
            paid += 1;
          }
          results.push({ row: i + 1, ok: true });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          results.push({ row: i + 1, ok: false, error: msg });
          throw new Error(`Linha ${i + 1}: ${msg}`); // forces rollback
        }
      }
    }, { timeout: 30000 });

    const imported = results.filter(r => r.ok).length;

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CHARGES_CSV_IMPORTED',
      entityType: 'Charge',
      entityId: tenantId,
      metadata: { imported, paid, errors: results.filter(r => !r.ok).length },
    });

    return { imported, results };
  }

  upcoming(tenantId: string, days = 30) {
    const now = new Date();
    const until = new Date(now);
    until.setDate(until.getDate() + days);
    return this.prisma.charge.findMany({
      where: {
        tenantId,
        recurrence: 'MONTHLY',
        status: 'PAID',
        nextDueAt: {
          not: null,
          gte: now,
          lte: until,
        },
      },
      orderBy: { nextDueAt: 'asc' },
      include: { customer: { select: { id: true, name: true, phone: true, whatsapp: true } } },
    });
  }

  async generateMonthlyDueCharges(now = new Date(), tenantId?: string) {
    const dueTemplates = await this.prisma.charge.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        recurrence: 'MONTHLY',
        status: 'PAID',
        nextDueAt: { not: null, lte: now },
      },
      include: { customer: true },
      orderBy: { nextDueAt: 'asc' },
      take: 100,
    });

    const generated = [];
    for (const template of dueTemplates) {
      if (!template.nextDueAt) continue;
      const dueAt = template.nextDueAt;
      const newDueDate = dueAt;
      const startOfMonth = new Date(newDueDate);
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      const alreadyExists = await this.prisma.charge.findFirst({
        where: {
          tenantId: template.tenantId,
          customerId: template.customerId,
          description: template.description,
          dueDate: { gte: startOfMonth, lt: endOfMonth },
          recurrence: 'ONCE',
        },
      });
      if (alreadyExists) continue; // skip - already generated this month

      const nextDueAt = this.addMonths(dueAt, 1);
      const created = await this.prisma.$transaction(async (db) => {
        const fresh = await db.charge.findFirst({
          where: {
            id: template.id,
            recurrence: 'MONTHLY',
            status: 'PAID',
            nextDueAt: dueAt,
          },
        });
        if (!fresh?.nextDueAt || fresh.nextDueAt.getTime() > now.getTime()) return null;

        const charge = await db.charge.create({
          data: {
            tenantId: fresh.tenantId,
            customerId: fresh.customerId,
            amountCents: fresh.amountCents,
            description: fresh.description,
            dueDate: dueAt,
            category: fresh.category,
            recurrence: 'ONCE',
            nextDueAt: null,
          },
        });

        await db.charge.update({
          where: { id: fresh.id },
          data: { nextDueAt },
        });

        await db.ledgerEntry.createMany({
          data: this.chargeLedgerEntries(fresh.tenantId, charge.id, charge.amountCents),
        });

        return charge;
      });

      if (!created) continue;
      generated.push(created);
      await this.syncChargeCalendar(created);
      this.queue.enqueue(REMINDER_JOB, {
        tenantId: created.tenantId,
        chargeId: created.id,
        customerName: template.customer.name,
        phone: template.customer.whatsapp ?? template.customer.phone,
        amountCents: created.amountCents,
        dueDate: created.dueDate.toISOString(),
      });
      await this.audit.record({
        tenantId: created.tenantId,
        actor: 'system',
        action: 'MONTHLY_CHARGE_GENERATED',
        entityType: 'Charge',
        entityId: created.id,
        metadata: { templateChargeId: template.id, nextDueAt },
      });
    }

    return { generated: generated.length, charges: generated };
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
    const settlement = this.settlementAmount(charge);
    const pixCopyPaste = this.pix.buildCopyPaste({
      pixKey: cfg.pixKey,
      merchantName: cfg.merchantName,
      merchantCity: cfg.merchantCity,
      amountCents: settlement.amountCents,
      txid: charge.id,
    });
    return {
      chargeId: charge.id,
      amountCents: settlement.amountCents,
      principalCents: charge.amountCents,
      interestCents: settlement.interestCents,
      pixCopyPaste,
    };
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

    const settlement = this.settlementAmount(charge);
    const updated = await this.prisma.charge.update({
      where: { id: charge.id },
      data: { status: 'PAID', paidAt: new Date(), paidAmountCents: settlement.amountCents },
    });

    await this.ledger.post(tenantId, `payment:${charge.id}`, [
      {
        accountCode: 'CASH',
        direction: 'DEBIT',
        amountCents: settlement.amountCents,
        description: `Recebimento da cobranca ${charge.id}`,
      },
      {
        accountCode: 'ACCOUNTS_RECEIVABLE',
        direction: 'CREDIT',
        amountCents: charge.amountCents,
        description: `Baixa de contas a receber ${charge.id}`,
      },
      ...(settlement.interestCents > 0
        ? [
            {
              accountCode: 'INTEREST_REVENUE',
              direction: 'CREDIT' as const,
              amountCents: settlement.interestCents,
              description: `Juros da cobranca ${charge.id}`,
            },
          ]
        : []),
    ]);

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CHARGE_PAID',
      entityType: 'Charge',
      entityId: charge.id,
      metadata: { interestCents: settlement.interestCents },
    });
    this.events.emit('notification.realtime', {
      tenantId,
      type: 'charge.paid',
      payload: { chargeId: charge.id, amountCents: charge.amountCents },
    });
    await this.push.notifyTenant(tenantId, {
      title: 'Pagamento recebido',
      body: `${charge.description}: ${(settlement.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
      url: `/dashboard/cobrancas/${charge.id}`,
      tag: `charge-paid-${charge.id}`,
      data: { chargeId: charge.id },
    });
    await this.emitNfeIfEnabled(tenantId, charge.id);

    return updated;
  }

  /// Edita apenas descricao/vencimento — valor nao muda para nao desbalancear o razao.
  async update(tenantId: string, id: string, dto: UpdateChargeDto) {
    const charge = await this.prisma.charge.findFirst({ where: { id, tenantId } });
    if (!charge) {
      throw new NotFoundException('Cobranca nao encontrada neste tenant.');
    }
    const updated = await this.prisma.charge.update({
      where: { id: charge.id },
      data: {
        description: dto.description ?? undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        category: dto.category === undefined ? undefined : dto.category,
        recurrence: dto.recurrence ?? undefined,
        nextDueAt: this.resolveUpdatedNextDueAt(charge, dto),
        interestMode: dto.interestMode ?? undefined,
        interestRateBps: dto.interestRateBps ?? undefined,
        interestGraceDays: dto.interestGraceDays ?? undefined,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CHARGE_UPDATED',
      entityType: 'Charge',
      entityId: charge.id,
    });
    await this.syncChargeCalendar(updated);
    return updated;
  }

  async sendWhatsappReminder(tenantId: string, id: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { id, tenantId },
      include: { customer: true },
    });
    if (!charge) {
      throw new NotFoundException('Cobranca nao encontrada neste tenant.');
    }

    const phone = charge.customer.whatsapp ?? charge.customer.phone;
    if (!phone) {
      throw new BadRequestException('Cliente sem telefone para WhatsApp.');
    }

    const payload: ReminderJobPayload = {
      tenantId,
      chargeId: charge.id,
      customerName: charge.customer.name,
      phone,
      amountCents: this.settlementAmount(charge).amountCents,
      dueDate: charge.dueDate.toISOString(),
    };
    this.queue.enqueue(REMINDER_JOB, payload);

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CHARGE_WHATSAPP_REMINDER_REQUESTED',
      entityType: 'Charge',
      entityId: charge.id,
      metadata: { status: charge.status },
    });

    return { ok: true, queued: true };
  }

  async duplicate(tenantId: string, id: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { tenantId, id },
    });
    if (!charge) throw new NotFoundException('Cobranca nao encontrada neste tenant.');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return this.create(tenantId, {
      customerId: charge.customerId,
      amountCents: charge.amountCents,
      description: `Copia - ${charge.description}`,
      dueDate: dueDate.toISOString(),
      category: charge.category ?? undefined,
      recurrence: charge.recurrence,
      interestMode: charge.interestMode,
      interestRateBps: charge.interestRateBps,
      interestGraceDays: charge.interestGraceDays,
    });
  }

  async sendPixWhatsapp(tenantId: string, id: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { id, tenantId },
      include: { customer: true },
    });
    if (!charge) throw new NotFoundException('Cobranca nao encontrada neste tenant.');
    const phone = charge.customer.whatsapp ?? charge.customer.phone;
    if (!phone) throw new BadRequestException('Cliente sem WhatsApp/telefone.');
    const pix = await this.getPix(tenantId, id);
    const text =
      `Ola ${charge.customer.name}! Segue o PIX para pagamento:\n\n` +
      `${pix.pixCopyPaste}\n\n` +
      `Vencimento: ${charge.dueDate.toLocaleDateString('pt-BR')}\n` +
      `Valor: ${(pix.amountCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    await this.whatsapp.sendText(phone, text);
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CHARGE_PIX_WHATSAPP_SENT',
      entityType: 'Charge',
      entityId: charge.id,
    });
    return { ok: true };
  }

  async publicDetails(publicToken: string) {
    const charge = await this.prisma.charge.findUnique({
      where: { publicToken },
      include: { customer: { select: { name: true, phone: true, whatsapp: true } } },
    });
    if (!charge) {
      throw new NotFoundException('Cobranca publica nao encontrada.');
    }
    const settlement = this.settlementAmount(charge);
    const pix = charge.status === 'PENDING' ? await this.publicPix(publicToken) : null;
    return {
      publicToken: charge.publicToken,
      customerName: charge.customer.name,
      description: charge.description,
      dueDate: charge.dueDate,
      status: charge.status,
      principalCents: charge.amountCents,
      interestCents: settlement.interestCents,
      amountCents: settlement.amountCents,
      interestMode: charge.interestMode,
      interestRateBps: charge.interestRateBps,
      interestGraceDays: charge.interestGraceDays,
      pixCopyPaste: pix?.pixCopyPaste ?? null,
    };
  }

  async publicPix(publicToken: string) {
    const charge = await this.prisma.charge.findUnique({ where: { publicToken } });
    if (!charge) {
      throw new NotFoundException('Cobranca publica nao encontrada.');
    }
    if (charge.status !== 'PENDING') {
      throw new BadRequestException('Cobranca nao esta pendente.');
    }
    const cfg = await this.settings.get(charge.tenantId);
    const settlement = this.settlementAmount(charge);
    return {
      amountCents: settlement.amountCents,
      principalCents: charge.amountCents,
      interestCents: settlement.interestCents,
      pixCopyPaste: this.pix.buildCopyPaste({
        pixKey: cfg.pixKey,
        merchantName: cfg.merchantName,
        merchantCity: cfg.merchantCity,
        amountCents: settlement.amountCents,
        txid: charge.id,
      }),
    };
  }

  /// Exclui a cobranca e seus lancamentos (mantem o razao balanceado).
  async remove(tenantId: string, id: string) {
    const charge = await this.prisma.charge.findFirst({ where: { id, tenantId } });
    if (!charge) {
      throw new NotFoundException('Cobranca nao encontrada neste tenant.');
    }
    await this.prisma.$transaction([
      this.prisma.ledgerEntry.deleteMany({
        where: {
          tenantId,
          transactionId: { in: [`charge:${charge.id}`, `payment:${charge.id}`] },
        },
      }),
      this.prisma.calendarEvent.deleteMany({
        where: { tenantId, chargeId: charge.id },
      }),
      this.prisma.charge.delete({ where: { id: charge.id } }),
    ]);
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CHARGE_DELETED',
      entityType: 'Charge',
      entityId: id,
    });
    return { ok: true };
  }

  async bulk(tenantId: string, ids: string[], action?: string) {
    const charges = await this.prisma.charge.findMany({
      where: { tenantId, id: { in: ids } },
      select: { id: true },
    });
    const safeIds = charges.map((charge) => charge.id);
    if (action === 'pay') {
      for (const id of safeIds) {
        const charge = await this.prisma.charge.findFirst({ where: { tenantId, id } });
        if (charge?.status === 'PENDING') await this.pay(tenantId, id);
      }
    } else if (action === 'cancel') {
      await this.prisma.charge.updateMany({
        where: { tenantId, id: { in: safeIds }, status: 'PENDING' },
        data: { status: 'CANCELED' },
      });
    } else if (action === 'remind') {
      for (const id of safeIds) await this.sendWhatsappReminder(tenantId, id).catch(() => null);
    }
    return { ok: true, affected: safeIds.length };
  }

  private resolveInitialNextDueAt(
    dueDate: string,
    recurrence?: string,
    nextDueAt?: string,
  ) {
    if (recurrence !== 'MONTHLY') return null;
    return nextDueAt ? new Date(nextDueAt) : this.addMonths(new Date(dueDate), 1);
  }

  private settlementAmount(
    charge: {
      amountCents: number;
      dueDate: Date;
      paidAt?: Date | null;
      status?: string;
      interestMode?: string | null;
      interestRateBps?: number | null;
      interestGraceDays?: number | null;
    },
    at = new Date(),
  ) {
    const interestCents = this.calculateInterest(charge, at);
    return {
      principalCents: charge.amountCents,
      interestCents,
      amountCents: charge.amountCents + interestCents,
    };
  }

  private calculateInterest(
    charge: {
      amountCents: number;
      dueDate: Date;
      paidAt?: Date | null;
      status?: string;
      interestMode?: string | null;
      interestRateBps?: number | null;
      interestGraceDays?: number | null;
    },
    at = new Date(),
  ) {
    if (charge.status === 'CANCELED') return 0;
    const mode = charge.interestMode ?? 'NONE';
    const rateBps = charge.interestRateBps ?? 0;
    if (mode === 'NONE' || rateBps <= 0) return 0;

    const settleAt = charge.paidAt ?? at;
    const graceDays = charge.interestGraceDays ?? 0;
    const startsAt = new Date(charge.dueDate);
    startsAt.setDate(startsAt.getDate() + graceDays);
    if (settleAt.getTime() <= startsAt.getTime()) return 0;

    const daysLate = Math.max(
      1,
      Math.ceil((settleAt.getTime() - startsAt.getTime()) / 86_400_000),
    );
    const units =
      mode === 'MONTHLY' ? Math.ceil(daysLate / 30) : mode === 'WEEKLY' ? Math.ceil(daysLate / 7) : daysLate;
    return Math.floor((charge.amountCents * rateBps * units) / 10_000);
  }

  private newPublicToken() {
    return randomBytes(18).toString('base64url');
  }

  private async ensurePublicTokens<T extends { id: string; publicToken?: string | null }>(
    charges: T[],
  ): Promise<T[]> {
    const missing = charges.filter((charge) => !charge.publicToken);
    if (!missing.length) return charges;

    const generated = new Map<string, string>();
    for (const charge of missing) {
      const publicToken = this.newPublicToken();
      await this.prisma.charge.update({
        where: { id: charge.id },
        data: { publicToken },
      });
      generated.set(charge.id, publicToken);
    }

    return charges.map((charge) => ({
      ...charge,
      publicToken: charge.publicToken ?? generated.get(charge.id) ?? null,
    }));
  }

  private async syncChargeCalendar(charge: {
    id: string;
    tenantId: string;
    description: string;
    dueDate: Date;
    status: string;
  }) {
    const title = `Vencimento: ${charge.description}`;
    const existing = await this.prisma.calendarEvent.findFirst({
      where: { tenantId: charge.tenantId, chargeId: charge.id },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.calendarEvent.update({
        where: { id: existing.id },
        data: {
          title,
          startsAt: charge.dueDate,
          status: charge.status === 'CANCELED' ? 'CANCELED' : 'SCHEDULED',
        },
      });
      return;
    }
    await this.prisma.calendarEvent.create({
      data: {
        tenantId: charge.tenantId,
        chargeId: charge.id,
        title,
        type: 'DUE_DATE',
        startsAt: charge.dueDate,
        status: charge.status === 'CANCELED' ? 'CANCELED' : 'SCHEDULED',
      },
    });
  }

  private resolveUpdatedNextDueAt(
    charge: { dueDate: Date; nextDueAt?: Date | null },
    dto: UpdateChargeDto,
  ) {
    if (dto.recurrence === 'ONCE') return null;
    if (dto.nextDueAt === null) return null;
    if (dto.nextDueAt) return new Date(dto.nextDueAt);
    if (dto.recurrence === 'MONTHLY' && !charge.nextDueAt) {
      return this.addMonths(dto.dueDate ? new Date(dto.dueDate) : charge.dueDate, 1);
    }
    return undefined;
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    const day = next.getDate();
    next.setMonth(next.getMonth() + months);
    if (next.getDate() < day) next.setDate(0);
    return next;
  }

  private parseCsv(content: string): Array<Record<string, string>> {
    try {
      return parse(content.replace(/^\uFEFF/, ''), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Array<Record<string, string>>;
    } catch {
      throw new BadRequestException('CSV invalido ou sem cabecalho.');
    }
  }

  private async rowToChargeDto(
    tenantId: string,
    row: Record<string, string>,
  ): Promise<{ charge: CreateChargeDto; status?: string }> {
    const customer = await this.resolveCustomerForImport(tenantId, row);
    const amountCents = this.toInt(this.pick(row, 'amountCents', 'valorCentavos'));
    const description = this.pick(row, 'description', 'descricao');
    const dueDate = this.pick(row, 'dueDate', 'vencimento', 'dataVencimento');

    if (!amountCents || amountCents < 1) {
      throw new BadRequestException('Valor da cobranca deve estar em centavos e ser maior que zero.');
    }
    if (!description || description.length < 2) {
      throw new BadRequestException('Descricao da cobranca e obrigatoria.');
    }
    if (!dueDate || Number.isNaN(new Date(dueDate).getTime())) {
      throw new BadRequestException('Data de vencimento invalida.');
    }

    const recurrence = this.optional(this.pick(row, 'recurrence', 'recorrencia'))?.toUpperCase();
    const status = this.optional(this.pick(row, 'status'))?.toUpperCase();

    return {
      charge: {
        customerId: customer.id,
        amountCents,
        description,
        dueDate,
        category: this.optional(this.pick(row, 'category', 'categoria')),
        recurrence: recurrence === 'MONTHLY' ? 'MONTHLY' : 'ONCE',
        nextDueAt: this.optional(this.pick(row, 'nextDueAt', 'proximoVencimento')),
      },
      status: status === 'PAID' ? 'PAID' : undefined,
    };
  }

  private async resolveCustomerForImport(tenantId: string, row: Record<string, string>) {
    const document = this.optional(this.pick(row, 'customerDocument', 'documentoCliente', 'documento'));
    const email = this.optional(this.pick(row, 'customerEmail', 'emailCliente', 'email'));
    const phone = this.normalizePhone(this.pick(row, 'customerPhone', 'telefoneCliente', 'phone'));
    const whatsapp = this.normalizePhone(this.pick(row, 'customerWhatsapp', 'whatsappCliente', 'whatsapp'));

    const identifiers = [
      ...(document ? [{ document }] : []),
      ...(phone ? [{ phone }] : []),
      ...(whatsapp ? [{ whatsapp }] : []),
      ...(email ? [{ email }] : []),
    ];
    if (identifiers.length) {
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, OR: identifiers },
        select: { id: true },
      });
      if (existing) return existing;
    }

    const name = this.pick(row, 'customerName', 'nomeCliente', 'nome');
    const fallbackPhone = phone ?? whatsapp;
    if (!name || name.length < 2 || !fallbackPhone) {
      throw new BadRequestException('Cliente nao localizado; informe nome e telefone para criar.');
    }

    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        name,
        document: document ?? null,
        phone: fallbackPhone,
        whatsapp: whatsapp ?? null,
        email: email ?? null,
        stage: 'LEAD',
      },
      select: { id: true },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMER_CREATED_FROM_CHARGE_CSV',
      entityType: 'Customer',
      entityId: customer.id,
    });
    return customer;
  }

  private pick(row: Record<string, string>, ...keys: string[]): string {
    const normalized = new Map(
      Object.entries(row).map(([key, value]) => [this.normalizeKey(key), value?.trim() ?? '']),
    );
    for (const key of keys) {
      const value = normalized.get(this.normalizeKey(key));
      if (value) return value;
    }
    return '';
  }

  private normalizeKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private normalizePhone(value: string): string | undefined {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return undefined;
    return value.trim().startsWith('+') ? `+${digits}` : digits;
  }

  private optional(value: string): string | undefined {
    return value.trim() || undefined;
  }

  private toInt(value: string): number | undefined {
    if (!value.trim()) return undefined;
    const parsed = Number.parseInt(value.replace(/\D/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private formatDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private chargeLedgerEntries(tenantId: string, chargeId: string, amountCents: number) {
    return [
      {
        tenantId,
        transactionId: `charge:${chargeId}`,
        accountCode: 'ACCOUNTS_RECEIVABLE',
        direction: 'DEBIT',
        amountCents,
        description: `Cobranca ${chargeId}`,
      },
      {
        tenantId,
        transactionId: `charge:${chargeId}`,
        accountCode: 'REVENUE',
        direction: 'CREDIT',
        amountCents,
        description: `Receita da cobranca ${chargeId}`,
      },
    ];
  }

  private async emitNfeIfEnabled(tenantId: string, chargeId: string): Promise<void> {
    const cfg = await this.settings.get(tenantId);
    if (!cfg.nfeEnabled) return;
    try {
      await this.nfe.emitForCharge(tenantId, chargeId);
    } catch (error) {
      await this.audit.record({
        tenantId,
        actor: 'system',
        action: 'NFE_AUTO_EMIT_FAILED',
        entityType: 'Charge',
        entityId: chargeId,
        metadata: { reason: error instanceof Error ? error.message : 'unknown' },
      });
    }
  }
}
