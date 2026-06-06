import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { DeepSeekService } from '../ai/deepseek.service';
import { WhatsappOutboundService } from '../whatsapp-bot/whatsapp-outbound.service';
import { parseOFX } from './ofx-parser';
import { CreatePersonalFinanceAccountDto } from './dto/create-personal-finance-account.dto';
import { CreatePersonalCreditCardDto } from './dto/create-personal-credit-card.dto';
import { CreatePersonalTransactionDto } from './dto/create-personal-transaction.dto';
import { IngestFinanceMessageDto } from './dto/ingest-finance-message.dto';
import { CreateSpendingLimitDto } from './dto/create-spending-limit.dto';
import { CreateInvestmentGoalDto } from './dto/create-investment-goal.dto';
import { ContributeInvestmentGoalDto } from './dto/contribute-investment-goal.dto';
import { UpdatePersonalFinanceAccountDto } from './dto/update-personal-finance-account.dto';
import { UpdatePersonalCreditCardDto } from './dto/update-personal-credit-card.dto';
import { UpdatePersonalTransactionDto } from './dto/update-personal-transaction.dto';
import { UpdateSpendingLimitDto } from './dto/update-spending-limit.dto';
import { UpdateInvestmentGoalDto } from './dto/update-investment-goal.dto';

interface ClassifiedMessage {
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  amountCents: number;
  description: string;
  category: string;
  subcategory?: string;
  occurredAt: Date;
  confidence: number;
}

interface TransactionBalanceInput {
  accountId: string | null;
  type: string;
  amountCents: number;
}

@Injectable()
export class PersonalFinanceService {
  private readonly logger = new Logger(PersonalFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly deepseek: DeepSeekService,
    private readonly outbound: WhatsappOutboundService,
  ) {}

