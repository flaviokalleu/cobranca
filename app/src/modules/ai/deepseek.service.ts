import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface RawChatResponse {
  content: string | null;
  tool_calls: ToolCall[];
  finish_reason: string;
}

export interface ClassifiedTransaction {
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  amountCents: number;
  description: string;
  category: string;
  subcategory?: string;
  occurredAt: Date;
  confidence: number;
}

@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = config.get<string>('DEEPSEEK_API_KEY')?.trim();
    this.baseUrl = (config.get<string>('DEEPSEEK_BASE_URL')?.trim() || 'https://api.deepseek.com').replace(/\/$/, '');
    this.model = config.get<string>('DEEPSEEK_MODEL')?.trim() || 'deepseek-chat';
  }

  get isConfigured(): boolean {
    return !!this.apiKey;
  }

  async chat(messages: ChatMessage[], maxTokens = 1024): Promise<string> {
    const response = await this.rawChat(messages, { maxTokens });
    return response.content ?? '';
  }

  async rawChat(
    messages: ChatMessage[],
    options?: { tools?: ToolDefinition[]; maxTokens?: number },
  ): Promise<RawChatResponse> {
    if (!this.apiKey) throw new Error('DEEPSEEK_API_KEY nao configurada');

    const body: Record<string, unknown> = {
      model: this.model,
      messages,
      max_tokens: options?.maxTokens ?? 1024,
    };
    if (options?.tools?.length) {
      body.tools = options.tools;
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      this.logger.error(`DeepSeek error ${response.status}: ${err}`);
      throw new Error(`DeepSeek API retornou ${response.status}: ${err.slice(0, 300)}`);
    }

    const data = (await response.json()) as {
      choices: {
        message: { content: string | null; tool_calls?: ToolCall[] };
        finish_reason: string;
      }[];
    };

    const choice = data.choices[0];
    return {
      content: choice?.message?.content ?? null,
      tool_calls: choice?.message?.tool_calls ?? [],
      finish_reason: choice?.finish_reason ?? 'stop',
    };
  }

  async classifyTransaction(text: string): Promise<ClassifiedTransaction> {
    const today = new Date().toISOString().split('T')[0];

    const raw = await this.chat([
      {
        role: 'system',
        content: `Voce e um assistente financeiro pessoal brasileiro. Analise a mensagem do usuario e retorne um JSON valido (sem markdown) com os campos:
- type: "EXPENSE" | "INCOME" | "TRANSFER"
- amountCents: numero inteiro em centavos (ex: R$15,90 = 1590)
- description: descricao curta (max 200 chars)
- category: uma das categorias: Alimentacao, Transporte, Combustivel, Moradia, Saude, Educacao, Lazer, Internet, Energia, Agua, Impostos, Marketing, Renda, Outros
- subcategory: subcategoria opcional ou null
- occurredAt: data ISO8601 (hoje e ${today}; interprete "ontem", "segunda", etc.)
- confidence: inteiro de 0 a 100

Retorne APENAS o JSON, sem explicacoes.`,
      },
      { role: 'user', content: text },
    ]);

    try {
      const parsed = JSON.parse(raw.trim().replace(/^```json?\n?|```$/g, ''));
      return {
        type: ['EXPENSE', 'INCOME', 'TRANSFER'].includes(parsed.type) ? parsed.type : 'EXPENSE',
        amountCents: Math.abs(Math.round(Number(parsed.amountCents) || 0)),
        description: String(parsed.description ?? text).slice(0, 200),
        category: String(parsed.category || 'Outros'),
        subcategory: parsed.subcategory ?? undefined,
        occurredAt: parsed.occurredAt ? new Date(parsed.occurredAt) : new Date(),
        confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 70)),
      };
    } catch (err) {
      this.logger.warn(`Falha ao parsear resposta DeepSeek: ${String(err)}`);
      return {
        type: 'EXPENSE',
        amountCents: 0,
        description: text.slice(0, 200),
        category: 'Outros',
        occurredAt: new Date(),
        confidence: 20,
      };
    }
  }
}
