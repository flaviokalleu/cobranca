import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

export interface PixInput {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amountCents: number;
  txid: string;
}

/**
 * Gera o "copia e cola" do PIX (BR Code / padrao EMV MPM do Banco Central),
 * incluindo o CRC16 valido. Isto e PIX de verdade: o texto gerado e o mesmo
 * formato que apps de banco leem. (Integracao com gateway tipo Asaas fica
 * em PixGateway, separada.)
 */
@Injectable()
export class PixService {
  buildCopyPaste(input: PixInput): string {
    const amount = (input.amountCents / 100).toFixed(2);
    const name = this.sanitize(input.merchantName, 25) || 'RECEBEDOR';
    const city = this.sanitize(input.merchantCity, 15) || 'CIDADE';
    const txid = this.sanitize(input.txid, 25) || '***';

    const merchantAccount =
      this.tlv('00', 'br.gov.bcb.pix') + this.tlv('01', input.pixKey);

    let payload =
      this.tlv('00', '01') + // Payload Format Indicator
      this.tlv('26', merchantAccount) + // Merchant Account Information - PIX
      this.tlv('52', '0000') + // Merchant Category Code
      this.tlv('53', '986') + // Moeda: BRL
      this.tlv('54', amount) + // Valor da transacao
      this.tlv('58', 'BR') + // Pais
      this.tlv('59', name) + // Nome do recebedor
      this.tlv('60', city) + // Cidade do recebedor
      this.tlv('62', this.tlv('05', txid)); // Additional Data Field (txid)

    payload += '6304'; // ID + tamanho do campo CRC, antes de calcula-lo
    return payload + this.crc16(payload);
  }

  /** Gera imagem PNG do QR Code PIX como Buffer (para envio no WhatsApp). */
  async buildQrImageBuffer(pixCode: string): Promise<Buffer> {
    return QRCode.toBuffer(pixCode, { type: 'png', width: 512, margin: 2 });
  }

  /** Campo TLV: ID(2) + tamanho(2 digitos) + valor. */
  private tlv(id: string, value: string): string {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  }

  private sanitize(value: string, max: number): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // remove acentos
      .replace(/[^A-Za-z0-9 ]/g, '')
      .toUpperCase()
      .slice(0, max)
      .trim();
  }

  /** CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF). Retorna 4 hex maiusculos. */
  crc16(input: string): string {
    let crc = 0xffff;
    for (let i = 0; i < input.length; i++) {
      crc ^= input.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit++) {
        crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
}
