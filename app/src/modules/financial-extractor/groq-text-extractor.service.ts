import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  ExtractReceiptInput,
  ExtractedTransactionDto,
} from './dto/extracted-transaction.dto';
import { buildGroqTextPrompt } from './prompts/groq-text.prompt';
import { GROQ_TRANSACTION_SCHEMA } from './schemas/groq-transaction.schema';

@Injectable()
export class GroqTextExtractorService {
  private readonly logger = new Logger(GroqTextExtractorService.name);

  async extract(
    input: ExtractReceiptInput,
    local: ExtractedTransactionDto,
  ): Promise<ExtractedTransactionDto> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new ServiceUnavailableException('Groq nao configurado.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_TEXT_MODEL ?? 'llama-3.1-8b-instant',
        temperature: 0,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'financial_receipt',
            schema: GROQ_TRANSACTION_SCHEMA,
          },
        },
        messages: [
          {
            role: 'user',
            content: buildGroqTextPrompt({
              tipo: input.tipo,
              fileName: input.fileName,
              mimeType: input.mimeType,
              local,
              text: input.text ?? '',
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      this.logger.warn(`Groq text falhou: HTTP ${response.status}`);
      throw new ServiceUnavailableException('Groq indisponivel.');
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new ServiceUnavailableException('Groq sem resposta.');
    return this.parseJson(content, input.tipo, 'local+groq');
  }

  private parseJson(
    content: string,
    tipo: 'receita' | 'gasto',
    source: 'groq' | 'local+groq',
  ): ExtractedTransactionDto {
    const parsed = JSON.parse(content) as ExtractedTransactionDto;
    return {
      ...parsed,
      tipo,
      fonte_extracao: source,
    };
  }
}
