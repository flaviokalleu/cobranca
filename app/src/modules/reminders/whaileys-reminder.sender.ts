import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WhatsappOutboundService } from '../whatsapp-bot/whatsapp-outbound.service';
import { ReminderSender, ReminderMessage } from './reminder-sender';

/**
 * Envio via WhatsApp principal do robo.
 * A sessao Whaileys e gerenciada pelo WhatsappAdminModule e persistida no banco.
 */
@Injectable()
export class WhaileysReminderSender extends ReminderSender implements OnModuleInit {
  private readonly logger = new Logger('WhatsApp(Whaileys)');

  constructor(private readonly outbound: WhatsappOutboundService) {
    super();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Lembretes usarao o WhatsApp principal conectado no painel administrativo.');
  }

  async send(message: ReminderMessage): Promise<void> {
    const valor = (message.amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const venc = new Date(message.dueDate).toLocaleDateString('pt-BR', {
      timeZone: 'UTC',
    });
    const text =
      `Ola ${message.customerName}, sua cobranca de ${valor} vence em ${venc}.\n` +
      `PIX copia-e-cola:\n${message.pixCopyPaste}`;

    await this.outbound.sendText(message.phone, text);
    this.logger.log(`Lembrete enviado para ${message.phone}`);
  }
}
