import { Module } from '@nestjs/common';
import { ConfidenceService } from './confidence.service';
import { FinancialExtractorService } from './financial-extractor.service';
import { GroqTextExtractorService } from './groq-text-extractor.service';
import { GroqVisionExtractorService } from './groq-vision-extractor.service';
import { ImageOcrService } from './image-ocr.service';
import { LocalExtractorService } from './local-extractor.service';
import { NormalizationService } from './normalization.service';
import { PdfExtractorService } from './pdf-extractor.service';

@Module({
  providers: [
    ConfidenceService,
    FinancialExtractorService,
    GroqTextExtractorService,
    GroqVisionExtractorService,
    ImageOcrService,
    LocalExtractorService,
    NormalizationService,
    PdfExtractorService,
  ],
  exports: [FinancialExtractorService, LocalExtractorService, NormalizationService],
})
export class FinancialExtractorModule {}
