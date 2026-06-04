import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueueService } from '../../common/queue/queue.service';
import { CompanyActivationService } from '../companies/company-activation.service';
import { CompanyResolverService } from '../companies/company-resolver.service';
import { WhatsappUserService } from '../companies/whatsapp-user.service';
import {
  ExtractReceiptInput,
  ExtractedTransactionDto,
  ReceiptType,
} from '../financial-extractor/dto/extracted-transaction.dto';
import { FinancialExtractorService } from '../financial-extractor/financial-extractor.service';
import { NormalizationService } from '../financial-extractor/normalization.service';
import { FinancialEntriesService } from '../financial-entries/financial-entries.service';
import { WhatsappButtonHandler, CorrectionField } from './whatsapp-button.handler';
import { WhatsappFileService } from './whatsapp-file.service';
import { WhatsappOutboundService } from './whatsapp-outbound.service';
import { WhatsappUserStateService } from './whatsapp-user-state.service';

export const PROCESS_WHATSAPP_RECEIPT_JOB = 'PROCESS_WHATSAPP_RECEIPT';

interface RawBaileysMessage {
  key?: { remoteJid?: string; fromMe?: boolean };
  pushName?: string;
  message?: unknown;
}

interface ReceiptDraftPayload extends ExtractReceiptInput {
  companyName: string;
  tenantId?: string;
  whatsappUserId?: string;
  phone?: string;
}

interface PendingReceiptPayload extends ReceiptDraftPayload {
  extracted: ExtractedTransactionDto;
}

interface CorrectionPayload extends PendingReceiptPayload {
  field?: CorrectionField;
}

interface ProcessReceiptJob extends ReceiptDraftPayload {
  tenantId: string;
  whatsappUserId: string;
  phone: string;
}

