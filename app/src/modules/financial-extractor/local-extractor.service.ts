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
    base.codigo_autenticacao = this.extractAfter(text, [
      'autenticacao', 'autenticação', 'cod. autenticacao', 'codigo de autenticacao',
      'protocolo', 'comprovante n', 'nsu', 'codigo do comprovante',
    ]);
    base.numero_controle = this.extractAfter(text, [
      'controle', 'numero de controle', 'num. controle', 'numero do documento',
      'numero da operacao', 'n. da operacao',
    ]);
    base.id_transacao = this.extractAfter(text, [
      'id da transacao', 'id transacao', 'e2e', 'endtoendid', 'end to end',
      'id da transação', 'identificador', 'codigo da transacao',
    ]);
    // Inline EndToEndId pattern (Nubank: E182361202026...)
    if (base.id_transacao === NOT_IDENTIFIED) {
      const e2e = text.match(/\b(E\d{8,}[A-Za-z0-9]{10,})\b/);
      if (e2e) base.id_transacao = e2e[1];
    }
    base.banco_emissor = this.extractBank(text);
    base.situacao = this.extractSituation(text);
    base.pagador = {
      nome: this.extractParty(text, [
        'pagador', 'origem', 'remetente', 'solicitante', 'quem pagou',
        'de:', 'nome do pagador', 'conta debito', 'debitado de',
      ]),
      documento: this.extractDocumentNear(text, [
        'pagador', 'origem', 'remetente', 'cpf pagador', 'cnpj pagador',
      ]),
      instituicao: this.extractInstitutionNear(text, [
        'origem', 'instituicao pagador', 'banco origem', 'instituicao de origem',
        'banco do pagador', 'instituicao financeira origem',
      ]),
    };
    base.recebedor = {
      nome: this.extractParty(text, [
        'recebedor', 'destino', 'destinatario', 'beneficiario', 'favorecido',
        'para:', 'nome do recebedor', 'conta credito', 'creditado para',
        'recebeu', 'quem recebeu',
      ]),
      documento: this.extractDocumentNear(text, [
        'recebedor', 'destino', 'destinatario', 'beneficiario', 'favorecido',
        'cpf recebedor', 'cnpj recebedor',
      ]),
      instituicao: this.extractInstitutionNear(text, [
        'destino', 'instituicao recebedor', 'banco destino', 'instituicao de destino',
        'banco do recebedor', 'instituicao financeira destino',
      ]),
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
    // Ordered by specificity: labeled amount first, then standalone R$
    const patterns = [
      /(?:valor|total|quantia|importe|montante|pagamento|transferencia|pix|credito|debito)[^\d]{0,30}(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[,.]\d{2})/i,
      /r\$\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d+[,.]\d{2})/i,
      // Boleto/BB pattern: "R$ 1.234,56"
      /(\d{1,3}(?:\.\d{3})*,\d{2})\s*(?:reais|brl)/i,
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
    if (lower.includes('cred') && lower.includes('cc')) return 'cartao_credito';
    if (lower.includes('transferencia interna') || lower.includes('entre contas')) return 'transferencia_interna';
    if (lower.includes('deposito')) return 'deposito';
    if (lower.includes('pagamento de conta') || lower.includes('pag conta')) return 'pagamento_conta';
    return NOT_IDENTIFIED;
  }

  private extractPixKey(text: string): string {
    // Labeled key (all banks)
    const labeled = text.match(/(?:chave\s+pix|pix\s+key|chave)\s*:?\s*([^\n\r]{3,80})/i);
    if (labeled) return this.cleanValue(labeled[1]);
    // E-mail key inline
    const email = text.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i);
    if (email) return email[0];
    return NOT_IDENTIFIED;
  }

  private extractAfter(text: string, labels: string[]): string {
    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const lower = this.normalization.lower(line);
      const matchedLabel = labels.find((label) => lower.includes(this.normalization.lower(label)));
      if (!matchedLabel) continue;

      // Value after colon: "ID da transação: E003..."
      const afterColon = line.split(':').slice(1).join(':').trim();
      if (afterColon && afterColon.length > 2) return this.cleanValue(afterColon);

      // Value concatenated without separator: "ID transaçãoE003..." (PDF artifact)
      const labelNorm = this.normalization.lower(matchedLabel);
      const lineNorm = this.normalization.lower(line);
      const labelPos = lineNorm.indexOf(labelNorm);
      if (labelPos !== -1) {
        const afterLabel = line.slice(labelPos + matchedLabel.length).trim();
        if (afterLabel && afterLabel.length > 2) return this.cleanValue(afterLabel);
      }

      // Value on the next line: "ID da transação:\nE18236..."
      const next = lines[index + 1]?.trim();
      if (next && next.length > 2 && !next.endsWith(':')) return this.cleanValue(next);
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
      if (value && !/\d{3}/.test(value)) return this.stripPartyLabel(value);
      const next = lines[index + 1]?.trim();
      if (next && !/\d{3}/.test(next)) return this.stripPartyLabel(next);
    }
    return NOT_IDENTIFIED;
  }

  // Remove "Nome ", "Name ", "Pagador " etc. OCR label prefixes from extracted party names
  private stripPartyLabel(value: string): string {
    // Handle both "Nome Flávio" and "NomeFlávio" (PDF items joined without space)
    const cleaned = value.replace(/^(?:nome|name|pagador|recebedor|destinatario|favorecido)\s*/i, '').trim();
    return this.cleanValue(cleaned || value);
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
      'NU PAGAMENTOS',
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
      'Next',
      'Neon',
      'Pagseguro',
      'Stone',
      'Safra',
      'Banrisul',
      'BTG',
      'XP',
      'Modal',
      'Original',
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
      ['NU PAGAMENTOS', 'Nubank'],
      ['Nubank', 'Nubank'],
      ['Caixa Economica', 'Caixa'],
      ['Caixa', 'Caixa'],
      ['Sicredi', 'Sicredi'],
      ['Itau Unibanco', 'Itau'],
      ['Itaú', 'Itau'],
      ['Itau', 'Itau'],
      ['Bradesco', 'Bradesco'],
      ['Santander', 'Santander'],
      ['Banco do Brasil', 'Banco do Brasil'],
      ['Mercado Pago', 'Mercado Pago'],
      ['PicPay', 'PicPay'],
      ['Banco Inter', 'Inter'],
      ['Inter', 'Inter'],
      ['C6 Bank', 'C6'],
      ['C6', 'C6'],
      ['Sicoob', 'Sicoob'],
      ['Next', 'Next'],
      ['Neon', 'Neon'],
      ['Pagseguro', 'Pagseguro'],
      ['Stone', 'Stone'],
      ['Safra', 'Safra'],
      ['Banrisul', 'Banrisul'],
      ['BTG Pactual', 'BTG'],
      ['XP Investimentos', 'XP'],
    ] as [string, string][];
    const found = banks.find(([alias]) => lower.includes(this.normalization.lower(alias)));
    return found ? found[1] : NOT_IDENTIFIED;
  }

  private extractSituation(text: string): string {
    const lower = this.normalization.lower(text);
    if (lower.includes('efetivado')) return 'efetivado';
    if (lower.includes('realizado')) return 'realizado';
    if (lower.includes('concluido') || lower.includes('concluído')) return 'concluido';
    if (lower.includes('aprovado')) return 'aprovado';
    if (lower.includes('confirmado')) return 'confirmado';
    if (lower.includes('pago')) return 'pago';
    // Comprovante com dados completos implica transação bem-sucedida
    if (lower.includes('comprovante') && (lower.includes('transferencia') || lower.includes('pagamento') || lower.includes('pix'))) return 'efetivado';
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
