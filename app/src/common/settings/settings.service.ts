import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface EffectiveSettings {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
}

/// Configuracoes do recebedor PIX por tenant. Cai para os defaults do .env se nao houver.
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string): Promise<EffectiveSettings> {
    const s = await this.prisma.settings.findUnique({ where: { tenantId } });
    return {
      pixKey: s?.pixKey ?? process.env.PIX_KEY ?? 'demo@cobranca.app',
      merchantName: s?.merchantName ?? process.env.PIX_MERCHANT_NAME ?? 'Cobranca Demo',
      merchantCity: s?.merchantCity ?? process.env.PIX_MERCHANT_CITY ?? 'Sao Paulo',
    };
  }

  async upsert(tenantId: string, data: EffectiveSettings): Promise<EffectiveSettings> {
    const s = await this.prisma.settings.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: { ...data },
    });
    return {
      pixKey: s.pixKey,
      merchantName: s.merchantName,
      merchantCity: s.merchantCity,
    };
  }
}
