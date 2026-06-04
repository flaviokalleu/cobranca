import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  ExtractReceiptInput,
  ExtractedTransactionDto,
} from './dto/extracted-transaction.dto';
import { buildGroqVisionPrompt } from './prompts/groq-vision.prompt';
import { GROQ_TRANSACTION_SCHEMA } from './schemas/groq-transaction.schema';

@Injectable()
export class GroqVisionExtractorService {
  private readonly logger = new Logger(GroqVisionExtractorService.name);

  async extract(input: ExtractReceiptInput): Promise<ExtractedTransactionDto> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || !input.mediaBase64 || !input.mimeType) {
      throw new ServiceUnavailableException('Groq Vision nao configurado.');
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_VISION_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct',
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
            content: [
              { type: 'text', text: buildGroqVisionPrompt(input.tipo) },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${input.mimeType};base64,${input.mediaBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      this.logger.warn(`Groq vision falhou: HTTP ${response.status}`);
      throw new ServiceUnavailableException('Groq Vision indisponivel.');
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new ServiceUnavailableException('Groq Vision sem resposta.');
    const parsed = JSON.parse(content) as ExtractedTransactionDto;
    return { ...parsed, tipo: input.tipo, fonte_extracao: 'groq' };
  }
}
