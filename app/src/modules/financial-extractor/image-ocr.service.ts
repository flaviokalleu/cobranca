import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ImageOcrService {
  private readonly logger = new Logger(ImageOcrService.name);

  async extractText(imageBase64: string, mimeType: string): Promise<string> {
    if (!imageBase64 || !mimeType.startsWith('image/')) return '';
    try {
      const buffer = await this.preprocess(imageBase64);
      return await this.runTesseract(buffer);
    } catch (err) {
      this.logger.warn(`OCR falhou: ${(err as Error).message}`);
      return '';
    }
  }

  // Upscale + grayscale + sharpen improves Tesseract accuracy on phone screenshots
  private async preprocess(base64: string): Promise<Buffer> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require('sharp') as typeof import('sharp');
    const input = Buffer.from(base64, 'base64');
    return sharp(input)
      .resize({ width: 1600, withoutEnlargement: false })
      .grayscale()
      .sharpen({ sigma: 1 })
      .normalize()
      .png()
      .toBuffer();
  }

  private async runTesseract(imageBuffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createWorker } = require('tesseract.js') as typeof import('tesseract.js');
    const worker = await createWorker('por+eng', 1, {
      logger: () => {},
      errorHandler: () => {},
    });
    try {
      const {
        data: { text },
      } = await worker.recognize(imageBuffer);
      return text.trim();
    } finally {
      await worker.terminate();
    }
  }
}
