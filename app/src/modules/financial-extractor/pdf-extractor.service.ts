import { Injectable } from '@nestjs/common';

@Injectable()
export class PdfExtractorService {
  async extractText(): Promise<string> {
    return '';
  }
}
