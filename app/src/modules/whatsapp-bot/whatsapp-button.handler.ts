import { Injectable } from '@nestjs/common';
import { ReceiptType } from '../financial-extractor/dto/extracted-transaction.dto';

export type ConfirmationAction = 'save' | 'correct' | 'cancel';
export type CorrectionField =
  | 'valor'
  | 'data'
  | 'pagador'
  | 'recebedor'
  | 'tipo'
  | 'descricao';

@Injectable()
export class WhatsappButtonHandler {
  extractText(rawMessage: unknown): string {
    const message = this.messageNode(rawMessage);
    const candidates = [
      message?.conversation,
      message?.extendedTextMessage?.text,
      message?.imageMessage?.caption,
      message?.documentMessage?.caption,
      message?.videoMessage?.caption,
      message?.buttonsResponseMessage?.selectedButtonId,
      message?.buttonsResponseMessage?.selectedDisplayText,
      message?.templateButtonReplyMessage?.selectedId,
      message?.templateButtonReplyMessage?.selectedDisplayText,
      message?.listResponseMessage?.singleSelectReply?.selectedRowId,
      this.extractInteractiveResponse(message?.interactiveResponseMessage),
    ];
    return candidates.find((item) => typeof item === 'string' && item.trim())?.trim() ?? '';
  }

  parseReceiptType(text: string): ReceiptType | null {
    const normalized = this.normalize(text);
    if (normalized.includes('receipt:type:gasto') || normalized === 'gasto') return 'gasto';
    if (normalized.includes('receipt:type:receita') || normalized === 'receita') return 'receita';
    return null;
  }

  parseConfirmation(text: string): ConfirmationAction | null {
    const normalized = this.normalize(text);
    if (normalized.includes('receipt:confirm:save') || normalized === 'salvar') return 'save';
    if (normalized.includes('receipt:confirm:correct') || normalized === 'corrigir') {
      return 'correct';
    }
    if (normalized.includes('receipt:confirm:cancel') || normalized === 'cancelar') {
      return 'cancel';
    }
    return null;
  }

  parseCorrectionField(text: string): CorrectionField | null {
    const normalized = this.normalize(text);
    if (['valor', 'data', 'pagador', 'recebedor', 'tipo', 'descricao'].includes(normalized)) {
      return normalized as CorrectionField;
    }
    return null;
  }

  isCancel(text: string): boolean {
    return this.normalize(text) === 'cancelar';
  }

  parseRecorrencia(text: string): 'AVULSO' | 'MENSAL' | null {
    const n = this.normalize(text);
    if (n.includes('receipt:recorrencia:avulso') || n === 'avulso' || n === 'avulsa' || n === '1') return 'AVULSO';
    if (n.includes('receipt:recorrencia:mensal') || n === 'mensal' || n === 'recorrente' || n === '2') return 'MENSAL';
    return null;
  }

  parseGreeting(text: string): boolean {
    const n = this.normalize(text);
    const greetings = ['oi', 'ola', 'oi!', 'ola!', 'hello', 'hi', 'ei', 'e ai', 'eai',
      'bom dia', 'boa tarde', 'boa noite', 'boas', 'oi tudo', 'tudo bem', 'oi boa', 'hey'];
    return greetings.some((g) => n === g || n.startsWith(g + ' ') || n.startsWith(g + ','));
  }

  parseChatbotCommand(text: string): 'menu' | 'cancelar' | null {
    const n = this.normalize(text);
    if (n === 'ajuda' || n === 'menu' || n === '/ajuda' || n === '/menu' || n === '?') return 'menu';
    if (n === 'cancelar' || n === 'sair' || n === 'voltar' || n === '/cancelar') return 'cancelar';
    return null;
  }

  private messageNode(rawMessage: unknown): Record<string, any> | undefined {
    const raw = rawMessage as { message?: Record<string, any> };
    return raw.message;
  }

  private extractInteractiveResponse(value: unknown): string | null {
    const response = value as
      | { nativeFlowResponseMessage?: { paramsJson?: string; name?: string } }
      | undefined;
    const params = response?.nativeFlowResponseMessage?.paramsJson;
    if (!params) return response?.nativeFlowResponseMessage?.name ?? null;
    try {
      const parsed = JSON.parse(params) as { id?: string; selectedId?: string };
      return parsed.id ?? parsed.selectedId ?? null;
    } catch {
      return null;
    }
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
