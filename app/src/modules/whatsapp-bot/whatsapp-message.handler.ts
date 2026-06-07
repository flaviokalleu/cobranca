import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import { PushService } from '../push/push.service';
import { DeepSeekConsultantService } from './deepseek-consultant.service';
import { WhatsappButtonHandler, CorrectionField } from './whatsapp-button.handler';
import { WhatsappFileService } from './whatsapp-file.service';
import { WhatsappOutboundService } from './whatsapp-outbound.service';
import { WhatsappUserStateService } from './whatsapp-user-state.service';

export const PROCESS_WHATSAPP_RECEIPT_JOB = 'PROCESS_WHATSAPP_RECEIPT';

interface RawWhaileysMessage {
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

interface AwaitingRecorrenciaPayload extends PendingReceiptPayload {
  recorrencia?: 'AVULSO' | 'MENSAL';
}

interface AwaitingLeadWhatsappPayload extends PendingReceiptPayload {
  recorrencia: 'MENSAL';
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
    private readonly consultant: DeepSeekConsultantService,
    private readonly events: EventEmitter2,
    private readonly push: PushService,
  ) {}

  registerQueueHandlers(): void {
    this.queue.register<ProcessReceiptJob>(PROCESS_WHATSAPP_RECEIPT_JOB, (job) =>
      this.processReceipt(job),
    );
  }

  async handle(rawMessage: RawWhaileysMessage): Promise<void> {
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
      if (this.buttons.parseGreeting(text)) {
        if (!(await this.sendConfiguredWelcome(remoteJid, rawMessage.pushName))) {
          await this.outbound.sendUnknownWelcome(remoteJid);
        }
      } else {
        await this.outbound.sendText(remoteJid, resolution.message ?? 'Nao foi possivel identificar a empresa.');
      }
      return;
    }
    const tenant = resolution.tenant;
    const whatsappUser = resolution.whatsappUser;
    this.events.emit('notification.realtime', {
      tenantId: tenant.id,
      type: 'whatsapp.message',
      payload: {
        from: phone,
        name: rawMessage.pushName ?? null,
        text: text ? this.preview(text) : null,
      },
    });
    await this.push.notifyTenant(tenant.id, {
      title: 'Mensagem no WhatsApp',
      body: `${rawMessage.pushName ?? phone}: ${text ? this.preview(text) : 'arquivo recebido'}`,
      url: '/admin/whatsapp',
      tag: `whatsapp-${phone}`,
      data: { phone, messageType: rawMessage.message ? Object.keys(rawMessage.message as Record<string, unknown>)[0] : 'text' },
    });

    if (this.isDebtQuestion(text)) {
      await this.replyDebtQuote(tenant.id, remoteJid, phone);
      return;
    }

    if (!this.whatsappUsers.hasPermission(whatsappUser, 'financial_entries:create')) {
      if (this.buttons.parseGreeting(text)) {
        if (!(await this.sendConfiguredWelcome(remoteJid, rawMessage.pushName))) {
          await this.outbound.sendMenu(remoteJid, rawMessage.pushName);
        }
      } else {
        await this.outbound.sendText(
          remoteJid,
          'Seu usuario nao tem permissao para criar lancamentos financeiros.',
        );
      }
      return;
    }

    // Comandos de controle sempre funcionam
    const chatbotCmd = this.buttons.parseChatbotCommand(text);
    if (chatbotCmd === 'cancelar') {
      await this.states.clear(phone);
      this.consultant.clearSession(phone);
      await this.outbound.sendText(remoteJid, 'Operacao cancelada.');
      return;
    }

    // Saudacoes e comando "menu": vai para o consultor se disponivel, senao exibe menu classico
    const isGreeting = this.buttons.parseGreeting(text);
    const isMenuCmd = chatbotCmd === 'menu';
    if ((isGreeting || isMenuCmd) && !this.consultant.isAvailable) {
      if (!(await this.sendConfiguredWelcome(remoteJid, rawMessage.pushName))) {
        await this.outbound.sendMenu(remoteJid, rawMessage.pushName);
      }
      return;
    }

    const state = await this.states.get<PendingReceiptPayload | CorrectionPayload>(phone);
    const confirmation = this.buttons.parseConfirmation(text);
    if (confirmation && state?.state === 'pending_confirmation' && state.payload) {
      await this.handleConfirmation(remoteJid, phone, whatsappUser.id, state.payload, confirmation);
      return;
    }

    // Recorrência: AVULSO ou MENSAL
    if (state?.state === 'awaiting_recorrencia' && state.payload) {
      const recorrencia = this.buttons.parseRecorrencia(text);
      if (!recorrencia) {
        await this.outbound.sendText(remoteJid, 'Responda *avulso* ou *mensal*.');
        return;
      }
      const payload = state.payload as AwaitingRecorrenciaPayload;
      if (recorrencia === 'MENSAL') {
        const pagadorNome = payload.extracted?.pagador?.nome ?? 'pagador';
        await this.states.set<AwaitingLeadWhatsappPayload>({
          tenantId: tenant.id,
          whatsappUserId: whatsappUser.id,
          phone,
          state: 'awaiting_lead_whatsapp',
          payload: { ...payload, recorrencia: 'MENSAL' },
          ttlMinutes: 10,
        });
        await this.outbound.sendLeadWhatsappRequest(remoteJid, pagadorNome);
      } else {
        await this.saveAndConfirm(remoteJid, phone, whatsappUser.id, payload, 'AVULSO', null);
      }
      return;
    }

