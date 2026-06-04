import { Injectable, Logger } from '@nestjs/common';

export interface IncomingWhatsappFile {
  hasMedia: boolean;
  text?: string;
  fileName?: string;
  mimeType?: string;
  mediaBase64?: string;
  tooLarge?: boolean;
}

@Injectable()
export class WhatsappFileService {
  private readonly logger = new Logger(WhatsappFileService.name);
  private readonly maxBytes = Number(process.env.WHATSAPP_RECEIPT_MAX_BYTES ?? 6_000_000);

  async extract(rawMessage: unknown): Promise<IncomingWhatsappFile> {
    const message = (rawMessage as { message?: Record<string, any> }).message;
    if (!message) return { hasMedia: false };

    const media =
      message.imageMessage ??
      message.documentMessage ??
      message.videoMessage ??
      message.audioMessage;
    if (!media) return { hasMedia: false };

    const mimeType = media.mimetype as string | undefined;
    const fileName = (media.fileName as string | undefined) ?? this.defaultFileName(mimeType);
    const text = (media.caption as string | undefined) ?? '';
    const size = this.toNumber(media.fileLength);
    if (size && size > this.maxBytes) {
      return { hasMedia: true, text, fileName, mimeType, tooLarge: true };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const baileys = require('@whiskeysockets/baileys') as {
        downloadMediaMessage?: (
          message: unknown,
          type: 'buffer',
          options: Record<string, unknown>,
        ) => Promise<Buffer>;
      };
      if (!baileys.downloadMediaMessage) {
        return { hasMedia: true, text, fileName, mimeType };
      }
      const buffer = await baileys.downloadMediaMessage(rawMessage, 'buffer', {});
      if (buffer.byteLength > this.maxBytes) {
        return { hasMedia: true, text, fileName, mimeType, tooLarge: true };
      }
      return {
        hasMedia: true,
        text,
        fileName,
        mimeType,
        mediaBase64: buffer.toString('base64'),
      };
    } catch (err) {
      this.logger.warn(`Nao foi possivel baixar midia do WhatsApp: ${(err as Error).message}`);
      return { hasMedia: true, text, fileName, mimeType };
    }
  }

  private defaultFileName(mimeType?: string): string {
    if (mimeType?.includes('pdf')) return 'comprovante.pdf';
    if (mimeType?.startsWith('image/')) return 'comprovante.jpg';
    return 'comprovante';
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value);
    if (value && typeof value === 'object' && 'toNumber' in value) {
      return (value as { toNumber: () => number }).toNumber();
    }
    return null;
  }
}
