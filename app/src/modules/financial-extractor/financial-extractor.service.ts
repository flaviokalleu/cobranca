import { Injectable, Logger } from '@nestjs/common';
import { ExtractReceiptInput, ExtractedTransactionDto } from './dto/extracted-transaction.dto';
import { GroqTextExtractorService } from './groq-text-extractor.service';
import { GroqVisionExtractorService } from './groq-vision-extractor.service';
import { ImageOcrService } from './image-ocr.service';
import { LocalExtractorService } from './local-extractor.service';
import { PdfExtractorService } from './pdf-extractor.service';

@Injectable()
export class FinancialExtractorService {
  private readonly logger = new Logger(FinancialExtractorService.name);

  constructor(
    private readonly localExtractor: LocalExtractorService,
    private readonly groqText: GroqTextExtractorService,
    private readonly groqVision: GroqVisionExtractorService,
    private readonly ocr: ImageOcrService,
    private readonly pdf: PdfExtractorService,
  ) {}

  async extract(input: ExtractReceiptInput): Promise<ExtractedTransactionDto> {
    const hasImage = !!(input.mediaBase64 && input.mimeType?.startsWith('image/'));
    const hasPdf = !!(input.mediaBase64 && input.mimeType?.includes('pdf'));

    // Step 1: extract text from media locally before any API call
    let enrichedInput = input;

    if (hasImage) {
      const ocrText = await this.ocr.extractText(input.mediaBase64!, input.mimeType!);
      if (ocrText) {
        this.logger.debug(`OCR: ${ocrText.length} chars extraidos da imagem`);
        enrichedInput = {
          ...input,
          text: [ocrText, input.text].filter(Boolean).join('\n'),
        };
      }
    }

    if (hasPdf) {
      const pdfText = await this.pdf.extractText(input.mediaBase64!);
      if (pdfText) {
        this.logger.debug(`PDF: ${pdfText.length} chars extraidos`);
        enrichedInput = {
          ...input,
          text: [pdfText, input.text].filter(Boolean).join('\n'),
        };
      }
    }

    // Step 2: local regex extraction on extracted text
    const local = this.localExtractor.extract(enrichedInput);
    if (local.confianca !== 'baixa') {
      return local;
    }

    // Step 3: Groq Text on enriched text (OCR/PDF gave us the raw text)
    const enrichedText = enrichedInput.text?.trim() ?? '';
    if (enrichedText) {
      try {
        return await this.groqText.extract(enrichedInput, local);
      } catch (err) {
        this.logger.warn(`Groq texto indisponivel: ${(err as Error).message}`);
      }
    }

    // Step 4: Groq Vision fallback — when OCR produced nothing (low-quality photo/scan)
    if (hasImage) {
      try {
        return await this.groqVision.extract(input);
      } catch (err) {
        this.logger.warn(`Groq vision indisponivel: ${(err as Error).message}`);
      }
    }

    return local;
  }
}
