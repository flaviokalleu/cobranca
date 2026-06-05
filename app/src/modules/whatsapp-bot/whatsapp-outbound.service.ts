import { Injectable, Logger } from '@nestjs/common';
import { ExtractedTransactionDto } from '../financial-extractor/dto/extracted-transaction.dto';

export interface WhatsappSocketLike {
  sendMessage(jid: string, content: unknown): Promise<unknown>;
}

@Injectable()
export class WhatsappOutboundService {
  private readonly logger = new Logger(WhatsappOutboundService.name);
  private socket: WhatsappSocketLike | null = null;

  bindSocket(socket: WhatsappSocketLike): void {
    this.socket = socket;
  }

  unbindSocket(): void {
    this.socket = null;
  }

  async sendText(to: string, text: string): Promise<void> {
    if (!this.socket) {
      this.logger.warn(`WhatsApp nao conectado; mensagem nao enviada para ${to}.`);
      return;
    }
    await this.socket.sendMessage(this.toJid(to), { text });
  }

  async sendReceiptTypeButtons(to: string): Promise<void> {
    if (!this.socket) return this.sendText(to, 'Classifique o comprovante como Gasto ou Receita.');
    await this.socket.sendMessage(this.toJid(to), {
      text: 'Como deseja classificar este comprovante?',
      footer: 'Escolha uma opcao para eu continuar.',
      buttons: [
        { buttonId: 'receipt:type:gasto', buttonText: { displayText: 'Gasto' }, type: 1 },
        { buttonId: 'receipt:type:receita', buttonText: { displayText: 'Receita' }, type: 1 },
      ],
      headerType: 1,
    });
  }

  async sendConfirmationButtons(
    to: string,
    extracted: ExtractedTransactionDto,
    companyName: string,
  ): Promise<void> {
    const summary =
      `Identifiquei este lancamento:\n\n` +
      `Tipo: ${extracted.tipo}\n` +
      `Empresa: ${companyName}\n` +
      `Valor: R$ ${extracted.valor}\n` +
      `Data: ${extracted.data_transacao}\n` +
      `Hora: ${extracted.hora_transacao}\n` +
      `Pagador: ${extracted.pagador.nome}\n` +
      `Recebedor: ${extracted.recebedor.nome}\n` +
      `Descricao: ${extracted.descricao}\n` +
      `Confianca: ${extracted.confianca}\n\n` +
      `Deseja salvar?`;

    if (!this.socket) return this.sendText(to, summary);
    await this.socket.sendMessage(this.toJid(to), {
      text: summary,
      footer: 'Confirme antes de salvar no financeiro.',
      buttons: [
        { buttonId: 'receipt:confirm:save', buttonText: { displayText: 'Salvar' }, type: 1 },
        { buttonId: 'receipt:confirm:correct', buttonText: { displayText: 'Corrigir' }, type: 1 },
        { buttonId: 'receipt:confirm:cancel', buttonText: { displayText: 'Cancelar' }, type: 1 },
      ],
      headerType: 1,
    });
  }

  async sendRecorrenciaButtons(to: string, pagadorNome: string): Promise<void> {
    const text = `Este pagamento de *${pagadorNome}* e avulso ou recorrente (mensal)?`;
    if (!this.socket) return this.sendText(to, text + '\n\nResponda: *avulso* ou *mensal*');
    await this.socket.sendMessage(this.toJid(to), {
      text,
      footer: 'Isso ajuda a organizar o fluxo financeiro.',
      buttons: [
        { buttonId: 'receipt:recorrencia:avulso', buttonText: { displayText: 'Avulso' }, type: 1 },
        { buttonId: 'receipt:recorrencia:mensal', buttonText: { displayText: 'Mensal' }, type: 1 },
      ],
      headerType: 1,
    });
  }

  async sendLeadWhatsappRequest(to: string, pagadorNome: string): Promise<void> {
    await this.sendText(
      to,
      `Otimo! Para enviar lembretes mensais a *${pagadorNome}*, qual e o numero de WhatsApp dele?\n\n` +
      `Envie no formato *5511999998888* (codigo do pais + DDD + numero, sem espacos).\n` +
      `Ou envie *pular* para salvar sem o numero.`,
    );
  }

  async sendMenu(to: string, name?: string): Promise<void> {
    const greeting = name ? `Ola, *${name}*!` : 'Ola!';
    const text =
      `${greeting} Sou o assistente *WEBBA ERP*. 🤖\n\n` +
      `Veja o que posso fazer por voce:\n\n` +
      `📎 *Comprovante* — Envie uma imagem ou PDF para registrar um lancamento financeiro\n` +
      `✅ *salvar* — Confirmar um lancamento pendente\n` +
      `✏️ *corrigir* — Corrigir um lancamento pendente\n` +
      `❌ *cancelar* — Cancelar a operacao atual\n` +
      `💬 *menu* ou *ajuda* — Ver este menu novamente`;
    await this.sendText(to, text);
  }

  async sendUnknownWelcome(to: string): Promise<void> {
    const text =
      `Ola! 👋 Sou o assistente *WEBBA ERP*.\n\n` +
      `Se voce e um colaborador, peca o *codigo de ativacao* ao administrador e envie aqui para liberar seu acesso.\n\n` +
      `Exemplo: envie apenas o codigo recebido (ex: *ABC-1234*).`;
    await this.sendText(to, text);
  }

  private toJid(value: string): string {
    if (value.includes('@')) return value;
    return `${value.replace(/\D/g, '')}@s.whatsapp.net`;
  }
}
