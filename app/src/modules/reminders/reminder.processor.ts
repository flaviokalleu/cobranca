import { Injectable, OnModuleInit } from '@nestjs/common';
import { QueueService } from '../../common/queue/queue.service';
import { PixService } from '../pix/pix.service';
import { SettingsService } from '../../common/settings/settings.service';
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

      await this.sender.send({
        phone: payload.phone,
        customerName: payload.customerName,
        amountCents: payload.amountCents,
        dueDate: payload.dueDate,
        pixCopyPaste,
      });
    });
  }
}
