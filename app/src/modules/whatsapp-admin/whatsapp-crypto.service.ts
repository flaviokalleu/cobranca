import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class WhatsappCryptoService {
  encrypt(plainText: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  decrypt(cipherText: string): string {
    const [version, ivRaw, tagRaw, encryptedRaw] = cipherText.split(':');
    if (version !== 'v1' || !ivRaw || !tagRaw || !encryptedRaw) {
      throw new InternalServerErrorException('Sessao WhatsApp com formato criptografico invalido.');
    }
    const decipher = createDecipheriv('aes-256-gcm', this.key(), Buffer.from(ivRaw, 'base64'));
    decipher.setAuthTag(Buffer.from(tagRaw, 'base64'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }

  private key(): Buffer {
    const secret = process.env.WHATSAPP_SESSION_SECRET;
    if (!secret || secret.length < 16) {
      throw new InternalServerErrorException(
        'WHATSAPP_SESSION_SECRET deve ser definido para persistir a sessao do WhatsApp.',
      );
    }
    return createHash('sha256').update(secret).digest();
  }
}