@Injectable()
export class WhatsappMessageHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly activation: CompanyActivationService,
    private readonly resolver: CompanyResolverService,
    private readonly whatsappUsers: WhatsappUserService,
    private readonly buttons: WhatsappButtonHandler,
    private readonly files: WhatsappFileService,
    private readonly states: WhatsappUserStateService,
    private readonly outbound: WhatsappOutboundService,
    private readonly extractor: FinancialExtractorService,
    private readonly financialEntries: FinancialEntriesService,
    private readonly normalization: NormalizationService,
  ) {}

  registerQueueHandlers(): void {
    this.queue.register<ProcessReceiptJob>(PROCESS_WHATSAPP_RECEIPT_JOB, (job) =>
      this.processReceipt(job),
    );
  }

  async handle(rawMessage: RawBaileysMessage): Promise<void> {
    const remoteJid = rawMessage.key?.remoteJid;
    if (!remoteJid || rawMessage.key?.fromMe || remoteJid === 'status@broadcast') return;
    if (remoteJid.endsWith('@g.us')) return;

    const phone = remoteJid.split('@')[0].replace(/\D/g, '');
    const text = this.buttons.extractText(rawMessage);
    const activationCode = this.activation.extractCode(text);

    if (!(await this.isMainBotActive())) {
      await this.outbound.sendText(
        remoteJid,
        'O robo financeiro esta temporariamente indisponivel.',
      );
      return;
    }

    if (activationCode) {
      const result = await this.activation.activateWithCode({
        code: activationCode,
        phone,
        displayName: rawMessage.pushName ?? null,
      });
      await this.outbound.sendText(remoteJid, result.message);
      return;
    }

    const resolution = await this.resolver.resolveByWhatsappPhone(phone);
    if (!resolution.ok || !resolution.tenant || !resolution.whatsappUser) {
      await this.outbound.sendText(remoteJid, resolution.message ?? 'Nao foi possivel identificar a empresa.');
      return;
    }
    const tenant = resolution.tenant;
    const whatsappUser = resolution.whatsappUser;

    if (!this.whatsappUsers.hasPermission(whatsappUser, 'financial_entries:create')) {
      await this.outbound.sendText(
        remoteJid,
        'Seu usuario nao tem permissao para criar lancamentos financeiros.',
      );
      return;
    }

    const state = await this.states.get<PendingReceiptPayload | CorrectionPayload>(phone);
    const confirmation = this.buttons.parseConfirmation(text);
    if (confirmation && state?.state === 'pending_confirmation' && state.payload) {
      await this.handleConfirmation(remoteJid, phone, whatsappUser.id, state.payload, confirmation);
      return;
    }

    if (state?.state === 'awaiting_correction_field' && state.payload) {
      await this.handleCorrectionField(remoteJid, phone, { tenant, whatsappUser }, state.payload, text);
      return;
    }

    if (state?.state === 'awaiting_correction_value' && state.payload) {
      await this.handleCorrectionValue(remoteJid, phone, { tenant, whatsappUser }, state.payload as CorrectionPayload, text);
      return;
    }

    const receiptType = this.buttons.parseReceiptType(text);
    if (receiptType && state?.state === 'awaiting_receipt_type' && state.payload) {
      const payload = {
        ...(state.payload as ReceiptDraftPayload),
        tipo: receiptType,
        tenantId: tenant.id,
        whatsappUserId: whatsappUser.id,
        phone,
      };
      await this.states.set({
        tenantId: tenant.id,
        whatsappUserId: whatsappUser.id,
        phone,
        state: 'processing_receipt',
        payload,
        ttlMinutes: 10,
      });
      this.queue.enqueue(PROCESS_WHATSAPP_RECEIPT_JOB, payload);
      await this.outbound.sendText(remoteJid, 'Estou analisando o comprovante. Ja te envio o resumo.');
      return;
    }

    if (receiptType || confirmation) {
      await this.outbound.sendText(
        remoteJid,
        'Nao encontrei nenhum comprovante pendente. Envie um comprovante primeiro.',
      );
      return;
    }

    const file = await this.files.extract(rawMessage);
    if (file.tooLarge) {
      await this.outbound.sendText(
        remoteJid,
        'Esse arquivo esta muito grande. Envie uma imagem ou PDF menor.',
      );
      return;
    }

    if (file.hasMedia || this.looksLikeReceiptText(text)) {
      await this.states.set<ReceiptDraftPayload>({
        tenantId: tenant.id,
        whatsappUserId: whatsappUser.id,
        phone,
        state: 'awaiting_receipt_type',
        payload: {
          tipo: 'gasto',
          text: [file.text, text].filter(Boolean).join('\n'),
          fileName: file.fileName,
          mimeType: file.mimeType,
          mediaBase64: file.mediaBase64,
          companyName: tenant.name,
        },
        ttlMinutes: 30,
      });
      await this.outbound.sendReceiptTypeButtons(remoteJid);
      return;
    }

    await this.outbound.sendText(
      remoteJid,
      'Envie uma imagem ou PDF de comprovante, ou envie seu codigo de ativacao se ainda nao ativou este numero.',
    );
  }

  private async processReceipt(job: ProcessReceiptJob): Promise<void> {
    const extracted = await this.extractor.extract(job);
    await this.states.set<PendingReceiptPayload>({
      tenantId: job.tenantId,
      whatsappUserId: job.whatsappUserId,
      phone: job.phone,
      state: 'pending_confirmation',
      payload: { ...job, extracted },
      ttlMinutes: 30,
    });
    await this.outbound.sendConfirmationButtons(job.phone, extracted, job.companyName);
  }

  private async handleConfirmation(
    remoteJid: string,
    phone: string,
    whatsappUserId: string,
    payload: PendingReceiptPayload,
    action: 'save' | 'correct' | 'cancel',
  ): Promise<void> {
    if (action === 'cancel') {
      await this.states.clear(phone);
      await this.outbound.sendText(remoteJid, 'Lancamento cancelado.');
      return;
    }

    if (action === 'correct') {
      await this.states.set<CorrectionPayload>({
        tenantId: payload.tenantId ?? '',
        whatsappUserId,
        phone,
        state: 'awaiting_correction_field',
        payload,
        ttlMinutes: 30,
      });
      await this.outbound.sendText(
        remoteJid,
        'Qual campo deseja corrigir? Responda: Valor, Data, Pagador, Recebedor, Tipo ou Descricao.',
      );
      return;
    }

    try {
      await this.financialEntries.saveFromWhatsapp({
        tenantId: payload.tenantId ?? '',
        whatsappUserId,
        userWhatsapp: phone,
        extracted: payload.extracted,
      });
      await this.states.clear(phone);
      await this.outbound.sendText(remoteJid, 'Lancamento salvo com sucesso.');
    } catch {
      await this.outbound.sendText(
        remoteJid,
        'Nao consegui salvar esse lancamento. Corrija os campos principais e tente novamente.',
      );
    }
  }

  private async handleCorrectionField(
    remoteJid: string,
    phone: string,
    resolution: {
      tenant: { id: string };
      whatsappUser: { id: string };
    },
    payload: PendingReceiptPayload,
    text: string,
  ): Promise<void> {
    const field = this.buttons.parseCorrectionField(text);
    if (!field) {
      await this.outbound.sendText(
        remoteJid,
        'Campo invalido. Responda: Valor, Data, Pagador, Recebedor, Tipo ou Descricao.',
      );
      return;
    }
    await this.states.set<CorrectionPayload>({
      tenantId: resolution.tenant.id,
      whatsappUserId: resolution.whatsappUser.id,
      phone,
      state: 'awaiting_correction_value',
      payload: { ...payload, field },
      ttlMinutes: 30,
    });
    await this.outbound.sendText(remoteJid, `Envie o novo valor para ${field}.`);
  }

  private async handleCorrectionValue(
    remoteJid: string,
    phone: string,
    resolution: {
      tenant: { id: string; name: string };
      whatsappUser: { id: string };
    },
    payload: CorrectionPayload,
    value: string,
  ): Promise<void> {
    if (!payload.field) {
      await this.states.clear(phone);
      await this.outbound.sendText(remoteJid, 'Nao encontrei o campo pendente. Envie o comprovante novamente.');
      return;
    }
    const extracted = this.applyCorrection(payload.extracted, payload.field, value);
    await this.states.set<PendingReceiptPayload>({
      tenantId: resolution.tenant.id,
      whatsappUserId: resolution.whatsappUser.id,
      phone,
      state: 'pending_confirmation',
      payload: { ...payload, extracted, companyName: resolution.tenant.name },
      ttlMinutes: 30,
    });
    await this.outbound.sendConfirmationButtons(remoteJid, extracted, resolution.tenant.name);
  }

  private applyCorrection(
    extracted: ExtractedTransactionDto,
    field: CorrectionField,
    value: string,
  ): ExtractedTransactionDto {
    const next: ExtractedTransactionDto = {
      ...extracted,
      pagador: { ...extracted.pagador },
      recebedor: { ...extracted.recebedor },
      confianca: extracted.confianca === 'baixa' ? 'media' : extracted.confianca,
    };
    if (field === 'valor') {
      const cents = this.normalization.moneyToCents(value);
      next.valor = cents ? this.normalization.centsToDecimal(cents) : value;
      next.moeda = 'BRL';
    }
    if (field === 'data') next.data_transacao = this.normalization.date(value) ?? value;
    if (field === 'pagador') next.pagador.nome = value;
    if (field === 'recebedor') next.recebedor.nome = value;
    if (field === 'tipo') next.tipo = this.buttons.parseReceiptType(value) ?? next.tipo;
    if (field === 'descricao') next.descricao = value;
    next.campos_duvidosos = next.campos_duvidosos.filter((item) => !item.startsWith(field));
    return next;
  }

  private async isMainBotActive(): Promise<boolean> {
    const bot = await this.prisma.mainWhatsappBot.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (!bot) return true;
    return bot.isActive && !['inactive', 'blocked'].includes(bot.status);
  }

  private looksLikeReceiptText(text: string): boolean {
    const normalized = text.toLowerCase();
    return /r\$\s*\d|pix|comprovante|transferencia|pagamento|recebimento/i.test(normalized);
  }
}
