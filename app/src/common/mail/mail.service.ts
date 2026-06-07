import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

interface MailResult {
  sent: boolean;
  reason?: string;
}

interface ChargeReminderInput {
  customerName: string;
  amount: string;
  dueDate: string;
  pixCode: string;
}

interface ChargeConfirmationInput {
  customerName: string;
  amount: string;
  paidAt: string;
}

interface WelcomeInput {
  userName: string;
  companyName: string;
}

@Injectable()
export class AppMailService {
  private readonly logger = new Logger(AppMailService.name);

  constructor(private readonly mailer: MailerService) {}

  isConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST);
  }

  sendChargeReminder(to: string, input: ChargeReminderInput): Promise<MailResult> {
    return this.send({
      to,
      subject: `Lembrete de cobranca - ${input.customerName}`,
      html: this.layout(
        'Lembrete de cobranca',
        `<p>Ola, ${this.escape(input.customerName)}.</p>
         <p>Existe uma cobranca em aberto no valor de <strong>${this.escape(input.amount)}</strong>, com vencimento em <strong>${this.escape(input.dueDate)}</strong>.</p>
         <p>Codigo PIX copia e cola:</p>
         <pre>${this.escape(input.pixCode)}</pre>`,
      ),
    });
  }

  sendChargeConfirmation(to: string, input: ChargeConfirmationInput): Promise<MailResult> {
    return this.send({
      to,
      subject: `Pagamento recebido - ${input.customerName}`,
      html: this.layout(
        'Pagamento recebido',
        `<p>O pagamento de <strong>${this.escape(input.amount)}</strong> foi registrado para ${this.escape(input.customerName)}.</p>
         <p>Data da baixa: ${this.escape(input.paidAt)}.</p>`,
      ),
    });
  }

  sendWelcome(to: string, input: WelcomeInput): Promise<MailResult> {
    return this.send({
      to,
      subject: `Bem-vindo ao ${input.companyName}`,
      html: this.layout(
        'Bem-vindo',
        `<p>Ola, ${this.escape(input.userName)}.</p>
         <p>Sua conta na empresa <strong>${this.escape(input.companyName)}</strong> esta pronta para uso.</p>`,
      ),
    });
  }

  sendNotification(to: string, input: { title: string; message: string }): Promise<MailResult> {
    return this.send({
      to,
      subject: input.title,
      html: this.layout(this.escape(input.title), `<p>${this.escape(input.message)}</p>`),
    });
  }

  private async send(input: { to: string; subject: string; html: string }): Promise<MailResult> {
    if (!this.isConfigured()) {
      const reason = 'SMTP_HOST nao configurado.';
      this.logger.warn(`E-mail nao enviado para ${input.to}: ${reason}`);
      return { sent: false, reason };
    }

    await this.mailer.sendMail(input);
    return { sent: true };
  }

  private layout(title: string, body: string): string {
    return `
      <!doctype html>
      <html lang="pt-BR">
        <body style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
          <main style="max-width: 640px; margin: 0 auto; padding: 24px;">
            <h1 style="font-size: 20px; margin-bottom: 16px;">${title}</h1>
            ${body}
          </main>
        </body>
      </html>
    `;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