    // WhatsApp do lead (só para MENSAL)
    if (state?.state === 'awaiting_lead_whatsapp' && state.payload) {
      const payload = state.payload as AwaitingLeadWhatsappPayload;
      const normalized = text.replace(/\D/g, '');
      const leadWhatsapp = (normalized.length >= 10 && text.toLowerCase() !== 'pular') ? normalized : null;
      await this.saveAndConfirm(remoteJid, phone, whatsappUser.id, payload, 'MENSAL', leadWhatsapp);
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

    if (file.hasMedia || (!this.consultant.isAvailable && this.looksLikeReceiptText(text))) {
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

    // Mensagem de texto sem comprovante → consultor AI (DeepSeek)
    if (this.consultant.isAvailable && text) {
      const reply = await this.consultant.chat(phone, tenant.id, text);
      await this.outbound.sendText(remoteJid, reply);
      return;
    }

    await this.outbound.sendText(
      remoteJid,
      'Nao entendi.\n\nEnvie um *comprovante* (imagem ou PDF) para registrar um lancamento, ou digite *menu* para ver as opcoes.',
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

    // Antes de salvar, perguntar recorrência
    try {
      await this.states.set<AwaitingRecorrenciaPayload>({
        tenantId: payload.tenantId ?? '',
        whatsappUserId,
        phone,
        state: 'awaiting_recorrencia',
        payload,
        ttlMinutes: 10,
      });
      const pagadorNome = payload.extracted?.pagador?.nome ?? 'pagador';
      await this.outbound.sendRecorrenciaButtons(remoteJid, pagadorNome);
      return;
    } catch {
      await this.outbound.sendText(
        remoteJid,
        'Nao consegui salvar esse lancamento. Corrija os campos principais e tente novamente.',
      );
    }
  }

  private async saveAndConfirm(
    remoteJid: string,
    phone: string,
    whatsappUserId: string,
    payload: PendingReceiptPayload,
    recorrencia: 'AVULSO' | 'MENSAL',
    leadWhatsapp: string | null,
  ): Promise<void> {
    try {
      await this.financialEntries.saveFromWhatsapp({
        tenantId: payload.tenantId ?? '',
        whatsappUserId,
        userWhatsapp: phone,
        extracted: payload.extracted,
        recorrencia,
        leadWhatsapp,
      });
      await this.states.clear(phone);
      const leadMsg = payload.extracted?.pagador?.nome
        ? ` Lead *${payload.extracted.pagador.nome}* registrado no CRM.`
        : '';
      const recMsg = recorrencia === 'MENSAL' ? ' Pagamento recorrente mensal configurado.' : '';
      await this.outbound.sendText(remoteJid, `✅ Lancamento salvo com sucesso!${recMsg}${leadMsg}`);
    } catch {
      await this.outbound.sendText(
        remoteJid,
        'Nao consegui salvar esse lancamento. Tente novamente.',
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

  private async sendConfiguredWelcome(remoteJid: string, name?: string): Promise<boolean> {
    const bot = await this.prisma.mainWhatsappBot.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { welcomeMessage: true },
    });
    const message = bot?.welcomeMessage?.trim();
    if (!message) return false;
    await this.outbound.sendText(
      remoteJid,
      message.replace(/\{nome\}/g, name?.trim() || 'cliente'),
    );
    return true;
  }

  private looksLikeReceiptText(text: string): boolean {
    const normalized = text.toLowerCase();
    return /r\$\s*\d|pix|comprovante|transferencia|pagamento|recebimento/i.test(normalized);
  }

  private preview(text: string): string {
    const normalized = text.replace(/\s+/g, ' ').trim();
    return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized;
  }

  private isDebtQuestion(text: string): boolean {
    return /quanto\s+devo|meu\s+saldo|minha\s+divida|quitar\s+emprestimo/i.test(
      text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    );
  }

  private async replyDebtQuote(tenantId: string, remoteJid: string, phone: string): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        OR: [{ phone }, { whatsapp: phone }, { phone: { endsWith: phone.slice(-8) } }, { whatsapp: { endsWith: phone.slice(-8) } }],
      },
      select: { id: true, name: true },
    });
    if (!customer) {
      await this.outbound.sendText(remoteJid, 'Nao encontrei emprestimo vinculado a este telefone.');
      return;
    }
    const loans = await this.prisma.loan.findMany({
      where: {
        tenantId,
        customerId: customer.id,
        status: { in: ['ACTIVE', 'DEFAULTED', 'PENDING_SIGNATURE'] },
      },
      include: { installmentsList: true },
    });
    const pending = loans.flatMap((loan) =>
      loan.installmentsList
        .filter((installment) => installment.status !== 'PAID')
        .map((installment) => ({
          totalCents: installment.totalCents,
          dueAt: installment.dueAt,
        })),
    );
    if (!pending.length) {
      await this.outbound.sendText(remoteJid, `${customer.name}, nao ha parcelas pendentes no momento.`);
      return;
    }
    const totalCents = pending.reduce((sum, row) => sum + row.totalCents, 0);
    const nextDue = pending.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())[0];
    await this.outbound.sendText(
      remoteJid,
      `${customer.name}, seu saldo em aberto e ${(totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.\n` +
        `Proximo vencimento: ${nextDue.dueAt.toLocaleDateString('pt-BR')}.`,
    );
  }
}
