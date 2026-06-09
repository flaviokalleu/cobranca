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
  'Alimentacao', 'Mercado', 'Restaurante', 'Delivery',
  'Transporte', 'Combustivel', 'Uber',
  'Moradia', 'Aluguel', 'Condominio',
  'Saude', 'Farmacia', 'Medico',
  'Educacao', 'Lazer', 'Streaming', 'Academia',
  'Internet', 'Telefone', 'Energia', 'Agua', 'Gas',
  'Roupas', 'Beleza', 'Impostos', 'Seguro', 'Banco',
  'Salario', 'Renda', 'Investimento', 'Marketing', 'Outros',
];

const CAT_PARAM = { type: 'string', enum: CATEGORIES } as const;
const DATE_PARAM = { type: 'string', description: 'ISO8601, omitir=hoje' } as const;
const CENTS_PARAM = { type: 'integer', description: 'centavos' } as const;
const CUSTOMER_PARAM = { type: 'string', description: 'nome ou telefone' } as const;

const TOOLS: ToolDefinition[] = [
  // --- Registros ---
  {
    type: 'function',
    function: {
      name: 'register_expense',
      description: 'Salva gasto/despesa pessoal',
      parameters: {
        type: 'object',
        properties: {
          amountCents: CENTS_PARAM,
          description: { type: 'string' },
          category: CAT_PARAM,
          date: DATE_PARAM,
        },
        required: ['amountCents', 'description', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'register_income',
      description: 'Salva receita/entrada pessoal',
      parameters: {
        type: 'object',
        properties: {
          amountCents: CENTS_PARAM,
          description: { type: 'string' },
          category: CAT_PARAM,
          date: DATE_PARAM,
        },
        required: ['amountCents', 'description', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'register_lead',
      description: 'Cadastra lead no CRM',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          estimatedCents: CENTS_PARAM,
          notes: { type: 'string' },
          stage: { type: 'string', enum: ['LEAD', 'FIRST_CONTACT', 'DOCUMENTATION', 'ANALYSIS', 'APPROVED', 'CONTRACT', 'CUSTOMER', 'WON', 'LOST'] },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_payable',
      description: 'Conta a pagar futura',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          amountCents: CENTS_PARAM,
          dueDate: { type: 'string' },
          category: { type: 'string' },
        },
        required: ['description', 'amountCents', 'dueDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Cria tarefa/lembrete',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          notes: { type: 'string' },
          dueDate: { type: 'string' },
          priority: { type: 'string', enum: ['LOW', 'MED', 'HIGH'] },
        },
        required: ['title'],
      },
    },
  },
  // --- Tier 1: Clientes & Cobranças ---
  {
    type: 'function',
    function: {
      name: 'query_customer',
      description: 'Busca cliente por nome ou telefone: saldo devedor, cobranças, empréstimos',
      parameters: {
        type: 'object',
        properties: { nameOrPhone: CUSTOMER_PARAM },
        required: ['nameOrPhone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_charge',
      description: 'Cria cobrança pendente para cliente específico',
      parameters: {
        type: 'object',
        properties: {
          customerNameOrPhone: CUSTOMER_PARAM,
          amountCents: CENTS_PARAM,
          dueDate: { type: 'string' },
          description: { type: 'string' },
          recurrence: { type: 'string', enum: ['ONCE', 'MONTHLY'] },
        },
        required: ['customerNameOrPhone', 'amountCents', 'dueDate'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_charge_paid',
      description: 'Marca cobrança de cliente como paga',
      parameters: {
        type: 'object',
        properties: {
          customerNameOrPhone: CUSTOMER_PARAM,
          amountCents: { type: 'integer', description: 'centavos, para desambiguar se houver várias' },
        },
        required: ['customerNameOrPhone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_loans',
      description: 'Empréstimos e parcelas pendentes de clientes',
      parameters: {
        type: 'object',
        properties: { customerNameOrPhone: { type: 'string', description: 'omitir = todos ativos' } },
      },
    },
  },
  // --- Tier 2: Agenda & Estoque ---
  {
    type: 'function',
    function: {
      name: 'query_today_agenda',
      description: 'Agenda do dia: eventos, tarefas e cobranças com vencimento hoje',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_calendar_event',
      description: 'Agenda evento ou visita',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          startsAt: { type: 'string', description: 'ISO8601' },
          type: { type: 'string', enum: ['MEETING', 'VISIT', 'OTHER'] },
          notes: { type: 'string' },
          customerNameOrPhone: { type: 'string' },
        },
        required: ['title', 'startsAt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_product',
      description: 'Consulta produtos e estoque',
      parameters: {
        type: 'object',
        properties: { nameOrSku: { type: 'string', description: 'omitir = todos ativos' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_bank_balance',
      description: 'Saldo nas contas Open Finance (bancos integrados)',
      parameters: { type: 'object', properties: {} },
    },
  },
  // --- Tier 3: Avançado ---
  {
    type: 'function',
    function: {
      name: 'create_sales_order',
      description: 'Cria pedido de venda para cliente',
      parameters: {
        type: 'object',
        properties: {
          customerNameOrPhone: CUSTOMER_PARAM,
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productNameOrSku: { type: 'string' },
                qty: { type: 'integer' },
              },
              required: ['productNameOrSku', 'qty'],
            },
          },
          notes: { type: 'string' },
        },
        required: ['customerNameOrPhone', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_suppliers',
      description: 'Lista fornecedores cadastrados',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_taxes',
      description: 'Impostos e DAS do regime tributário atual',
      parameters: { type: 'object', properties: {} },
    },
  },
  // --- Consultas existentes ---
  {
    type: 'function',
    function: {
      name: 'query_financial_summary',
      description: 'Resumo financeiro do mes: receitas, despesas, saldo, por categoria',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_who_owes_me',
      description: 'Cobranças pendentes (quem me deve)',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_what_i_owe',
      description: 'Contas a pagar pendentes',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_leads_pipeline',
      description: 'Leads no CRM',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_open_tasks',
      description: 'Tarefas pendentes',
      parameters: { type: 'object', properties: {} },
    },
  },
];

@Injectable()
export class DeepSeekConsultantService {
  private readonly logger = new Logger(DeepSeekConsultantService.name);
  private readonly sessions = new Map<string, ConversationSession>();
  private readonly MAX_HISTORY = 8;
  private readonly SESSION_TTL_MS = 60 * 60 * 1000;

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

    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    const systemPrompt = `Assistente de gestao financeira e empresarial. Hoje: ${today}.
ESCOPO: Somente registra e consulta dados do sistema. Nao responda perguntas gerais, conselhos ou noticias.
REGRA: Ao detectar gasto/receita/cobranca/lead/tarefa/pedido, chame a ferramenta ANTES de responder. Sem ferramenta = dado nao salvo.
Se faltar valor ou data essencial, pergunte apenas isso. Categoria e escolhida por voce.
Sem markdown, sem tabelas. Use *negrito*, hifen p/ listas. Valores: R$ 0,00.`;

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

  private static readonly OUT_OF_SCOPE_MSG =
    '⚠️ Só posso registrar e consultar dados do sistema. Como posso te ajudar?';

  private static readonly SYSTEM_RESPONSE_TOOLS = new Set([
    'register_expense', 'register_income', 'register_lead',
    'create_payable', 'create_task',
    'query_customer', 'create_charge', 'mark_charge_paid', 'query_loans',
    'query_today_agenda', 'create_calendar_event', 'query_product', 'query_bank_balance',
    'create_sales_order', 'query_suppliers', 'query_taxes',
    'query_financial_summary', 'query_who_owes_me', 'query_what_i_owe',
    'query_leads_pipeline', 'query_open_tasks',
  ]);

  private looksLikeRegistration(text: string): boolean {
    return /gastei|paguei|comprei|almocei|jantei|tomei|fui|abasteci|recebi|faturei|entrou|vendi|novo lead|novo cliente|criar tarefa|me lembre|conta a pagar|tenho uma conta|criar cobran|cobrar o|pedido de venda/.test(text.toLowerCase());
  }

  private looksLikeSystemQuery(text: string): boolean {
    return /quanto|resumo|saldo|extrato|gasto|receita|lead|tarefa|pendente|deve|pagar|categoria|mes|semana|hoje|ontem|cliente|estoque|produto|fornecedor|imposto|agenda|cobranca|emprestimo|parcela|banco/.test(text.toLowerCase());
  }

  private async runAgentLoop(messages: ChatMessage[], tenantId: string): Promise<string> {
    const workingMessages = [...messages];
    const userMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    let firstIteration = true;

    for (let i = 0; i < 4; i++) {
      const maxTokens = firstIteration ? 100 : 400;
      const response = await this.deepseek.rawChat(workingMessages, { tools: TOOLS, maxTokens });

      if (response.finish_reason !== 'tool_calls' || !response.tool_calls.length) {
        if (firstIteration && this.looksLikeRegistration(userMessage)) {
          firstIteration = false;
          workingMessages.push({ role: 'assistant', content: response.content ?? '' });
          workingMessages.push({ role: 'user', content: 'Use a ferramenta adequada para registrar isso no sistema agora.' });
          continue;
        }
        const isAskingForInfo = firstIteration && this.looksLikeSystemQuery(userMessage);
        if (!isAskingForInfo && firstIteration) {
          return DeepSeekConsultantService.OUT_OF_SCOPE_MSG;
        }
        return response.content ?? DeepSeekConsultantService.OUT_OF_SCOPE_MSG;
      }

      firstIteration = false;

      const executed: Array<{ call: ToolCall; result: unknown }> = [];
      for (const call of response.tool_calls) {
        const result = await this.executeTool(tenantId, call);
        executed.push({ call, result });
      }

      const allHaveSystemResponse = executed.every(({ call }) =>
        DeepSeekConsultantService.SYSTEM_RESPONSE_TOOLS.has(call.function.name),
      );
      if (allHaveSystemResponse) {
        return executed.map(({ call, result }) => this.buildSystemResponse(call, result)).join('\n\n');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.content ?? null as unknown as string,
        tool_calls: response.tool_calls,
      };
      workingMessages.push(assistantMessage);
      for (const { call, result } of executed) {
        workingMessages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    return 'Nao consegui concluir a operacao. Pode reformular?';
  }

  // ─── System response templates ───────────────────────────────────────────────

  private buildSystemResponse(call: ToolCall, result: unknown): string {
    const r = result as Record<string, unknown>;
    const fmt = (cents: unknown) => `R$ ${(Number(cents) / 100).toFixed(2).replace('.', ',')}`;
    const isoDate = (v: unknown) => String(v ?? '').split('T')[0];

    if (r.error) return `❌ ${r.error}`;

    switch (call.function.name) {
      case 'register_expense':
        return `✅ *Gasto registrado!*\n- ${r.description}\n- *${fmt(r.amountCents)}*\n- 📂 ${r.category}`;

      case 'register_income':
        return `✅ *Receita registrada!*\n- ${r.description}\n- *${fmt(r.amountCents)}*\n- 📂 ${r.category}`;

      case 'register_lead': {
        const l = r as { name: string; stage: string; estimatedCents: number };
        return `✅ *Lead cadastrado!*\n- ${l.name}\n- Etapa: ${l.stage}${l.estimatedCents > 0 ? `\n- Valor est.: ${fmt(l.estimatedCents)}` : ''}`;
      }

      case 'create_payable': {
        const p = r as { description: string; amountCents: number; dueDate: unknown };
        return `✅ *Conta a pagar criada!*\n- ${p.description}\n- *${fmt(p.amountCents)}*\n- Vence: ${isoDate(p.dueDate)}`;
      }

      case 'create_task': {
        const t = r as { title: string; dueDate?: unknown };
        return `✅ *Tarefa criada!*\n- ${t.title}${t.dueDate ? `\n- Prazo: ${isoDate(t.dueDate)}` : ''}`;
      }

      case 'query_customer': {
        const c = r as { name: string; stage: string; pendingCents: number; pendingCount: number; activeLoans: number; nextDue?: string };
        return `👤 *${c.name}* (${c.stage})\n- A receber: ${fmt(c.pendingCents)} em ${c.pendingCount} cobrança(s)${c.activeLoans > 0 ? `\n- Empréstimos ativos: ${c.activeLoans}` : ''}${c.nextDue ? `\n- Próx. vencimento: ${c.nextDue}` : ''}`;
      }

      case 'create_charge': {
        const ch = r as { customer: string; amountCents: number; dueDate: string; recurrence: string };
        return `✅ *Cobrança criada!*\n- Cliente: ${ch.customer}\n- *${fmt(ch.amountCents)}*\n- Vence: ${ch.dueDate}${ch.recurrence === 'MONTHLY' ? '\n- 🔁 Recorrente mensal' : ''}`;
      }

      case 'mark_charge_paid': {
        const ch = r as { customer: string; amountCents: number; paidAt: string };
        return `✅ *Cobrança marcada como paga!*\n- ${ch.customer}\n- *${fmt(ch.amountCents)}*\n- Pago em: ${ch.paidAt}`;
      }

      case 'query_loans': {
        const q = r as { count: number; loans: Array<{ customer: string; principalCents: number; pendingInstallments: number; nextDue?: string; status: string }> };
        if (!q.count) return '✅ Nenhum empréstimo ativo.';
        const items = q.loans.slice(0, 8).map((l) =>
          `- ${l.customer}: ${fmt(l.principalCents)} — ${l.pendingInstallments} parcela(s)${l.nextDue ? ` (próx: ${l.nextDue})` : ''}`
        ).join('\n');
        return `💳 *${q.count} empréstimo(s) ativo(s)*\n\n${items}`;
      }

      case 'query_today_agenda': {
        const a = r as { events: Array<{ type: string; title: string; time?: string }>; tasks: Array<{ title: string; priority: string }>; charges: Array<{ customer: string; amountCents: number }> };
        const parts: string[] = [];
        if (a.events.length) parts.push(`📅 *Eventos (${a.events.length}):*\n${a.events.map((e) => `- ${e.time ? e.time + ' ' : ''}${e.title}`).join('\n')}`);
        if (a.tasks.length) parts.push(`📝 *Tarefas (${a.tasks.length}):*\n${a.tasks.map((t) => `- [${t.priority}] ${t.title}`).join('\n')}`);
        if (a.charges.length) parts.push(`💰 *Cobranças vencem hoje (${a.charges.length}):*\n${a.charges.map((c) => `- ${c.customer}: ${fmt(c.amountCents)}`).join('\n')}`);
        return parts.length ? parts.join('\n\n') : '✅ Agenda livre hoje!';
      }

      case 'create_calendar_event': {
        const e = r as { title: string; startsAt: string; customer?: string };
        return `✅ *Evento agendado!*\n- ${e.title}\n- 📅 ${e.startsAt}${e.customer ? `\n- Cliente: ${e.customer}` : ''}`;
      }

      case 'query_product': {
        const q = r as { count: number; products: Array<{ sku: string; name: string; priceCents: number; stockQty: number }> };
        if (!q.count) return '📭 Nenhum produto encontrado.';
        const items = q.products.slice(0, 10).map((p) => `- ${p.name} (${p.sku}): ${fmt(p.priceCents)} — estoque: ${p.stockQty}`).join('\n');
        return `📦 *${q.count} produto(s)*\n\n${items}`;
      }

      case 'query_bank_balance': {
        const q = r as { count: number; accounts: Array<{ name: string; type: string; balanceCents: number; lastSync?: string }> };
        if (!q.count) return '🏦 Nenhuma conta bancária conectada.';
        const items = q.accounts.map((a) => `- ${a.name} (${a.type}): *${fmt(a.balanceCents)}*${a.lastSync ? ` — sync: ${a.lastSync}` : ''}`).join('\n');
        return `🏦 *Saldo nas contas*\n\n${items}`;
      }

      case 'create_sales_order': {
        const o = r as { orderNumber: string; customer: string; totalCents: number; itemCount: number };
        return `✅ *Pedido criado!*\n- Nº ${o.orderNumber}\n- Cliente: ${o.customer}\n- ${o.itemCount} item(s) — *${fmt(o.totalCents)}*`;
      }

      case 'query_suppliers': {
        const q = r as { count: number; suppliers: Array<{ name: string; phone?: string; email?: string }> };
        if (!q.count) return '📭 Nenhum fornecedor cadastrado.';
        const items = q.suppliers.slice(0, 10).map((s) => `- ${s.name}${s.phone ? ` — ${s.phone}` : ''}`).join('\n');
        return `🏭 *${q.count} fornecedor(es)*\n\n${items}`;
      }

      case 'query_taxes': {
        const t = r as { regime?: string; period?: string; dasCents?: number; revenueCents?: number };
        if (!t.regime) return '📭 Nenhum cálculo tributário encontrado.';
        return `🧾 *Impostos — ${t.period}*\n- Regime: ${t.regime}\n- Receita: ${fmt(t.revenueCents)}\n- DAS: *${fmt(t.dasCents)}*`;
      }

      case 'query_financial_summary': {
        const s = r as {
          month: string; incomeCents: number; expenseCents: number; balanceCents: number;
          byCategory: Array<{ category: string; amountCents: number }>;
          accounts: Array<{ name: string; balanceCents: number }>;
        };
        const cats = s.byCategory.slice(0, 6).map((c) => `- ${c.category}: ${fmt(c.amountCents)}`).join('\n');
        const bal = s.balanceCents >= 0 ? `💚 ${fmt(s.balanceCents)}` : `🔴 ${fmt(Math.abs(s.balanceCents))}`;
        return `📊 *${s.month}*\n\n💚 Receitas: ${fmt(s.incomeCents)}\n🔴 Gastos: ${fmt(s.expenseCents)}\n💰 Saldo: ${bal}${cats ? `\n\n📂 *Por categoria:*\n${cats}` : ''}`;
      }

      case 'query_who_owes_me': {
        const q = r as { totalCents: number; count: number; charges: Array<{ customer: string; amountCents: number; dueDate: string }> };
        if (!q.count) return '✅ Nenhuma cobrança pendente.';
        const items = q.charges.slice(0, 10).map((c) => `- ${c.customer}: ${fmt(c.amountCents)} (${c.dueDate})`).join('\n');
        return `💰 *${q.count} cobrança(s) — ${fmt(q.totalCents)}*\n\n${items}`;
      }

      case 'query_what_i_owe': {
        const q = r as { totalCents: number; count: number; payables: Array<{ description: string; amountCents: number; dueDate: string }> };
        if (!q.count) return '✅ Nenhuma conta a pagar pendente.';
        const items = q.payables.slice(0, 10).map((p) => `- ${p.description}: ${fmt(p.amountCents)} (${p.dueDate})`).join('\n');
        return `📋 *${q.count} conta(s) a pagar — ${fmt(q.totalCents)}*\n\n${items}`;
      }

      case 'query_leads_pipeline': {
        const q = r as { count: number; totalEstimatedCents: number; byStage: Record<string, number> };
        if (!q.count) return '📭 Nenhum lead ativo.';
        const stages = Object.entries(q.byStage).map(([s, n]) => `- ${s}: ${n}`).join('\n');
        return `🎯 *${q.count} leads — ${fmt(q.totalEstimatedCents)} estimado*\n\n${stages}`;
      }

      case 'query_open_tasks': {
        const q = r as { count: number; tasks: Array<{ title: string; priority: string; dueDate?: string }> };
        if (!q.count) return '✅ Nenhuma tarefa pendente.';
        const items = q.tasks.map((t) => `- ${t.title}${t.dueDate ? ` (${t.dueDate})` : ''}`).join('\n');
        return `📝 *${q.count} tarefa(s)*\n\n${items}`;
      }

      default:
        return '✅ Operação concluída!';
    }
  }

  // ─── Tool dispatcher ──────────────────────────────────────────────────────────

  private async executeTool(tenantId: string, call: ToolCall): Promise<unknown> {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(call.function.arguments) as Record<string, unknown>;
    } catch {
      return { error: 'Argumentos inválidos' };
    }

    try {
      switch (call.function.name) {
        case 'register_expense':        return await this.toolRegisterTransaction(tenantId, 'EXPENSE', args);
        case 'register_income':         return await this.toolRegisterTransaction(tenantId, 'INCOME', args);
        case 'register_lead':           return await this.toolRegisterLead(tenantId, args);
        case 'create_payable':          return await this.toolCreatePayable(tenantId, args);
        case 'create_task':             return await this.toolCreateTask(tenantId, args);
        case 'query_customer':          return await this.toolQueryCustomer(tenantId, args);
        case 'create_charge':           return await this.toolCreateCharge(tenantId, args);
        case 'mark_charge_paid':        return await this.toolMarkChargePaid(tenantId, args);
        case 'query_loans':             return await this.toolQueryLoans(tenantId, args);
        case 'query_today_agenda':      return await this.toolQueryTodayAgenda(tenantId);
        case 'create_calendar_event':   return await this.toolCreateCalendarEvent(tenantId, args);
        case 'query_product':           return await this.toolQueryProduct(tenantId, args);
        case 'query_bank_balance':      return await this.toolQueryBankBalance(tenantId);
        case 'create_sales_order':      return await this.toolCreateSalesOrder(tenantId, args);
        case 'query_suppliers':         return await this.toolQuerySuppliers(tenantId);
        case 'query_taxes':             return await this.toolQueryTaxes(tenantId);
        case 'query_financial_summary': return await this.toolQueryFinancialSummary(tenantId);
        case 'query_who_owes_me':       return await this.toolQueryWhoOwesMe(tenantId);
        case 'query_what_i_owe':        return await this.toolQueryWhatIOwe(tenantId);
        case 'query_leads_pipeline':    return await this.toolQueryLeads(tenantId);
        case 'query_open_tasks':        return await this.toolQueryTasks(tenantId);
        default:
          return { error: `Ferramenta desconhecida: ${call.function.name}` };
      }
    } catch (err) {
      this.logger.error(`Erro ao executar ferramenta ${call.function.name}: ${String(err)}`);
      return { error: String(err) };
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async findCustomer(tenantId: string, nameOrPhone: string) {
    const phone = nameOrPhone.replace(/\D/g, '');
    return this.prisma.customer.findFirst({
      where: {
        tenantId,
        OR: [
          { name: { contains: nameOrPhone, mode: 'insensitive' } },
          ...(phone.length >= 8 ? [{ phone }, { whatsapp: phone }] : []),
        ],
      },
    });
  }

  private todayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // ─── Tool implementations ─────────────────────────────────────────────────────

  private async toolRegisterTransaction(
    tenantId: string,
    type: 'EXPENSE' | 'INCOME',
    args: Record<string, unknown>,
  ) {
    const amountCents = Math.abs(Math.round(Number(args.amountCents) || 0));
    if (amountCents <= 0) return { error: 'Valor inválido' };

    const paidAt = args.date ? new Date(String(args.date)) : new Date();
    const description = String(args.description ?? '').slice(0, 200);
    const category = String(args.category ?? 'Outros');

    if (type === 'EXPENSE') {
      const payable = await this.prisma.payable.create({
        data: { tenantId, description, amountCents, dueDate: paidAt, category, status: 'PAID', paidAt },
      });
      await this.prisma.ledgerEntry.createMany({
        data: [
          { tenantId, transactionId: payable.id, accountCode: 'EXPENSE', direction: 'DEBIT', amountCents, description },
          { tenantId, transactionId: payable.id, accountCode: 'CASH', direction: 'CREDIT', amountCents, description },
        ],
      });
      return { ok: true, type: 'EXPENSE', amountCents, category: payable.category, description: payable.description, paidAt: payable.paidAt?.toISOString() };
    }

    let customer = await this.prisma.customer.findFirst({ where: { tenantId, name: 'Receita Avulsa' } });
    if (!customer) {
      customer = await this.prisma.customer.create({ data: { tenantId, name: 'Receita Avulsa', phone: '00000000000', stage: 'CUSTOMER' } });
    }

    const charge = await this.prisma.charge.create({
      data: { tenantId, customerId: customer.id, amountCents, description, dueDate: paidAt, status: 'PAID', paidAt, category },
    });
    await this.prisma.ledgerEntry.createMany({
      data: [
        { tenantId, transactionId: charge.id, accountCode: 'CASH', direction: 'DEBIT', amountCents, description },
        { tenantId, transactionId: charge.id, accountCode: 'REVENUE', direction: 'CREDIT', amountCents, description },
      ],
    });
    return { ok: true, type: 'INCOME', amountCents, category: charge.category, description: charge.description, paidAt: charge.paidAt?.toISOString() };
  }

  private async toolRegisterLead(tenantId: string, args: Record<string, unknown>) {
    const name = String(args.name ?? '').trim();
    if (!name) return { error: 'Nome do lead é obrigatório' };

    const lead = await this.prisma.lead.create({
      data: {
        tenantId, name,
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
    if (amountCents <= 0) return { error: 'Valor inválido' };

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

  // --- Tier 1 ---

  private async toolQueryCustomer(tenantId: string, args: Record<string, unknown>) {
    const customer = await this.findCustomer(tenantId, String(args.nameOrPhone ?? ''));
    if (!customer) return { error: 'Cliente não encontrado' };

    const [charges, loans] = await Promise.all([
      this.prisma.charge.findMany({ where: { tenantId, customerId: customer.id, status: 'PENDING' }, orderBy: { dueDate: 'asc' }, take: 5 }),
      this.prisma.loan.findMany({ where: { tenantId, customerId: customer.id, status: { in: ['ACTIVE', 'DEFAULTED'] } }, take: 3 }),
    ]);

    const pendingCents = charges.reduce((s, c) => s + c.amountCents, 0);
    const nextDue = charges[0]?.dueDate.toISOString().split('T')[0];
    return { ok: true, name: customer.name, stage: customer.stage, pendingCents, pendingCount: charges.length, activeLoans: loans.length, nextDue };
  }

  private async toolCreateCharge(tenantId: string, args: Record<string, unknown>) {
    const customer = await this.findCustomer(tenantId, String(args.customerNameOrPhone ?? ''));
    if (!customer) return { error: 'Cliente não encontrado' };

    const amountCents = Math.round(Number(args.amountCents) || 0);
    if (amountCents <= 0) return { error: 'Valor inválido' };

    const recurrence = String(args.recurrence ?? 'ONCE');
    const charge = await this.prisma.charge.create({
      data: {
        tenantId,
        customerId: customer.id,
        amountCents,
        dueDate: new Date(String(args.dueDate)),
        description: args.description ? String(args.description).slice(0, 200) : `Cobrança — ${customer.name}`,
        status: 'PENDING',
        recurrence: recurrence === 'MONTHLY' ? 'MONTHLY' : 'ONCE',
      },
    });
    return { ok: true, customer: customer.name, amountCents: charge.amountCents, dueDate: charge.dueDate.toISOString().split('T')[0], recurrence: charge.recurrence };
  }

  private async toolMarkChargePaid(tenantId: string, args: Record<string, unknown>) {
    const customer = await this.findCustomer(tenantId, String(args.customerNameOrPhone ?? ''));
    if (!customer) return { error: 'Cliente não encontrado' };

    const where: Record<string, unknown> = { tenantId, customerId: customer.id, status: 'PENDING' };
    if (args.amountCents) where.amountCents = Math.round(Number(args.amountCents));

    const charge = await this.prisma.charge.findFirst({ where, orderBy: { dueDate: 'asc' } });
    if (!charge) return { error: `Nenhuma cobrança pendente encontrada para ${customer.name}` };

    const paidAt = new Date();
    await this.prisma.charge.update({ where: { id: charge.id }, data: { status: 'PAID', paidAt } });
    await this.prisma.ledgerEntry.createMany({
      data: [
        { tenantId, transactionId: charge.id, accountCode: 'CASH', direction: 'DEBIT', amountCents: charge.amountCents, description: charge.description ?? customer.name },
        { tenantId, transactionId: charge.id, accountCode: 'REVENUE', direction: 'CREDIT', amountCents: charge.amountCents, description: charge.description ?? customer.name },
      ],
    });
    return { ok: true, customer: customer.name, amountCents: charge.amountCents, paidAt: paidAt.toISOString().split('T')[0] };
  }

  private async toolQueryLoans(tenantId: string, args: Record<string, unknown>) {
    const nameOrPhone = args.customerNameOrPhone ? String(args.customerNameOrPhone) : null;
    let customerIds: string[] | undefined;

    if (nameOrPhone) {
      const customer = await this.findCustomer(tenantId, nameOrPhone);
      if (!customer) return { error: 'Cliente não encontrado' };
      customerIds = [customer.id];
    }

    const loans = await this.prisma.loan.findMany({
      where: { tenantId, status: { in: ['ACTIVE', 'DEFAULTED'] }, ...(customerIds ? { customerId: { in: customerIds } } : {}) },
      include: {
        customer: { select: { name: true } },
        installmentsList: { where: { status: { in: ['PENDING', 'OVERDUE'] } }, orderBy: { dueAt: 'asc' }, take: 1 },
      },
      take: 10,
    });

    return {
      count: loans.length,
      loans: loans.map((l) => ({
        customer: l.customer.name,
        principalCents: l.principalCents,
        pendingInstallments: l.installmentsList.length,
        nextDue: l.installmentsList[0]?.dueAt.toISOString().split('T')[0],
        status: l.status,
      })),
    };
  }

  // --- Tier 2 ---

  private async toolQueryTodayAgenda(tenantId: string) {
    const { start, end } = this.todayRange();

    const [events, tasks, charges] = await Promise.all([
      this.prisma.calendarEvent.findMany({
        where: { tenantId, startsAt: { gte: start, lte: end }, status: 'SCHEDULED' },
        orderBy: { startsAt: 'asc' },
        take: 10,
      }),
      this.prisma.task.findMany({
        where: { tenantId, done: false, dueDate: { gte: start, lte: end } },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 10,
      }),
      this.prisma.charge.findMany({
        where: { tenantId, status: 'PENDING', dueDate: { gte: start, lte: end } },
        include: { customer: { select: { name: true } } },
        take: 10,
      }),
    ]);

    return {
      events: events.map((e) => ({
        type: e.type,
        title: e.title,
        time: e.startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
      })),
      tasks: tasks.map((t) => ({ title: t.title, priority: t.priority })),
      charges: charges.map((c) => ({ customer: c.customer.name, amountCents: c.amountCents })),
    };
  }

  private async toolCreateCalendarEvent(tenantId: string, args: Record<string, unknown>) {
    let customerId: string | undefined;
    if (args.customerNameOrPhone) {
      const customer = await this.findCustomer(tenantId, String(args.customerNameOrPhone));
      customerId = customer?.id;
    }

    const validTypes = ['MEETING', 'VISIT', 'CHARGE', 'CONTRACT', 'DUE_DATE', 'TASK'];
    const eventType = validTypes.includes(String(args.type)) ? String(args.type) : 'MEETING';
    const startsAt = new Date(String(args.startsAt));

    const event = await this.prisma.calendarEvent.create({
      data: {
        tenantId,
        title: String(args.title ?? '').slice(0, 200),
        type: eventType,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        customerId: customerId ?? null,
        status: 'SCHEDULED',
      },
    });

    return { ok: true, title: event.title, startsAt: event.startsAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }), customer: customerId ? args.customerNameOrPhone : undefined };
  }

  private async toolQueryProduct(tenantId: string, args: Record<string, unknown>) {
    const nameOrSku = args.nameOrSku ? String(args.nameOrSku) : null;

    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        active: true,
        ...(nameOrSku ? { OR: [{ name: { contains: nameOrSku, mode: 'insensitive' } }, { sku: { contains: nameOrSku, mode: 'insensitive' } }] } : {}),
      },
      orderBy: { name: 'asc' },
      take: 15,
    });

    return {
      count: products.length,
      products: products.map((p) => ({ sku: p.sku, name: p.name, priceCents: p.priceCents, stockQty: p.stockQty })),
    };
  }

  private async toolQueryBankBalance(tenantId: string) {
    const accounts = await this.prisma.openFinanceBankAccount.findMany({
      where: { tenantId },
      include: { connection: { select: { status: true, connector: true } } },
      orderBy: { balanceCents: 'desc' },
    });

    return {
      count: accounts.length,
      accounts: accounts.map((a) => ({
        name: a.name ?? a.connection.connector,
        type: a.type,
        balanceCents: a.balanceCents,
        lastSync: a.lastSyncAt?.toISOString().split('T')[0],
      })),
    };
  }

  // --- Tier 3 ---

  private async toolCreateSalesOrder(tenantId: string, args: Record<string, unknown>) {
    const customer = await this.findCustomer(tenantId, String(args.customerNameOrPhone ?? ''));
    if (!customer) return { error: 'Cliente não encontrado' };

    const rawItems = Array.isArray(args.items) ? args.items as Array<{ productNameOrSku: string; qty: number }> : [];
    if (!rawItems.length) return { error: 'Informe pelo menos um produto' };

    const resolvedItems: Array<{ product: { id: string; name: string; priceCents: number; sku: string }; qty: number }> = [];
    for (const item of rawItems) {
      const product = await this.prisma.product.findFirst({
        where: {
          tenantId, active: true,
          OR: [{ name: { contains: item.productNameOrSku, mode: 'insensitive' } }, { sku: { contains: item.productNameOrSku, mode: 'insensitive' } }],
        },
      });
      if (!product) return { error: `Produto não encontrado: ${item.productNameOrSku}` };
      resolvedItems.push({ product, qty: Math.max(1, Math.round(Number(item.qty) || 1)) });
    }

    const totalCents = resolvedItems.reduce((s, i) => s + i.product.priceCents * i.qty, 0);

    const order = await this.prisma.salesOrder.create({
      data: { tenantId, customerId: customer.id, status: 'CONFIRMED', totalCents },
    });

    await this.prisma.salesOrderItem.createMany({
      data: resolvedItems.map((i) => ({
        tenantId,
        orderId: order.id,
        productId: i.product.id,
        qty: i.qty,
        unitPriceCents: i.product.priceCents,
        totalCents: i.product.priceCents * i.qty,
      })),
    });

    await this.prisma.stockMovement.createMany({
      data: resolvedItems.map((i) => ({
        tenantId,
        productId: i.product.id,
        type: 'OUT',
        qty: i.qty,
        reason: `Pedido ${order.id.slice(0, 8)}`,
        refType: 'SalesOrder',
        refId: order.id,
      })),
    });

    return { ok: true, orderNumber: String(order.id).slice(0, 8), customer: customer.name, totalCents, itemCount: resolvedItems.length };
  }

  private async toolQuerySuppliers(tenantId: string) {
    const suppliers = await this.prisma.supplier.findMany({ where: { tenantId }, orderBy: { name: 'asc' }, take: 20 });
    return {
      count: suppliers.length,
      suppliers: suppliers.map((s) => ({ name: s.name, phone: s.phone, email: s.email })),
    };
  }

  private async toolQueryTaxes(tenantId: string) {
    const tax = await this.prisma.taxCalculation.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
    if (!tax) return { regime: null };
    return { regime: tax.regime, period: tax.period, dasCents: tax.dasCents, revenueCents: tax.revenue12mCents };
  }

  // --- Consultas existentes ---

  private async toolQueryFinancialSummary(tenantId: string) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [txs, payables, charges, accounts] = await Promise.all([
      this.prisma.personalFinanceTransaction.findMany({ where: { tenantId, occurredAt: { gte: start, lte: end } } }),
      this.prisma.payable.findMany({ where: { tenantId, status: 'PAID', paidAt: { gte: start, lte: end } } }),
      this.prisma.charge.findMany({ where: { tenantId, status: 'PAID', paidAt: { gte: start, lte: end } }, include: { customer: { select: { name: true } } } }),
      this.prisma.personalFinanceAccount.findMany({ where: { tenantId, active: true } }),
    ]);

    const income =
      txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amountCents, 0) +
      charges.filter((c) => c.customer.name === 'Receita Avulsa').reduce((s, c) => s + c.amountCents, 0);

    const expense =
      txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amountCents, 0) +
      payables.reduce((s, p) => s + p.amountCents, 0);

    const byCategory: Record<string, number> = {};
    for (const t of txs.filter((t) => t.type === 'EXPENSE')) byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amountCents;
    for (const p of payables) { const cat = p.category ?? 'Outros'; byCategory[cat] = (byCategory[cat] ?? 0) + p.amountCents; }

    return {
      month: `${now.toLocaleString('pt-BR', { month: 'long' })} ${now.getFullYear()}`,
      incomeCents: income,
      expenseCents: expense,
      balanceCents: income - expense,
      accounts: accounts.map((a) => ({ name: a.name, balanceCents: a.balanceCents })),
      byCategory: Object.entries(byCategory).sort(([, a], [, b]) => b - a).map(([cat, cents]) => ({ category: cat, amountCents: cents })),
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
      charges: charges.map((c) => ({ customer: c.customer.name, amountCents: c.amountCents, dueDate: c.dueDate.toISOString().split('T')[0] })),
    };
  }

  private async toolQueryWhatIOwe(tenantId: string) {
    const payables = await this.prisma.payable.findMany({ where: { tenantId, status: 'PENDING' }, orderBy: { dueDate: 'asc' }, take: 15 });
    const total = payables.reduce((s, p) => s + p.amountCents, 0);
    return {
      totalCents: total,
      count: payables.length,
      payables: payables.map((p) => ({ description: p.description, amountCents: p.amountCents, dueDate: p.dueDate.toISOString().split('T')[0] })),
    };
  }

  private async toolQueryLeads(tenantId: string) {
    const leads = await this.prisma.lead.findMany({ where: { tenantId, stage: { notIn: ['LOST'] } }, orderBy: { createdAt: 'desc' }, take: 20 });
    const total = leads.reduce((s, l) => s + l.estimatedCents, 0);
    const byStage: Record<string, number> = {};
    for (const l of leads) byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;
    return { count: leads.length, totalEstimatedCents: total, byStage, leads: leads.map((l) => ({ name: l.name, stage: l.stage, estimatedCents: l.estimatedCents, phone: l.phone })) };
  }

  private async toolQueryTasks(tenantId: string) {
    const tasks = await this.prisma.task.findMany({ where: { tenantId, done: false }, orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }], take: 15 });
    return { count: tasks.length, tasks: tasks.map((t) => ({ title: t.title, priority: t.priority, dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : null })) };
  }

  // ─── Session management ───────────────────────────────────────────────────────

  private getOrCreate(phone: string, tenantId: string): ConversationSession {
    const existing = this.sessions.get(phone);
    if (existing && existing.expiresAt > new Date()) return existing;
    const session: ConversationSession = { tenantId, messages: [], expiresAt: new Date(Date.now() + this.SESSION_TTL_MS) };
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
