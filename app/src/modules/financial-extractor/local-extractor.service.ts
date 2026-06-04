import { Injectable } from '@nestjs/common';
import {
  ExtractReceiptInput,
  ExtractedTransactionDto,
  ReceiptType,
} from './dto/extracted-transaction.dto';
import { ConfidenceService } from './confidence.service';
import { NormalizationService } from './normalization.service';

const NOT_IDENTIFIED = 'nao identificado';

@Injectable()
export class LocalExtractorService {
  constructor(
    private readonly confidence: ConfidenceService,
    private readonly normalization: NormalizationService,
  ) {}

  extract(input: ExtractReceiptInput): ExtractedTransactionDto {
    const text = [input.text, input.fileName].filter(Boolean).join('\n');
    const base = this.empty(input.tipo, 'local');
    if (!text.trim()) {
      base.campos_duvidosos = this.confidence.doubtfulFields(base);
      return base;
    }

    const amountCents = this.extractAmount(text);
    if (amountCents !== null) {
      base.valor = this.normalization.centsToDecimal(amountCents);
      base.moeda = 'BRL';
    }

    base.data_transacao = this.normalization.date(text) ?? NOT_IDENTIFIED;
    base.hora_transacao = this.normalization.time(text) ?? NOT_IDENTIFIED;
    base.tipo_transferencia = this.extractTransferType(text);
    base.chave_pix = this.extractPixKey(text);
    base.codigo_autenticacao = this.extractAfter(text, ['autenticacao', 'autenticação']);
    base.numero_controle = this.extractAfter(text, ['controle', 'numero de controle']);
    base.id_transacao = this.extractAfter(text, ['id da transacao', 'id transacao', 'e2e', 'endtoendid']);
    base.banco_emissor = this.extractBank(text);
    base.situacao = this.extractSituation(text);
    base.pagador = {
      nome: this.extractParty(text, ['pagador', 'origem', 'remetente', 'solicitante']),
      documento: this.extractDocumentNear(text, ['pagador', 'origem', 'remetente']),
      instituicao: this.extractInstitutionNear(text, ['origem', 'instituicao pagador', 'banco origem']),
    };
    base.recebedor = {
      nome: this.extractParty(text, ['recebedor', 'destino', 'destinatario', 'beneficiario', 'favorecido']),
      documento: this.extractDocumentNear(text, ['recebedor', 'destino', 'destinatario', 'beneficiario']),
      instituicao: this.extractInstitutionNear(text, ['destino', 'instituicao recebedor', 'banco destino']),
    };
    base.descricao = this.describe(base);
    base.confianca = this.confidence.calculate(base);
    base.campos_duvidosos = this.confidence.doubtfulFields(base);
    return base;
  }

  empty(tipo: ReceiptType, fonte: 'local' | 'groq' | 'local+groq'): ExtractedTransactionDto {
    return {
      tipo,
      valor: NOT_IDENTIFIED,
      moeda: 'nao identificado',
      data_transacao: NOT_IDENTIFIED,
      hora_transacao: NOT_IDENTIFIED,
      pagador: {
        nome: NOT_IDENTIFIED,
        documento: NOT_IDENTIFIED,
        instituicao: NOT_IDENTIFIED,
      },
      recebedor: {
        nome: NOT_IDENTIFIED,
        documento: NOT_IDENTIFIED,
        instituicao: NOT_IDENTIFIED,
      },
      chave_pix: NOT_IDENTIFIED,
      tipo_transferencia: NOT_IDENTIFIED,
      id_transacao: NOT_IDENTIFIED,
      codigo_autenticacao: NOT_IDENTIFIED,
      numero_controle: NOT_IDENTIFIED,
      banco_emissor: NOT_IDENTIFIED,
      situacao: NOT_IDENTIFIED,
      descricao: 'Comprovante financeiro',
      confianca: 'baixa',
      fonte_extracao: fonte,
      campos_duvidosos: [],
    };
  }

