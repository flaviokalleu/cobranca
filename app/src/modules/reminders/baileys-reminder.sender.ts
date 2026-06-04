import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReminderSender, ReminderMessage } from './reminder-sender';

/**
 * Envio REAL via WhatsApp usando Baileys.
 *
 * Ativacao (sua acao):
 *   1) rode a API com REMINDER_SENDER=baileys
 *   2) um QR Code aparece no terminal — escaneie com o WhatsApp do seu celular
 *
 * Usa require dinamico de proposito: assim o build/app nao quebram caso a lib
 * nao esteja instalada ou o modo console esteja ativo.
 */
@Injectable()
export class BaileysReminderSender extends ReminderSender implements OnModuleInit {
  private readonly logger = new Logger('WhatsApp(Baileys)');
  private sock: { sendMessage: (jid: string, content: unknown) => Promise<unknown> } | null =
    null;
  private ready = false;

  async onModuleInit(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const baileys = require('@whiskeysockets/baileys');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const qrcode = require('qrcode-terminal');
      const makeWASocket = baileys.default ?? baileys.makeWASocket;
      const { useMultiFileAuthState } = baileys;

      const { state, saveCreds } = await useMultiFileAuthState('.baileys_auth');
      const sock = makeWASocket({ auth: state, printQRInTerminal: false });
      this.sock = sock;

      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', (update: Record<string, unknown>) => {
        if (typeof update.qr === 'string') {
          this.logger.warn('Escaneie este QR Code no WhatsApp do seu celular:');
          qrcode.generate(update.qr, { small: true });
        }
        if (update.connection === 'open') {
          this.ready = true;
          this.logger.log('WhatsApp conectado e pronto para enviar.');
        }
        if (update.connection === 'close') {
          this.ready = false;
          this.logger.warn('WhatsApp desconectado.');
        }
      });
    } catch (err) {
      this.logger.error(
        `Baileys indisponivel (${(err as Error).message}). Os lembretes nao serao enviados ate conectar.`,
      );
    }
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

    if (!this.sock || !this.ready) {
      this.logger.warn(
        `WhatsApp ainda nao conectado; lembrete para ${message.phone} NAO enviado.`,
      );
      return;
    }
    const jid = `${message.phone.replace(/\D/g, '')}@s.whatsapp.net`;
    await this.sock.sendMessage(jid, { text });
    this.logger.log(`Lembrete enviado para ${message.phone}`);
  }
}
