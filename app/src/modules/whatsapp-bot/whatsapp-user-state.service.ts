import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface WhatsappStateRecord<T = unknown> {
  state: string;
  payload: T | null;
  expiresAt: Date;
}

@Injectable()
export class WhatsappUserStateService {
  constructor(private readonly prisma: PrismaService) {}

  async get<T>(phone: string): Promise<WhatsappStateRecord<T> | null> {
    const normalized = this.normalizePhone(phone);
    const current = await this.prisma.whatsappUserState.findUnique({
      where: { phone: normalized },
    });
    if (!current) return null;
    if (current.expiresAt.getTime() < Date.now()) {
      await this.clear(normalized);
      return null;
    }
    return {
      state: current.state,
      payload: current.payload ? (JSON.parse(current.payload) as T) : null,
      expiresAt: current.expiresAt,
    };
  }

  async set<T>(input: {
    tenantId: string;
    whatsappUserId: string;
    phone: string;
    state: string;
    payload?: T;
    ttlMinutes?: number;
  }): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (input.ttlMinutes ?? 30));
    const phone = this.normalizePhone(input.phone);
    await this.prisma.whatsappUserState.upsert({
      where: { phone },
      update: {
        tenantId: input.tenantId,
        whatsappUserId: input.whatsappUserId,
        state: input.state,
        payload: input.payload ? JSON.stringify(input.payload) : null,
        expiresAt,
      },
      create: {
        tenantId: input.tenantId,
        whatsappUserId: input.whatsappUserId,
        phone,
        state: input.state,
        payload: input.payload ? JSON.stringify(input.payload) : null,
        expiresAt,
      },
    });
  }

  async clear(phone: string): Promise<void> {
    const normalized = this.normalizePhone(phone);
    await this.prisma.whatsappUserState.deleteMany({ where: { phone: normalized } });
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