  private extractAmount(text: string): number | null {
    const patterns = [
      /(?:valor|total|pagamento|transferencia|pix)[^\d]{0,20}(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[,.]\d{2})/i,
      /r\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[,.]\d{2})/i,
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) continue;
      const cents = this.normalization.moneyToCents(match[1]);
      if (cents !== null && cents > 0) return cents;
    }
    return null;
  }

  private extractTransferType(text: string): string {
    const lower = this.normalization.lower(text);
    if (lower.includes('pix')) return 'Pix';
    if (lower.includes('ted')) return 'TED';
    if (lower.includes('doc')) return 'DOC';
    if (lower.includes('boleto')) return 'boleto';
    if (lower.includes('cartao') || lower.includes('cartão')) return 'cartao';
    return NOT_IDENTIFIED;
  }

  private extractPixKey(text: string): string {
    const match = text.match(/(?:chave\s+pix|pix\s+key)\s*:?\s*([^\n\r]+)/i);
    return match ? this.cleanValue(match[1]) : NOT_IDENTIFIED;
  }

  private extractAfter(text: string, labels: string[]): string {
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const lower = this.normalization.lower(line);
      if (!labels.some((label) => lower.includes(this.normalization.lower(label)))) continue;
      const value = line.split(':').slice(1).join(':').trim();
      if (value) return this.cleanValue(value);
      const tokens = line.trim().split(/\s+/);
      if (tokens.length > 1) return this.cleanValue(tokens.slice(-1)[0]);
    }
    return NOT_IDENTIFIED;
  }

  private extractParty(text: string, labels: string[]): string {
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const lower = this.normalization.lower(line);
      if (!labels.some((label) => lower.includes(this.normalization.lower(label)))) continue;
      const value = line.split(':').slice(1).join(':').trim();
      if (value && !/\d{3}/.test(value)) return this.cleanValue(value);
      const next = lines[index + 1]?.trim();
      if (next && !/\d{3}/.test(next)) return this.cleanValue(next);
    }
    return NOT_IDENTIFIED;
  }

  private extractDocumentNear(text: string, labels: string[]): string {
    const documentPattern = /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}|\*{2,}[\d.*-]+)\b/;
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const window = lines.slice(index, index + 4).join(' ');
      const lower = this.normalization.lower(window);
      if (!labels.some((label) => lower.includes(this.normalization.lower(label)))) continue;
      const match = window.match(documentPattern);
      if (match) return match[0];
    }
    const match = text.match(documentPattern);
    return match ? match[0] : NOT_IDENTIFIED;
  }

  private extractInstitutionNear(text: string, labels: string[]): string {
    const banks = [
      'Nubank',
      'Caixa',
      'Sicredi',
      'Itau',
      'Itaú',
      'Bradesco',
      'Santander',
      'Banco do Brasil',
      'Mercado Pago',
      'PicPay',
      'Inter',
      'C6',
      'Sicoob',
    ];
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const window = lines.slice(Math.max(0, index - 1), index + 4).join(' ');
      const lower = this.normalization.lower(window);
      if (!labels.some((label) => lower.includes(this.normalization.lower(label)))) continue;
      const bank = banks.find((item) => lower.includes(this.normalization.lower(item)));
      if (bank) return bank;
    }
    return NOT_IDENTIFIED;
  }

  private extractBank(text: string): string {
    const lower = this.normalization.lower(text);
    const banks = [
      'Nubank',
      'Caixa',
      'Sicredi',
      'Itau',
      'Itaú',
      'Bradesco',
      'Santander',
      'Banco do Brasil',
      'Mercado Pago',
      'PicPay',
      'Inter',
      'C6',
      'Sicoob',
    ];
    return banks.find((bank) => lower.includes(this.normalization.lower(bank))) ?? NOT_IDENTIFIED;
  }

  private extractSituation(text: string): string {
    const lower = this.normalization.lower(text);
    if (lower.includes('efetivado')) return 'efetivado';
    if (lower.includes('realizado')) return 'realizado';
    if (lower.includes('concluido') || lower.includes('concluído')) return 'concluido';
    return NOT_IDENTIFIED;
  }

  private describe(extracted: ExtractedTransactionDto): string {
    const value = extracted.valor === NOT_IDENTIFIED ? 'valor nao identificado' : `R$ ${extracted.valor}`;
    const counterparty =
      extracted.tipo === 'receita' ? extracted.pagador.nome : extracted.recebedor.nome;
    if (counterparty !== NOT_IDENTIFIED) {
      return `${extracted.tipo === 'receita' ? 'Recebimento' : 'Pagamento'} de ${value} - ${counterparty}`;
    }
    return `${extracted.tipo === 'receita' ? 'Recebimento' : 'Pagamento'} de ${value}`;
  }

  private cleanValue(value: string): string {
    return value.replace(/\s{2,}/g, ' ').replace(/[;|]+$/g, '').trim() || NOT_IDENTIFIED;
  }
}
