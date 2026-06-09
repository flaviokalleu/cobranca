import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../../common/audit/audit.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger('WebhookService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  async handleAsaas(payload: Record<string, unknown>, accessToken: string): Promise<{ ok: boolean }> {
    // FIX 3: Validate static Asaas webhook token
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (expectedToken && accessToken !== expectedToken) {
      this.logger.warn('Webhook Asaas rejeitado: token invalido');
      return { ok: false };
    }

    const event = payload.event as string | undefined;
    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
      return { ok: true };
    }

    const payment = payload.payment as Record<string, unknown> | undefined;
    if (!payment) return { ok: true };

    // FIX 2: Idempotency check — reject duplicate webhook deliveries
    const eventId = payment.id as string | undefined;
    if (!eventId) return { ok: true };

    try {
      await this.prisma.webhookDelivery.create({
        data: { source: 'ASAAS', eventId, event: event ?? 'UNKNOWN' },
      });
    } catch {
      // unique constraint violation = already processed
      return { ok: true };
    }

    const externalReference = (payment.externalReference ?? payment.id) as string | undefined;
    if (!externalReference) return { ok: true };

    // FIX 1: Atomic updateMany prevents double ledger posting on concurrent webhooks
    const result = await this.prisma.charge.updateMany({
      where: { id: externalReference, status: { not: 'PAID' } },
      data: { status: 'PAID', paidAt: new Date() },
    });
    if (result.count === 0) return { ok: true }; // already paid or not found

    const charge = await this.prisma.charge.findFirst({ where: { id: externalReference } });
    if (!charge) return { ok: true };

    await this.ledger.post(charge.tenantId, `payment:${charge.id}`, [
      { accountCode: 'CASH', direction: 'DEBIT', amountCents: charge.amountCents, description: `Recebimento Asaas ${charge.id}` },
      { accountCode: 'ACCOUNTS_RECEIVABLE', direction: 'CREDIT', amountCents: charge.amountCents, description: `Baixa Asaas ${charge.id}` },
    ]);

    await this.audit.record({
      tenantId: charge.tenantId,
      actor: 'asaas-webhook',
      action: 'CHARGE_PAID',
      entityType: 'Charge',
      entityId: charge.id,
      metadata: { source: 'asaas', event },
    });

    this.logger.log(`Cobranca ${charge.id} paga via Asaas webhook`);
    return { ok: true };
  }

  async handleMercadoPago(payload: Record<string, unknown>): Promise<{ ok: boolean }> {
    const type = payload.type as string | undefined;
    const action = payload.action as string | undefined;

    if (type !== 'payment' || action !== 'payment.updated') return { ok: true };

    const data = payload.data as Record<string, unknown> | undefined;
    const paymentId = data?.id as string | undefined;
    if (!paymentId) return { ok: true };

    // FIX 2: Idempotency check — reject duplicate webhook deliveries
    try {
      await this.prisma.webhookDelivery.create({
        data: { source: 'MERCADOPAGO', eventId: paymentId, event: `${type}.${action}` },
      });
    } catch {
      return { ok: true };
    }

    // FIX 1: Atomic updateMany prevents double ledger posting on concurrent webhooks
    const result = await this.prisma.charge.updateMany({
      where: { id: paymentId, status: { not: 'PAID' } },
      data: { status: 'PAID', paidAt: new Date() },
    });
    if (result.count === 0) return { ok: true }; // already paid or not found

    const charge = await this.prisma.charge.findFirst({ where: { id: paymentId } });
    if (!charge) return { ok: true };

    await this.ledger.post(charge.tenantId, `payment:${charge.id}`, [
      { accountCode: 'CASH', direction: 'DEBIT', amountCents: charge.amountCents, description: `Recebimento MercadoPago ${charge.id}` },
      { accountCode: 'ACCOUNTS_RECEIVABLE', direction: 'CREDIT', amountCents: charge.amountCents, description: `Baixa MercadoPago ${charge.id}` },
    ]);

    await this.audit.record({
      tenantId: charge.tenantId,
      actor: 'mercadopago-webhook',
      action: 'CHARGE_PAID',
      entityType: 'Charge',
      entityId: charge.id,
      metadata: { source: 'mercadopago', paymentId },
    });

    this.logger.log(`Cobranca ${charge.id} paga via MercadoPago webhook`);
    return { ok: true };
  }
}
