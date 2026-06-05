import { Injectable, Logger } from '@nestjs/common';

export interface ReminderMessage {
  phone: string;
  customerName: string;
  amountCents: number;
  dueDate: string;
  pixCopyPaste: string;
}

/**
 * Porta de saida do lembrete (padrao Strategy).
 * Trocar a implementacao por Whaileys/WhatsApp ou um provedor de SMS NAO afeta o negocio.
 */
export abstract class ReminderSender {
  abstract send(message: ReminderMessage): Promise<void>;
}

/**
 * Implementacao SUBSTITUTA (stand-in): escreve a mensagem no log em vez de enviar.
 * Em producao, troque por um WhaileysReminderSender (WhatsApp real).
 */
@Injectable()
export class ConsoleReminderSender extends ReminderSender {
  private readonly logger = new Logger('WhatsApp(stand-in)');

  async send(message: ReminderMessage): Promise<void> {
    const valor = (message.amountCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const venc = new Date(message.dueDate).toLocaleDateString('pt-BR', {
      timeZone: 'UTC',
    });
    this.logger.log(
      `-> ${message.phone} | Ola ${message.customerName}, sua cobranca de ${valor} vence em ${venc}. ` +
        `PIX copia-e-cola: ${message.pixCopyPaste}`,
    );
    return Promise.resolve();
  }
}
