import { Injectable, Logger } from '@nestjs/common';
import { ExtractReceiptInput, ExtractedTransactionDto } from './dto/extracted-transaction.dto';
import { GroqTextExtractorService } from './groq-text-extractor.service';
import { GroqVisionExtractorService } from './groq-vision-extractor.service';
import { LocalExtractorService } from './local-extractor.service';

@Injectable()
export class FinancialExtractorService {
  private readonly logger = new Logger(FinancialExtractorService.name);

  constructor(
    private readonly localExtractor: LocalExtractorService,
    private readonly groqText: GroqTextExtractorService,
    private readonly groqVision: GroqVisionExtractorService,
  ) {}

  async extract(input: ExtractReceiptInput): Promise<ExtractedTransactionDto> {
    const local = this.localExtractor.extract(input);
    const text = input.text?.trim() ?? '';

    if (local.confianca !== 'baixa') {
      return local;
    }

    if (text) {
      try {
        return await this.groqText.extract(input, local);
      } catch (err) {
        this.logger.warn(`Fallback Groq texto indisponivel: ${(err as Error).message}`);
      }
    }

    if (input.mediaBase64 && input.mimeType?.startsWith('image/')) {
      try {
        return await this.groqVision.extract(input);
      } catch (err) {
        this.logger.warn(`Fallback Groq vision indisponivel: ${(err as Error).message}`);
      }
    }

    return local;
  }
}
