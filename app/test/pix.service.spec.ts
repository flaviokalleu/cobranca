import { PixService } from '../src/modules/pix/pix.service';

describe('PixService (BR Code / copia e cola)', () => {
  const pix = new PixService();

  it('CRC16/CCITT-FALSE do vetor canonico "123456789" e 29B1', () => {
    // Vetor de teste oficial do CRC-16/CCITT-FALSE (independente do nosso codigo).
    expect(pix.crc16('123456789')).toBe('29B1');
  });

  it('gera um copia-e-cola valido e auto-consistente', () => {
    const code = pix.buildCopyPaste({
      pixKey: 'maria@exemplo.com',
      merchantName: 'Loja Demo',
      merchantCity: 'Sao Paulo',
      amountCents: 4990,
      txid: 'CHARGE123',
    });

    expect(code.startsWith('000201')).toBe(true);
    expect(code).toContain('br.gov.bcb.pix');
    expect(code).toContain('49.90');

    // O CRC nos 4 ultimos caracteres deve bater com o recalculo sobre o corpo.
    const body = code.slice(0, -4);
    const crc = code.slice(-4);
    expect(pix.crc16(body)).toBe(crc);
  });
});
