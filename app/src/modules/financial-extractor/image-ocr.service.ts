import { Injectable } from '@nestjs/common';

@Injectable()
export class ImageOcrService {
  async extractText(): Promise<string> {
    return '';
  }
}
