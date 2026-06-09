import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WhatsappOutboundService } from '../whatsapp-bot/whatsapp-outbound.service';
import { PixService } from '../pix/pix.service';
import { ReminderSender, ReminderMessage } from './reminder-sender';

@Injectable()
export class WhaileysReminderSender extends ReminderSender implements OnModuleInit {
  private readonly logger = new Logger('WhatsApp(Whaileys)');

  constructor(
    private readonly outbound: WhatsappOutboundService,
    private readonly pix: PixService,
  ) {
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

    const caption =
      `Ola *${message.customerName}*, sua cobranca de *${valor}* vence em *${venc}*.\n\n` +
      `Escaneie o QR Code acima ou use o PIX copia-e-cola:\n\n` +
      `\`${message.pixCopyPaste}\``;

    try {
      const qrBuffer = await this.pix.buildQrImageBuffer(message.pixCopyPaste);
      await this.outbound.sendImage(message.phone, qrBuffer, caption);
    } catch {
      // fallback: envia so texto se a geracao de imagem falhar
      await this.outbound.sendText(
        message.phone,
        `Ola *${message.customerName}*, sua cobranca de *${valor}* vence em *${venc}*.\n\nPIX copia-e-cola:\n${message.pixCopyPaste}`,
      );
    }

    this.logger.log(`Lembrete com QR enviado para ${message.phone}`);
  }
}
