import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AskAiDto } from './dto/ask-ai.dto';
import { DeepSeekService } from './deepseek.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deepseek: DeepSeekService,
  ) {}

  suggestions() {
    return [
      'Quem esta me devendo?',
      'Quanto tenho para receber?',
      'Quanto tenho para pagar?',
      'Quais contas vencem hoje?',
      'Qual cliente falta documentacao?',
      'Quais tarefas tenho hoje?',
      'Qual foi meu lucro este mes?',
      'Quanto gastei este mes?',
      'Quais clientes fecharam negocio?',
    ];
  }

  async ask(tenantId: string, dto: AskAiDto) {
    if (this.deepseek.isConfigured) {
      try {
        return await this.askWithDeepSeek(tenantId, dto.question);
      } catch (err) {
        this.logger.warn(`DeepSeek indisponivel, usando regras locais: ${String(err)}`);
      }
    }
    return this.askWithRules(tenantId, dto.question);
  }

  private async askWithDeepSeek(tenantId: string, question: string) {
    const ctx = await this.buildContext(tenantId);
    const answer = await this.deepseek.chat([
      {
        role: 'system',
        content: `Voce e um assistente financeiro e empresarial. Responda em portugues brasileiro de forma clara e objetiva.
Contexto atual do negocio:
${ctx}`,
      },
      { role: 'user', content: question },
    ]);
    return this.answer('deepseek', answer);
  }

  private async askWithRules(tenantId: string, question: string) {
    const normalized = this.normalize(question);
    if (this.hasAny(normalized, ['devendo', 'deve', 'devedor', 'atrasad'])) {
      return this.whoOwes(tenantId);
    }
    if (this.hasAny(normalized, ['receber', 'recebivel', 'receita futura'])) {
      return this.totalReceivable(tenantId);
    }
    if (this.hasAny(normalized, ['pagar', 'contas a pagar', 'despesa futura'])) {
      return this.totalPayable(tenantId);
    }
    if (this.hasAny(normalized, ['documentacao', 'documento', 'documentos faltam'])) {
      return this.missingDocuments(tenantId);
    }
    if (this.hasAny(normalized, ['tarefa', 'tarefas'])) {
      return this.tasksToday(tenantId);
    }
    if (this.hasAny(normalized, ['vence hoje', 'vencem hoje', 'hoje'])) {
      return this.dueToday(tenantId);
    }
    if (this.hasAny(normalized, ['lucro', 'resultado'])) {
      return this.profitThisMonth(tenantId);
    }
    if (this.hasAny(normalized, ['gastei', 'gasto', 'despesas do mes'])) {
      return this.spentThisMonth(tenantId);
    }
    if (this.hasAny(normalized, ['fecharam negocio', 'ganho', 'cliente fechado'])) {
      return this.closedDeals(tenantId);
    }
    return this.overview(tenantId);
  }

  private async buildContext(tenantId: string): Promise<string> {
    const { start, end } = this.monthRange();
    const today = this.todayRange();

    const [receivable, payable, pendingDocs, openTasks, charges, ledger] = await Promise.all([
      this.prisma.charge.aggregate({
        where: { tenantId, status: 'PENDING' },
        _sum: { amountCents: true },
        _count: true,
      }),
      this.prisma.payable.aggregate({
        where: { tenantId, status: 'PENDING' },
        _sum: { amountCents: true },
        _count: true,
      }),
      this.prisma.customerDocument.count({ where: { tenantId, status: { not: 'APPROVED' } } }),
      this.prisma.task.count({ where: { tenantId, done: false } }),
      this.prisma.charge.findMany({
        where: { tenantId, status: 'PENDING', dueDate: { gte: today.start, lte: today.end } },
        include: { customer: true },
        take: 5,
      }),
      this.prisma.ledgerEntry.findMany({
        where: { tenantId, createdAt: { gte: start, lte: end } },
      }),
    ]);

    const revenue = ledger.filter((e) => e.accountCode === 'REVENUE').reduce((s, e) => s + e.amountCents, 0);
    const expense = ledger.filter((e) => e.accountCode === 'EXPENSE').reduce((s, e) => s + e.amountCents, 0);
    const dueToday = charges.map((c) => `${c.customer.name}: ${this.money(c.amountCents)}`).join(', ');

    return [
      `A receber: ${this.money(receivable._sum.amountCents ?? 0)} em ${receivable._count} cobranca(s) pendente(s)`,
      `A pagar: ${this.money(payable._sum.amountCents ?? 0)} em ${payable._count} conta(s) pendente(s)`,
      `Documentos pendentes: ${pendingDocs}`,
      `Tarefas abertas: ${openTasks}`,
      `Vence hoje: ${dueToday || 'nenhum'}`,
      `Receita do mes: ${this.money(revenue)}`,
      `Despesa do mes: ${this.money(expense)}`,
      `Resultado do mes: ${this.money(revenue - expense)}`,
    ].join('\n');
  }

  private async whoOwes(tenantId: string) {
    const charges = await this.prisma.charge.findMany({
      where: { tenantId, status: 'PENDING' },
      include: { customer: true },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });
    if (charges.length === 0) {
      return this.answer('who_owes', 'Nenhum cliente tem cobranca pendente agora.');
    }
    const total = charges.reduce((sum, charge) => sum + charge.amountCents, 0);
    const lines = charges.map(
      (charge) =>
        `${charge.customer.name}: ${this.money(charge.amountCents)} vence em ${this.date(charge.dueDate)}`,
    );
    return this.answer(
      'who_owes',
      `Ha ${this.money(total)} pendente nas principais cobrancas. ${lines.join('; ')}.`,
    );
  }

  private async totalReceivable(tenantId: string) {
    const result = await this.prisma.charge.aggregate({
      where: { tenantId, status: 'PENDING' },
      _sum: { amountCents: true },
      _count: true,
    });
    return this.answer(
      'total_receivable',
      `Voce tem ${this.money(result._sum.amountCents ?? 0)} para receber em ${result._count} cobranca(s) pendente(s).`,
    );
  }

  private async totalPayable(tenantId: string) {
    const result = await this.prisma.payable.aggregate({
      where: { tenantId, status: 'PENDING' },
      _sum: { amountCents: true },
      _count: true,
    });
    return this.answer(
      'total_payable',
      `Voce tem ${this.money(result._sum.amountCents ?? 0)} para pagar em ${result._count} conta(s) pendente(s).`,
    );
  }

  private async dueToday(tenantId: string) {
    const { start, end } = this.todayRange();
    const [charges, payables, tasks] = await Promise.all([
      this.prisma.charge.findMany({
        where: { tenantId, status: 'PENDING', dueDate: { gte: start, lte: end } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.payable.findMany({
        where: { tenantId, status: 'PENDING', dueDate: { gte: start, lte: end } },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.task.findMany({
        where: { tenantId, done: false, dueDate: { gte: start, lte: end } },
        orderBy: { dueDate: 'asc' },
      }),
    ]);
    const receber = charges.reduce((sum, item) => sum + item.amountCents, 0);
    const pagar = payables.reduce((sum, item) => sum + item.amountCents, 0);
    return this.answer(
      'due_today',
      `Hoje vencem ${charges.length} cobranca(s) (${this.money(receber)}), ${payables.length} conta(s) a pagar (${this.money(pagar)}) e ${tasks.length} tarefa(s).`,
    );
  }

  private async missingDocuments(tenantId: string) {
    const docs = await this.prisma.customerDocument.findMany({
      where: { tenantId, status: { not: 'APPROVED' } },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
      take: 30,
    });
    if (docs.length === 0) {
      return this.answer('missing_documents', 'Nao encontrei documentos pendentes no momento.');
    }
    const customerIds = [...new Set(docs.map((doc) => doc.customerId))];
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, id: { in: customerIds } },
      select: { id: true, name: true },
    });
    const names = new Map(customers.map((customer) => [customer.id, customer.name]));
    const grouped = new Map<string, string[]>();
    for (const doc of docs) {
      const name = names.get(doc.customerId) ?? 'Cliente';
      grouped.set(name, [...(grouped.get(name) ?? []), `${doc.name} (${doc.status})`]);
    }
    const lines = [...grouped.entries()].map(
      ([customer, items]) => `${customer}: ${items.slice(0, 4).join(', ')}`,
    );
    return this.answer(
      'missing_documents',
      `Encontrei pendencias documentais para ${grouped.size} cliente(s). ${lines.join('; ')}.`,
    );
  }

  private async tasksToday(tenantId: string) {
    const { start, end } = this.todayRange();
    const tasks = await this.prisma.task.findMany({
      where: { tenantId, done: false, dueDate: { gte: start, lte: end } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    });
    if (tasks.length === 0) {
      return this.answer('tasks_today', 'Voce nao tem tarefas pendentes para hoje.');
    }
    return this.answer(
      'tasks_today',
      `Voce tem ${tasks.length} tarefa(s) hoje: ${tasks.map((task) => task.title).join('; ')}.`,
    );
  }

  private async profitThisMonth(tenantId: string) {
    const { start, end } = this.monthRange();
    const entries = await this.prisma.ledgerEntry.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
    });
    const revenue = entries
      .filter((entry) => entry.accountCode === 'REVENUE')
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    const expense = entries
      .filter((entry) => entry.accountCode === 'EXPENSE')
      .reduce((sum, entry) => sum + entry.amountCents, 0);
    return this.answer(
      'profit_this_month',
      `Neste mes, a receita reconhecida foi ${this.money(revenue)}, as despesas foram ${this.money(expense)} e o resultado foi ${this.money(revenue - expense)}.`,
    );
  }

  private async spentThisMonth(tenantId: string) {
    const { start, end } = this.monthRange();
    const result = await this.prisma.payable.aggregate({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      _sum: { amountCents: true },
      _count: true,
    });
    return this.answer(
      'spent_this_month',
      `Neste mes foram lancadas ${result._count} despesa(s), somando ${this.money(result._sum.amountCents ?? 0)}.`,
    );
  }

  private async closedDeals(tenantId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { tenantId, stage: { in: ['CUSTOMER', 'CONTRACT', 'WON'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    if (leads.length === 0) {
      return this.answer('closed_deals', 'Ainda nao ha leads marcados como negocio fechado.');
    }
    const total = leads.reduce((sum, lead) => sum + lead.estimatedCents, 0);
    return this.answer(
      'closed_deals',
      `${leads.length} cliente(s) fecharam negocio recentemente, com valor estimado de ${this.money(total)}: ${leads.map((lead) => lead.name).join(', ')}.`,
    );
  }

  private async overview(tenantId: string) {
    const [receivable, payable, pendingDocs, openTasks] = await Promise.all([
      this.prisma.charge.aggregate({
        where: { tenantId, status: 'PENDING' },
        _sum: { amountCents: true },
        _count: true,
      }),
      this.prisma.payable.aggregate({
        where: { tenantId, status: 'PENDING' },
        _sum: { amountCents: true },
        _count: true,
      }),
      this.prisma.customerDocument.count({
        where: { tenantId, status: { not: 'APPROVED' } },
      }),
      this.prisma.task.count({ where: { tenantId, done: false } }),
    ]);
    return this.answer(
      'overview',
      `Resumo: ${this.money(receivable._sum.amountCents ?? 0)} a receber em ${receivable._count} cobranca(s), ${this.money(payable._sum.amountCents ?? 0)} a pagar em ${payable._count} conta(s), ${pendingDocs} documento(s) pendente(s) e ${openTasks} tarefa(s) aberta(s).`,
    );
  }

  private answer(intent: string, answer: string) {
    return { intent, answer, generatedAt: new Date().toISOString() };
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

  private date(value: Date) {
    return value.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  private todayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private monthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
}
