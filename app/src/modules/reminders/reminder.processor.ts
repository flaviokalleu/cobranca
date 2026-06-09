import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../common/queue/queue.service';
import { PixService } from '../pix/pix.service';
import { SettingsService } from '../../common/settings/settings.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppMailService } from '../../common/mail/mail.service';
import { ReminderSender } from './reminder-sender';
import { REMINDER_JOB, ReminderJobPayload } from './reminder.types';

/// Worker: consome o job de lembrete, monta o PIX real e dispara o envio.
@Injectable()
export class ReminderProcessor implements OnModuleInit {
  constructor(
    private readonly queue: QueueService,
    private readonly sender: ReminderSender,
    private readonly pix: PixService,
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
    private readonly mail: AppMailService,
  ) {}

  onModuleInit(): void {
    this.queue.register<ReminderJobPayload>(REMINDER_JOB, async (payload) => {
      const cfg = await this.settings.get(payload.tenantId);
      const pixCopyPaste = this.pix.buildCopyPaste({
        pixKey: cfg.pixKey,
        merchantName: cfg.merchantName,
        merchantCity: cfg.merchantCity,
        amountCents: payload.amountCents,
        txid: payload.chargeId,
      });

      if (cfg.chargeRobotEnabled && cfg.notifyByWhatsapp) {
        await this.sender.send({
          phone: payload.phone,
          customerName: payload.customerName,
          amountCents: payload.amountCents,
          dueDate: payload.dueDate,
          pixCopyPaste,
        });
      }

      await this.sendEmailReminder(payload, pixCopyPaste);
    });
  }

  private async sendEmailReminder(
    payload: ReminderJobPayload,
    pixCopyPaste: string,
  ): Promise<void> {
    const charge = await this.prisma.charge.findFirst({
      where: { id: payload.chargeId, tenantId: payload.tenantId },
      select: {
        customer: { select: { email: true, name: true } },
      },
    });
    const recipientEmail = charge?.customer.email;
    if (!recipientEmail) return;

    const result = await this.mail.sendChargeReminder(recipientEmail, {
      customerName: charge.customer.name || payload.customerName,
      amount: this.money(payload.amountCents),
      dueDate: new Date(payload.dueDate).toLocaleDateString('pt-BR'),
      pixCode: pixCopyPaste,
    });

    await this.prisma.notification.create({
      data: {
        tenantId: payload.tenantId,
        channel: 'EMAIL',
        title: 'Lembrete de cobranca',
        message: result.sent
          ? 'Lembrete de cobranca enviado por e-mail.'
          : result.reason ?? 'Lembrete de cobranca nao enviado por e-mail.',
        recipientEmail,
        status: result.sent ? 'SENT' : 'FAILED',
        sentAt: result.sent ? new Date() : null,
        entityType: 'Charge',
        entityId: payload.chargeId,
      },
    });
  }

  private money(amountCents: number): string {
    return (amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}
