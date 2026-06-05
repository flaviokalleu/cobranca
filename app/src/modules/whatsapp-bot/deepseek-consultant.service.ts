import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  DeepSeekService,
  ChatMessage,
  ToolDefinition,
  ToolCall,
} from '../ai/deepseek.service';

interface ConversationSession {
  tenantId: string;
  messages: ChatMessage[];
  expiresAt: Date;
}

const CATEGORIES = [
  'Alimentacao', 'Transporte', 'Combustivel', 'Moradia', 'Saude',
  'Educacao', 'Lazer', 'Internet', 'Energia', 'Agua', 'Impostos',
  'Marketing', 'Renda', 'Outros',
];

const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'register_expense',
      description: 'Registra um gasto ou despesa pessoal do usuario no sistema',
      parameters: {
        type: 'object',
        properties: {
          amountCents: { type: 'integer', description: 'Valor em centavos (ex: R$50,00 = 5000)' },
          description: { type: 'string', description: 'Descricao do gasto' },
          category: { type: 'string', enum: CATEGORIES, description: 'Categoria do gasto' },
          date: { type: 'string', description: 'Data ISO8601, ex: 2025-06-04. Omitir para hoje.' },
        },
        required: ['amountCents', 'description', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'register_income',
      description: 'Registra uma receita ou entrada de dinheiro',
      parameters: {
        type: 'object',
        properties: {
          amountCents: { type: 'integer', description: 'Valor em centavos' },
          description: { type: 'string', description: 'Descricao da receita' },
          category: { type: 'string', enum: CATEGORIES },
          date: { type: 'string', description: 'Data ISO8601. Omitir para hoje.' },
        },
        required: ['amountCents', 'description', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'register_lead',
      description: 'Cadastra um novo lead/prospect no CRM da empresa',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome completo do lead' },
          phone: { type: 'string', description: 'Telefone ou WhatsApp (somente digitos)' },
          email: { type: 'string', description: 'E-mail (opcional)' },
          estimatedCents: { type: 'integer', description: 'Valor estimado do negocio em centavos' },
          notes: { type: 'string', description: 'Observacoes ou contexto sobre o lead' },
          stage: {
            type: 'string',
            enum: ['LEAD', 'FIRST_CONTACT', 'DOCUMENTATION', 'ANALYSIS', 'APPROVED', 'CONTRACT', 'CUSTOMER', 'WON', 'LOST'],
            description: 'Estagio no funil (default: LEAD)',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_payable',
      description: 'Registra uma conta a pagar (boleto, fatura, despesa futura)',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Descricao da conta' },
          amountCents: { type: 'integer', description: 'Valor em centavos' },
          dueDate: { type: 'string', description: 'Data de vencimento ISO8601' },
          category: { type: 'string', description: 'Categoria (opcional)' },
        },
        required: ['description', 'amountCents', 'dueDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Cria uma tarefa ou lembrete',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Titulo da tarefa' },
          notes: { type: 'string', description: 'Detalhes (opcional)' },
          dueDate: { type: 'string', description: 'Data limite ISO8601 (opcional)' },
          priority: { type: 'string', enum: ['LOW', 'MED', 'HIGH'], description: 'Prioridade (default: MED)' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_financial_summary',
      description: 'Consulta o resumo financeiro do mes atual: receitas, despesas, saldo, gastos por categoria',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_who_owes_me',
      description: 'Lista clientes com cobrancas pendentes (quem me deve)',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_what_i_owe',
      description: 'Lista contas a pagar pendentes',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_leads_pipeline',
      description: 'Lista os leads/prospects no CRM com estagio e valor estimado',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_open_tasks',
      description: 'Lista tarefas pendentes',
      parameters: { type: 'object', properties: {} },
    },
  },
];

@Injectable()
export class DeepSeekConsultantService {
  private readonly logger = new Logger(DeepSeekConsultantService.name);
  private readonly sessions = new Map<string, ConversationSession>();
  private readonly MAX_HISTORY = 14;
  private readonly SESSION_TTL_MS = 60 * 60 * 1000; // 1 hora

  constructor(
    private readonly prisma: PrismaService,
    private readonly deepseek: DeepSeekService,
  ) {}

  get isAvailable(): boolean {
    return this.deepseek.isConfigured;
  }

  async chat(phone: string, tenantId: string, userMessage: string): Promise<string> {
    this.pruneExpired();

    const session = this.getOrCreate(phone, tenantId);
    session.messages.push({ role: 'user', content: userMessage });
    session.expiresAt = new Date(Date.now() + this.SESSION_TTL_MS);

    const today = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const systemPrompt = `Voce e um consultor financeiro pessoal e empresarial do usuario. Data/hora atual: ${today}.

Voce tem acesso a ferramentas para consultar e registrar dados no sistema. Use-as sempre que o usuario quiser registrar algo ou consultar informacoes.

REGRAS DE NEGOCIO:
- Responda sempre em portugues brasileiro, de forma amigavel e concisa
- Para registrar qualquer dado, use as ferramentas — nunca apenas confirme verbalmente
- Quando registrar algo, confirme o que foi salvo com os detalhes principais
- Para valores, sempre use o formato R$ 0,00
- Se faltar informacao essencial, pergunte apenas o que e necessario
- Nao exponha IDs internos do sistema ao usuario

FORMATACAO (mensagens vao para WhatsApp — NAO use markdown):
- NUNCA use tabelas markdown (| col | col |) — WhatsApp nao renderiza
- Use *texto* para negrito
- Use listas com bullet: • item
- Para listas de gastos use o padrao: • Descricao — R$ 0,00
- Emojis sao bem-vindos para tornar a resposta mais clara
- Mantenha respostas curtas e diretas`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...session.messages.slice(-this.MAX_HISTORY),
    ];

    try {
      const finalResponse = await this.runAgentLoop(messages, tenantId);
      session.messages.push({ role: 'assistant', content: finalResponse });
      this.sessions.set(phone, session);
      return finalResponse;
    } catch (err) {
      this.logger.error(`Erro no consultor DeepSeek: ${String(err)}`);
      return 'Ocorreu um erro ao processar sua mensagem. Tente novamente.';
    }
  }

  clearSession(phone: string): void {
    this.sessions.delete(phone);
  }

  private async runAgentLoop(messages: ChatMessage[], tenantId: string): Promise<string> {
    const workingMessages = [...messages];

    for (let i = 0; i < 5; i++) {
      const response = await this.deepseek.rawChat(workingMessages, {
        tools: TOOLS,
        maxTokens: 1024,
      });

      if (response.finish_reason !== 'tool_calls' || !response.tool_calls.length) {
        return response.content ?? 'Desculpe, nao consegui processar sua mensagem.';
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.content ?? null as unknown as string,
        tool_calls: response.tool_calls,
      };
      workingMessages.push(assistantMessage);

      for (const call of response.tool_calls) {
        const result = await this.executeTool(tenantId, call);
        workingMessages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
    }

    return 'Nao consegui concluir a operacao. Pode reformular?';
  }

  private async executeTool(tenantId: string, call: ToolCall): Promise<unknown> {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function.arguments) as Record<string, unknown>;
    } catch {
      return { error: 'Argumentos invalidos' };
    }

    try {
      switch (call.function.name) {
        case 'register_expense':
          return await this.toolRegisterTransaction(tenantId, 'EXPENSE', args);
        case 'register_income':
          return await this.toolRegisterTransaction(tenantId, 'INCOME', args);
        case 'register_lead':
          return await this.toolRegisterLead(tenantId, args);
        case 'create_payable':
          return await this.toolCreatePayable(tenantId, args);
        case 'create_task':
          return await this.toolCreateTask(tenantId, args);
        case 'query_financial_summary':
          return await this.toolQueryFinancialSummary(tenantId);
        case 'query_who_owes_me':
          return await this.toolQueryWhoOwesMe(tenantId);
        case 'query_what_i_owe':
          return await this.toolQueryWhatIOwe(tenantId);
        case 'query_leads_pipeline':
          return await this.toolQueryLeads(tenantId);
        case 'query_open_tasks':
          return await this.toolQueryTasks(tenantId);
        default:
          return { error: `Ferramenta desconhecida: ${call.function.name}` };
      }
    } catch (err) {
      this.logger.error(`Erro ao executar ferramenta ${call.function.name}: ${String(err)}`);
      return { error: String(err) };
    }
  }

  private async toolRegisterTransaction(
    tenantId: string,
    type: 'EXPENSE' | 'INCOME',
    args: Record<string, unknown>,
  ) {
    const amountCents = Math.abs(Math.round(Number(args.amountCents) || 0));
    if (amountCents <= 0) return { error: 'Valor invalido' };

    const paidAt = args.date ? new Date(String(args.date)) : new Date();

    if (type === 'EXPENSE') {
      // Gastos ja realizados vao para Payable (status PAID) — aparece na pagina /financeiro/pagar
      const payable = await this.prisma.payable.create({
        data: {
          tenantId,
          description: String(args.description ?? '').slice(0, 200),
          amountCents,
          dueDate: paidAt,
          category: String(args.category ?? 'Outros'),
          status: 'PAID',
          paidAt,
        },
      });
      return {
        ok: true,
        type: 'EXPENSE',
        amountCents,
        category: payable.category,
        description: payable.description,
        paidAt: payable.paidAt?.toISOString(),
      };
    }

    // INCOME: cria Charge com status PAID (aparece no fluxo de caixa e DRE)
    // Usa um customer generico "Receita Avulsa" do tenant, ou cria se nao existir
    const description = String(args.description ?? 'Receita').slice(0, 200);
    const category = String(args.category ?? 'Renda');

    let customer = await this.prisma.customer.findFirst({
      where: { tenantId, name: 'Receita Avulsa' },
    });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: { tenantId, name: 'Receita Avulsa', phone: '00000000000', stage: 'CUSTOMER' },
      });
    }

    const charge = await this.prisma.charge.create({
      data: {
        tenantId,
        customerId: customer.id,
        amountCents,
        description,
        dueDate: paidAt,
        status: 'PAID',
        paidAt,
        category,
      },
    });

    return {
      ok: true,
      type: 'INCOME',
      amountCents,
      category: charge.category,
      description: charge.description,
      paidAt: charge.paidAt?.toISOString(),
    };
  }

  private async toolRegisterLead(tenantId: string, args: Record<string, unknown>) {
    const name = String(args.name ?? '').trim();
    if (!name) return { error: 'Nome do lead e obrigatorio' };

    const lead = await this.prisma.lead.create({
      data: {
        tenantId,
        name,
        phone: args.phone ? String(args.phone).replace(/\D/g, '') : null,
        email: args.email ? String(args.email) : null,
        estimatedCents: Math.round(Number(args.estimatedCents) || 0),
        notes: args.notes ? String(args.notes) : null,
        stage: String(args.stage ?? 'LEAD'),
      },
    });

    return { ok: true, name: lead.name, stage: lead.stage, estimatedCents: lead.estimatedCents };
  }

  private async toolCreatePayable(tenantId: string, args: Record<string, unknown>) {
    const amountCents = Math.round(Number(args.amountCents) || 0);
    if (amountCents <= 0) return { error: 'Valor invalido' };

    const payable = await this.prisma.payable.create({
      data: {
        tenantId,
        description: String(args.description ?? '').slice(0, 200),
        amountCents,
        dueDate: new Date(String(args.dueDate)),
        category: args.category ? String(args.category) : null,
      },
    });

    return { ok: true, description: payable.description, amountCents: payable.amountCents, dueDate: payable.dueDate };
  }

  private async toolCreateTask(tenantId: string, args: Record<string, unknown>) {
    const task = await this.prisma.task.create({
      data: {
        tenantId,
        title: String(args.title ?? '').slice(0, 200),
        notes: args.notes ? String(args.notes) : null,
        dueDate: args.dueDate ? new Date(String(args.dueDate)) : null,
        priority: ['LOW', 'MED', 'HIGH'].includes(String(args.priority)) ? String(args.priority) : 'MED',
      },
    });

    return { ok: true, title: task.title, dueDate: task.dueDate };
  }

  private async toolQueryFinancialSummary(tenantId: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [txs, accounts] = await Promise.all([
      this.prisma.personalFinanceTransaction.findMany({
        where: { tenantId, occurredAt: { gte: start, lte: end } },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.personalFinanceAccount.findMany({ where: { tenantId, active: true } }),
    ]);

    const income = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amountCents, 0);
    const expense = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amountCents, 0);

    const byCategory: Record<string, number> = {};
    for (const t of txs.filter((t) => t.type === 'EXPENSE')) {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amountCents;
    }

    return {
      month: `${now.toLocaleString('pt-BR', { month: 'long' })} ${now.getFullYear()}`,
      incomeCents: income,
      expenseCents: expense,
      balanceCents: income - expense,
      accounts: accounts.map((a) => ({ name: a.name, balanceCents: a.balanceCents })),
      byCategory: Object.entries(byCategory)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, cents]) => ({ category: cat, amountCents: cents })),
    };
  }

  private async toolQueryWhoOwesMe(tenantId: string) {
    const charges = await this.prisma.charge.findMany({
      where: { tenantId, status: 'PENDING' },
      include: { customer: { select: { name: true, phone: true } } },
      orderBy: { dueDate: 'asc' },
      take: 15,
    });

    const total = charges.reduce((s, c) => s + c.amountCents, 0);
    return {
      totalCents: total,
      count: charges.length,
      charges: charges.map((c) => ({
        customer: c.customer.name,
        amountCents: c.amountCents,
        dueDate: c.dueDate.toISOString().split('T')[0],
        status: c.status,
      })),
    };
  }

  private async toolQueryWhatIOwe(tenantId: string) {
    const payables = await this.prisma.payable.findMany({
      where: { tenantId, status: 'PENDING' },
      orderBy: { dueDate: 'asc' },
      take: 15,
    });

    const total = payables.reduce((s, p) => s + p.amountCents, 0);
    return {
      totalCents: total,
      count: payables.length,
      payables: payables.map((p) => ({
        description: p.description,
        amountCents: p.amountCents,
        dueDate: p.dueDate.toISOString().split('T')[0],
      })),
    };
  }

  private async toolQueryLeads(tenantId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { tenantId, stage: { notIn: ['LOST'] } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const total = leads.reduce((s, l) => s + l.estimatedCents, 0);
    const byStage: Record<string, number> = {};
    for (const l of leads) byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;

    return {
      count: leads.length,
      totalEstimatedCents: total,
      byStage,
      leads: leads.map((l) => ({
        name: l.name,
        stage: l.stage,
        estimatedCents: l.estimatedCents,
        phone: l.phone,
      })),
    };
  }

  private async toolQueryTasks(tenantId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { tenantId, done: false },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      take: 15,
    });

    return {
      count: tasks.length,
      tasks: tasks.map((t) => ({
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : null,
      })),
    };
  }

  private getOrCreate(phone: string, tenantId: string): ConversationSession {
    const existing = this.sessions.get(phone);
    if (existing && existing.expiresAt > new Date()) return existing;
    const session: ConversationSession = {
      tenantId,
      messages: [],
      expiresAt: new Date(Date.now() + this.SESSION_TTL_MS),
    };
    this.sessions.set(phone, session);
    return session;
  }

  private pruneExpired(): void {
    const now = new Date();
    for (const [phone, session] of this.sessions) {
      if (session.expiresAt <= now) this.sessions.delete(phone);
    }
  }
}