  async createAccount(tenantId: string, dto: CreatePersonalFinanceAccountDto) {
    const account = await this.prisma.personalFinanceAccount.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type ?? 'CHECKING',
        balanceCents: dto.balanceCents ?? 0,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PERSONAL_FINANCE_ACCOUNT_CREATED',
      entityType: 'PersonalFinanceAccount',
      entityId: account.id,
    });
    return account;
  }

  listAccounts(tenantId: string) {
    return this.prisma.personalFinanceAccount.findMany({
      where: { tenantId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateAccount(
    tenantId: string,
    id: string,
    dto: UpdatePersonalFinanceAccountDto,
  ) {
    const current = await this.prisma.personalFinanceAccount.findFirst({
      where: { id, tenantId },
    });
    if (!current) throw new NotFoundException('Conta nao encontrada neste tenant.');
    const account = await this.prisma.personalFinanceAccount.update({
      where: { id: current.id },
      data: {
        name: dto.name,
        type: dto.type,
        balanceCents: dto.balanceCents,
        active: dto.active,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PERSONAL_FINANCE_ACCOUNT_UPDATED',
      entityType: 'PersonalFinanceAccount',
      entityId: account.id,
    });
    return account;
  }

  async removeAccount(tenantId: string, id: string) {
    const current = await this.prisma.personalFinanceAccount.findFirst({
      where: { id, tenantId },
    });
    if (!current) throw new NotFoundException('Conta nao encontrada neste tenant.');
    await this.prisma.personalFinanceAccount.update({
      where: { id: current.id },
      data: { active: false },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PERSONAL_FINANCE_ACCOUNT_DELETED',
      entityType: 'PersonalFinanceAccount',
      entityId: current.id,
    });
    return { ok: true };
  }

  async createCard(tenantId: string, dto: CreatePersonalCreditCardDto) {
    const card = await this.prisma.personalCreditCard.create({
      data: {
        tenantId,
        name: dto.name,
        limitCents: dto.limitCents,
        closingDay: dto.closingDay ?? null,
        dueDay: dto.dueDay ?? null,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PERSONAL_CREDIT_CARD_CREATED',
      entityType: 'PersonalCreditCard',
      entityId: card.id,
    });
    return card;
  }

  listCards(tenantId: string) {
    return this.prisma.personalCreditCard.findMany({
      where: { tenantId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCard(
    tenantId: string,
    id: string,
    dto: UpdatePersonalCreditCardDto,
  ) {
    const current = await this.prisma.personalCreditCard.findFirst({
      where: { id, tenantId },
    });
    if (!current) throw new NotFoundException('Cartao nao encontrado neste tenant.');
    const card = await this.prisma.personalCreditCard.update({
      where: { id: current.id },
      data: {
        name: dto.name,
        limitCents: dto.limitCents,
        closingDay: dto.closingDay === undefined ? undefined : dto.closingDay,
        dueDay: dto.dueDay === undefined ? undefined : dto.dueDay,
        active: dto.active,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PERSONAL_CREDIT_CARD_UPDATED',
      entityType: 'PersonalCreditCard',
      entityId: card.id,
    });
    return card;
  }

  async removeCard(tenantId: string, id: string) {
    const current = await this.prisma.personalCreditCard.findFirst({
      where: { id, tenantId },
    });
    if (!current) throw new NotFoundException('Cartao nao encontrado neste tenant.');
    await this.prisma.personalCreditCard.update({
      where: { id: current.id },
      data: { active: false },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PERSONAL_CREDIT_CARD_DELETED',
      entityType: 'PersonalCreditCard',
      entityId: current.id,
    });
    return { ok: true };
  }

  async createTransaction(tenantId: string, dto: CreatePersonalTransactionDto) {
    await this.ensureAccount(tenantId, dto.accountId);
    await this.ensureCard(tenantId, dto.cardId);

    const transaction = await this.prisma.$transaction(async (db) => {
      const created = await db.personalFinanceTransaction.create({
        data: {
          tenantId,
          accountId: dto.accountId ?? null,
          cardId: dto.cardId ?? null,
          type: dto.type,
          amountCents: dto.amountCents,
          description: dto.description,
          category: dto.category ?? 'Outros',
          subcategory: dto.subcategory ?? null,
          occurredAt: new Date(dto.occurredAt),
          source: dto.source ?? 'MANUAL',
          rawInput: dto.rawInput ?? null,
          attachmentUrl: dto.attachmentUrl ?? null,
          classifier: 'MANUAL',
          confidence: 100,
        },
      });

      if (dto.accountId && dto.type !== 'TRANSFER') {
        await db.personalFinanceAccount.update({
          where: { id: dto.accountId },
          data: {
            balanceCents: {
              increment: dto.type === 'INCOME' ? dto.amountCents : -dto.amountCents,
            },
          },
        });
      }

      return created;
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PERSONAL_FINANCE_TRANSACTION_CREATED',
      entityType: 'PersonalFinanceTransaction',
      entityId: transaction.id,
      metadata: { type: transaction.type, amountCents: transaction.amountCents },
    });
    await this.checkSpendingLimit(tenantId, transaction.category);
    return transaction;
  }

  async ingestMessage(tenantId: string, dto: IngestFinanceMessageDto) {
    let classified: ClassifiedMessage;
    let classifierName: string;

    if (this.deepseek.isConfigured) {
      try {
        const result = await this.deepseek.classifyTransaction(dto.message);
        classified = result;
        classifierName = 'DEEPSEEK';
      } catch (err) {
        this.logger.warn(`DeepSeek falhou, usando regras: ${String(err)}`);
        classified = this.classify(dto.message);
        classifierName = 'RULES';
      }
    } else {
      classified = this.classify(dto.message);
      classifierName = 'RULES';
    }

    if (classified.amountCents <= 0) {
      throw new BadRequestException('Nao encontrei um valor financeiro na mensagem.');
    }

    const transaction = await this.createTransaction(tenantId, {
      type: classified.type,
      amountCents: classified.amountCents,
      description: classified.description,
      category: classified.category,
      subcategory: classified.subcategory,
      occurredAt: classified.occurredAt.toISOString(),
      source: dto.source ?? 'WHATSAPP_TEXT',
      rawInput: dto.message,
      attachmentUrl: dto.attachmentUrl,
    });
    await this.prisma.personalFinanceTransaction.update({
      where: { id: transaction.id },
      data: { classifier: classifierName, confidence: classified.confidence },
    });
    const label = classified.type === 'INCOME' ? 'Receita' : classified.type === 'TRANSFER' ? 'Transferencia' : 'Gasto';
    return {
      transaction: { ...transaction, confidence: classified.confidence },
      reply: `${label} registrado: ${this.money(classified.amountCents)} em ${classified.category}.`,
    };
  }

  listTransactions(tenantId: string) {
    return this.prisma.personalFinanceTransaction.findMany({
      where: { tenantId },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
  }

  async updateTransaction(
    tenantId: string,
    id: string,
    dto: UpdatePersonalTransactionDto,
  ) {
    const current = await this.prisma.personalFinanceTransaction.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Transacao nao encontrada neste tenant.');
    }

    const nextAccountId =
      dto.accountId === undefined ? current.accountId : dto.accountId;
    const nextCardId = dto.cardId === undefined ? current.cardId : dto.cardId;
    await this.ensureAccount(tenantId, nextAccountId);
    await this.ensureCard(tenantId, nextCardId);

    const nextBalanceInput: TransactionBalanceInput = {
      accountId: nextAccountId,
      type: dto.type ?? current.type,
      amountCents: dto.amountCents ?? current.amountCents,
    };
    const oldImpact = this.accountBalanceImpact(current);
    const nextImpact = this.accountBalanceImpact(nextBalanceInput);

    const transaction = await this.prisma.$transaction(async (db) => {
      if (current.accountId && oldImpact !== 0) {
        await db.personalFinanceAccount.update({
          where: { id: current.accountId },
          data: { balanceCents: { increment: -oldImpact } },
        });
      }
      if (nextAccountId && nextImpact !== 0) {
        await db.personalFinanceAccount.update({
          where: { id: nextAccountId },
          data: { balanceCents: { increment: nextImpact } },
        });
      }
      return db.personalFinanceTransaction.update({
        where: { id: current.id },
        data: {
          accountId: dto.accountId === undefined ? undefined : dto.accountId,
          cardId: dto.cardId === undefined ? undefined : dto.cardId,
          type: dto.type,
          amountCents: dto.amountCents,
          description: dto.description,
          category: dto.category,
          subcategory: dto.subcategory === undefined ? undefined : dto.subcategory,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
          source: dto.source,
          rawInput: dto.rawInput === undefined ? undefined : dto.rawInput,
          attachmentUrl:
            dto.attachmentUrl === undefined ? undefined : dto.attachmentUrl,
        },
      });
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PERSONAL_FINANCE_TRANSACTION_UPDATED',
      entityType: 'PersonalFinanceTransaction',
      entityId: transaction.id,
      metadata: { type: transaction.type, amountCents: transaction.amountCents },
    });
    await this.checkSpendingLimit(tenantId, transaction.category);
    return transaction;
  }

  async removeTransaction(tenantId: string, id: string) {
    const current = await this.prisma.personalFinanceTransaction.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Transacao nao encontrada neste tenant.');
    }
    const oldImpact = this.accountBalanceImpact(current);
    await this.prisma.$transaction(async (db) => {
      if (current.accountId && oldImpact !== 0) {
        await db.personalFinanceAccount.update({
          where: { id: current.accountId },
          data: { balanceCents: { increment: -oldImpact } },
        });
      }
      await db.personalFinanceTransaction.delete({ where: { id: current.id } });
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PERSONAL_FINANCE_TRANSACTION_DELETED',
      entityType: 'PersonalFinanceTransaction',
      entityId: current.id,
    });
    return { ok: true };
  }

  async createLimit(tenantId: string, dto: CreateSpendingLimitDto) {
    const limit = await this.prisma.spendingLimit.create({
      data: {
        tenantId,
        category: dto.category,
        period: dto.period ?? 'MONTHLY',
        limitCents: dto.limitCents,
        alertThresholdPercent: dto.alertThresholdPercent ?? 80,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'SPENDING_LIMIT_CREATED',
      entityType: 'SpendingLimit',
      entityId: limit.id,
      metadata: { category: limit.category, limitCents: limit.limitCents },
    });
    return limit;
  }

  listLimits(tenantId: string) {
    return this.prisma.spendingLimit.findMany({
      where: { tenantId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLimit(tenantId: string, id: string, dto: UpdateSpendingLimitDto) {
    const current = await this.prisma.spendingLimit.findFirst({
      where: { id, tenantId },
    });
    if (!current) throw new NotFoundException('Limite nao encontrado neste tenant.');
    const limit = await this.prisma.spendingLimit.update({
      where: { id: current.id },
      data: {
        category: dto.category,
        period: dto.period,
        limitCents: dto.limitCents,
        alertThresholdPercent: dto.alertThresholdPercent,
        active: dto.active,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'SPENDING_LIMIT_UPDATED',
      entityType: 'SpendingLimit',
      entityId: limit.id,
      metadata: { category: limit.category, limitCents: limit.limitCents },
    });
    return limit;
  }

  async removeLimit(tenantId: string, id: string) {
    const current = await this.prisma.spendingLimit.findFirst({
      where: { id, tenantId },
    });
    if (!current) throw new NotFoundException('Limite nao encontrado neste tenant.');
    await this.prisma.spendingLimit.update({
      where: { id: current.id },
      data: { active: false },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'SPENDING_LIMIT_DELETED',
      entityType: 'SpendingLimit',
      entityId: current.id,
    });
    return { ok: true };
  }

  async createGoal(tenantId: string, dto: CreateInvestmentGoalDto) {
    const goal = await this.prisma.investmentGoal.create({
      data: {
        tenantId,
        name: dto.name,
        targetCents: dto.targetCents,
        currentCents: dto.currentCents ?? 0,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes ?? null,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'INVESTMENT_GOAL_CREATED',
      entityType: 'InvestmentGoal',
      entityId: goal.id,
      metadata: { targetCents: goal.targetCents },
    });
    return goal;
  }

  listGoals(tenantId: string) {
    return this.prisma.investmentGoal.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateGoal(tenantId: string, id: string, dto: UpdateInvestmentGoalDto) {
    const current = await this.prisma.investmentGoal.findFirst({
      where: { id, tenantId },
    });
    if (!current) throw new NotFoundException('Meta nao encontrada neste tenant.');
    const goal = await this.prisma.investmentGoal.update({
      where: { id: current.id },
      data: {
        name: dto.name,
        targetCents: dto.targetCents,
        currentCents: dto.currentCents,
        dueDate: dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes === undefined ? undefined : dto.notes,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'INVESTMENT_GOAL_UPDATED',
      entityType: 'InvestmentGoal',
      entityId: goal.id,
      metadata: { targetCents: goal.targetCents },
    });
    return goal;
  }

  async removeGoal(tenantId: string, id: string) {
    const current = await this.prisma.investmentGoal.findFirst({
      where: { id, tenantId },
    });
    if (!current) throw new NotFoundException('Meta nao encontrada neste tenant.');
    await this.prisma.investmentGoal.delete({ where: { id: current.id } });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'INVESTMENT_GOAL_DELETED',
      entityType: 'InvestmentGoal',
      entityId: current.id,
    });
    return { ok: true };
  }

  async contributeGoal(tenantId: string, id: string, dto: ContributeInvestmentGoalDto) {
    const current = await this.prisma.investmentGoal.findFirst({
      where: { id, tenantId },
    });
    if (!current) throw new NotFoundException('Meta nao encontrada neste tenant.');
    const goal = await this.prisma.investmentGoal.update({
      where: { id: current.id },
      data: { currentCents: { increment: dto.amountCents } },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'INVESTMENT_GOAL_CONTRIBUTED',
      entityType: 'InvestmentGoal',
      entityId: goal.id,
      metadata: { amountCents: dto.amountCents },
    });
    return goal;
  }

  async summary(tenantId: string) {
    const { start, end } = this.monthRange();
    const [transactions, limits, goals, accounts, cards] = await Promise.all([
      this.prisma.personalFinanceTransaction.findMany({
        where: { tenantId, occurredAt: { gte: start, lte: end } },
      }),
      this.prisma.spendingLimit.findMany({ where: { tenantId, active: true } }),
      this.prisma.investmentGoal.findMany({ where: { tenantId } }),
      this.prisma.personalFinanceAccount.findMany({
        where: { tenantId, active: true },
      }),
      this.prisma.personalCreditCard.findMany({
        where: { tenantId, active: true },
      }),
    ]);

    const incomeCents = transactions
      .filter((item) => item.type === 'INCOME')
      .reduce((sum, item) => sum + item.amountCents, 0);
    const expenseCents = transactions
      .filter((item) => item.type === 'EXPENSE')
      .reduce((sum, item) => sum + item.amountCents, 0);

    const categories = new Map<string, number>();
    for (const tx of transactions.filter((item) => item.type === 'EXPENSE')) {
      categories.set(tx.category, (categories.get(tx.category) ?? 0) + tx.amountCents);
    }

    const limitStatus = limits.map((limit) => {
      const usedCents = categories.get(limit.category) ?? 0;
      return {
        ...limit,
        usedCents,
        percentUsed:
          limit.limitCents > 0 ? Math.round((usedCents / limit.limitCents) * 100) : 0,
      };
    });

    const goalStatus = goals.map((goal) => ({
      ...goal,
      percentDone:
        goal.targetCents > 0
          ? Math.min(100, Math.round((goal.currentCents / goal.targetCents) * 100))
          : 0,
    }));

    return {
      month: {
        incomeCents,
        expenseCents,
        resultCents: incomeCents - expenseCents,
      },
      byCategory: [...categories.entries()]
        .map(([category, amountCents]) => ({ category, amountCents }))
        .sort((a, b) => b.amountCents - a.amountCents),
      limits: limitStatus,
      goals: goalStatus,
      accounts,
      cards,
    };
  }

  private async ensureAccount(tenantId: string, accountId?: string | null) {
    if (!accountId) return;
    const account = await this.prisma.personalFinanceAccount.findFirst({
      where: { id: accountId, tenantId, active: true },
    });
    if (!account) throw new NotFoundException('Conta nao encontrada neste tenant.');
  }

  private async ensureCard(tenantId: string, cardId?: string | null) {
    if (!cardId) return;
    const card = await this.prisma.personalCreditCard.findFirst({
      where: { id: cardId, tenantId, active: true },
    });
    if (!card) throw new NotFoundException('Cartao nao encontrado neste tenant.');
  }

  private accountBalanceImpact(transaction: TransactionBalanceInput) {
    if (!transaction.accountId || transaction.type === 'TRANSFER') return 0;
    return transaction.type === 'INCOME'
      ? transaction.amountCents
      : -transaction.amountCents;
  }

  private classify(message: string): ClassifiedMessage {
    const text = this.normalize(message);
    const amountCents = this.extractAmount(text);
    const type = this.hasAny(text, ['recebi', 'ganhei', 'salario', 'renda', 'entrada'])
      ? 'INCOME'
      : 'EXPENSE';
    const category = this.categoryFor(text, type);
    const occurredAt = this.dateFor(text);
    return {
      type,
      amountCents,
      description: message.slice(0, 200),
      category: category.category,
      subcategory: category.subcategory,
      occurredAt,
      confidence: amountCents > 0 ? category.confidence : 40,
    };
  }

  private extractAmount(text: string) {
    const match = text.match(/(?:r\$?\s*)?(\d{1,6}(?:[,.]\d{1,2})?)/);
    if (!match) return 0;
    return Math.round(Number(match[1].replace(',', '.')) * 100);
  }

  private categoryFor(text: string, type: 'EXPENSE' | 'INCOME' | 'TRANSFER') {
    if (type === 'INCOME') {
      if (this.hasAny(text, ['salario', 'pro labore'])) {
        return { category: 'Renda', subcategory: 'Salario', confidence: 90 };
      }
      return { category: 'Renda', subcategory: 'Recebimentos', confidence: 75 };
    }
    const rules = [
      { terms: ['mercado', 'supermercado', 'ifood', 'restaurante', 'lanche'], category: 'Alimentacao' },
      { terms: ['uber', '99', 'taxi', 'onibus', 'metro'], category: 'Transporte' },
      { terms: ['gasolina', 'combustivel', 'posto'], category: 'Combustivel' },
      { terms: ['internet', 'telefone', 'celular'], category: 'Internet' },
      { terms: ['energia', 'luz'], category: 'Energia' },
      { terms: ['agua', 'sabesp'], category: 'Agua' },
      { terms: ['aluguel', 'condominio'], category: 'Moradia' },
      { terms: ['farmacia', 'medico', 'exame'], category: 'Saude' },
      { terms: ['imposto', 'taxa', 'boleto'], category: 'Impostos' },
      { terms: ['marketing', 'trafego', 'anuncio'], category: 'Marketing' },
    ];
    const found = rules.find((rule) => this.hasAny(text, rule.terms));
    return found
      ? { category: found.category, subcategory: undefined, confidence: 88 }
      : { category: 'Outros', subcategory: undefined, confidence: 60 };
  }

  private dateFor(text: string) {
    const date = new Date();
    if (text.includes('ontem')) date.setDate(date.getDate() - 1);
    return date;
  }

  async importOFX(tenantId: string, content: string): Promise<{ imported: number; skipped: number }> {
    const transactions = parseOFX(content);
    let imported = 0;
    let skipped = 0;

    for (const tx of transactions) {
      // Evita duplicata por fitId (salvo no rawInput)
      const exists = await this.prisma.personalFinanceTransaction.findFirst({
        where: { tenantId, rawInput: `ofx:${tx.fitId}` },
      });
      if (exists) { skipped++; continue; }

      const category = tx.type === 'INCOME' ? 'Renda' : 'Outros';
      await this.prisma.personalFinanceTransaction.create({
        data: {
          tenantId,
          type: tx.type,
          amountCents: tx.amountCents,
          description: tx.description,
          category,
          occurredAt: tx.occurredAt,
          source: 'IMPORT',
          rawInput: `ofx:${tx.fitId}`,
          classifier: 'RULES',
          confidence: 70,
        },
      });
      imported++;
    }

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'OFX_IMPORT',
      entityType: 'PersonalFinanceTransaction',
      entityId: tenantId,
      metadata: { imported, skipped },
    });

    return { imported, skipped };
  }

  async exportCsv(tenantId: string): Promise<string> {
    const transactions = await this.prisma.personalFinanceTransaction.findMany({
      where: { tenantId },
      orderBy: { occurredAt: 'desc' },
    });
    const header = 'Data,Tipo,Descricao,Categoria,Subcategoria,Valor (R$),Conta,Cartao,Origem\n';
    const rows = transactions.map((t) => {
      const date = new Date(t.occurredAt).toLocaleDateString('pt-BR');
      const value = (t.amountCents / 100).toFixed(2).replace('.', ',');
      const safe = (s: string | null | undefined) => `"${(s ?? '').replace(/"/g, '""')}"`;
      return [date, t.type, safe(t.description), safe(t.category), safe(t.subcategory), value, t.accountId ?? '', t.cardId ?? '', t.source].join(',');
    });
    return header + rows.join('\n');
  }

  listCategories(tenantId: string) {
    const DEFAULT_CATEGORIES = [
      'Alimentacao','Transporte','Combustivel','Moradia','Saude','Internet',
      'Energia','Agua','Educacao','Lazer','Viagem','Vestuario','Streaming',
      'Marketing','Impostos','Salario','Renda','Freelance','Investimento','Outros',
    ];
    return this.prisma.personalFinanceTransaction.findMany({
      where: { tenantId },
      select: { category: true, subcategory: true },
      distinct: ['category'],
    }).then((rows) => {
      const custom = rows.map((r) => r.category).filter(Boolean);
      return [...new Set([...DEFAULT_CATEGORIES, ...custom])].sort();
    });
  }

  async monthlyReport(tenantId: string): Promise<string> {
    const { start, end } = this.monthRange();
    const transactions = await this.prisma.personalFinanceTransaction.findMany({
      where: { tenantId, occurredAt: { gte: start, lte: end } },
    });
    const income = transactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amountCents, 0);
    const expense = transactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amountCents, 0);
    const result = income - expense;

    const byCategory = new Map<string, number>();
    for (const t of transactions.filter((t) => t.type === 'EXPENSE')) {
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amountCents);
    }
    const topCategories = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const now = new Date();
    const monthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const lines = [
      `*📊 Resumo Financeiro — ${monthName}*\n`,
      `💰 Receitas: ${this.money(income)}`,
      `💸 Gastos: ${this.money(expense)}`,
      `${result >= 0 ? '✅' : '⚠️'} Resultado: ${this.money(result)}\n`,
      '*Top categorias de gasto:*',
      ...topCategories.map(([cat, val]) => `  • ${cat}: ${this.money(val)}`),
    ];
    return lines.join('\n');
  }

  private async checkSpendingLimit(tenantId: string, category: string) {
    const limit = await this.prisma.spendingLimit.findFirst({
      where: { tenantId, category, active: true },
    });
    if (!limit) return;
    const { start, end } = this.monthRange();
    const spent = await this.prisma.personalFinanceTransaction.aggregate({
      where: { tenantId, type: 'EXPENSE', category, occurredAt: { gte: start, lte: end } },
      _sum: { amountCents: true },
    });
    const usedCents = spent._sum.amountCents ?? 0;
    const threshold = (limit.limitCents * limit.alertThresholdPercent) / 100;
    if (usedCents < threshold) return;

    const pct = Math.round((usedCents / limit.limitCents) * 100);
    const msg = `⚠️ *Alerta de limite!*\nCategoria: ${category}\nGasto: ${this.money(usedCents)} (${pct}% de ${this.money(limit.limitCents)})`;

    await this.prisma.notification.create({
      data: {
        tenantId,
        channel: 'SYSTEM',
        title: `Limite de ${category}`,
        message: `Voce ja usou ${this.money(usedCents)} de ${this.money(limit.limitCents)} em ${category}.`,
        status: 'UNREAD',
        entityType: 'SpendingLimit',
        entityId: limit.id,
      },
    });

    // Envia alerta no WhatsApp para usuarios ativos do tenant
    const waUsers = await this.prisma.whatsappUser.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { phone: true },
    });
    for (const u of waUsers.slice(0, 1)) {
      try { await this.outbound.sendText(u.phone, msg); } catch {}
    }
  }

  private monthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  private normalize(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private hasAny(value: string, terms: string[]) {
    return terms.some((term) => value.includes(term));
  }

  private money(cents: number) {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}
