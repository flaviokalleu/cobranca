import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsappCryptoService } from './whatsapp-crypto.service';

interface WhaileysAuthState {
  creds: Record<string, unknown>;
  keys: {
    get(type: string, ids: string[]): Promise<Record<string, unknown>>;
    set(data: Record<string, Record<string, unknown | null>>): Promise<void>;
  };
}

@Injectable()
export class WhatsappPostgresAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: WhatsappCryptoService,
  ) {}

  async loadAuthState(sessionName: string): Promise<{
    state: WhaileysAuthState;
    saveCreds: () => Promise<void>;
  }> {
    const whaileys = this.whaileys();
    const creds = (await this.loadCreds(sessionName)) ?? whaileys.initAuthCreds();
    const state: WhaileysAuthState = {
      creds,
      keys: {
        get: async (type, ids) => {
          const values: Record<string, unknown> = {};
          for (const id of ids) {
            const value = await this.getKey(sessionName, type, id);
            if (!value) continue;
            values[id] =
              type === 'app-state-sync-key' && whaileys.proto?.Message?.AppStateSyncKeyData
                ? whaileys.proto.Message.AppStateSyncKeyData.fromObject(value)
                : value;
          }
          return values;
        },
        set: async (data) => {
          for (const [type, values] of Object.entries(data)) {
            for (const [id, value] of Object.entries(values)) {
              if (value === null || value === undefined) {
                await this.removeKey(sessionName, type, id);
              } else {
                await this.setKey(sessionName, type, id, value);
              }
            }
          }
        },
      },
    };

    return {
      state,
      saveCreds: () => this.saveCreds(sessionName, state.creds),
    };
  }

  async saveCreds(sessionName: string, creds: unknown): Promise<void> {
    const connection = await this.ensureConnection();
    const { BufferJSON } = this.whaileys();
    const serialized = JSON.stringify(creds, BufferJSON?.replacer);
    const encrypted = this.crypto.encrypt(serialized);
    const active = await this.activeSession(sessionName);
    if (active) {
      await this.prisma.whatsappSession.update({
        where: { id: active.id },
        data: { creds: encrypted, connectionId: connection.id, isActive: true },
      });
      return;
    }
    await this.prisma.whatsappSession.create({
      data: {
        connectionId: connection.id,
        sessionName,
        creds: encrypted,
        isActive: true,
      },
    });
  }

  async getKey(sessionName: string, type: string, id: string): Promise<unknown | null> {
    const session = await this.activeSession(sessionName);
    if (!session) return null;
    const key = await this.prisma.whatsappSessionKey.findFirst({
      where: { sessionId: session.id, keyType: type, keyId: id },
    });
    if (!key) return null;
    const { BufferJSON } = this.whaileys();
    return JSON.parse(this.crypto.decrypt(key.keyValue), BufferJSON?.reviver) as unknown;
  }

  async setKey(sessionName: string, type: string, id: string, value: unknown): Promise<void> {
    const session = await this.ensureSession(sessionName);
    const { BufferJSON } = this.whaileys();
    const encrypted = this.crypto.encrypt(JSON.stringify(value, BufferJSON?.replacer));
    await this.prisma.whatsappSessionKey.upsert({
      where: {
        sessionId_keyType_keyId: {
          sessionId: session.id,
          keyType: type,
          keyId: id,
        },
      },
      update: { keyValue: encrypted },
      create: {
        sessionId: session.id,
        keyType: type,
        keyId: id,
        keyValue: encrypted,
      },
    });
  }

  async removeKey(sessionName: string, type: string, id: string): Promise<void> {
    const session = await this.activeSession(sessionName);
    if (!session) return;
    await this.prisma.whatsappSessionKey.deleteMany({
      where: { sessionId: session.id, keyType: type, keyId: id },
    });
  }

  async clearSession(sessionName: string): Promise<void> {
    const sessions = await this.prisma.whatsappSession.findMany({
      where: { sessionName },
      select: { id: true },
    });
    await this.prisma.whatsappSessionKey.deleteMany({
      where: { sessionId: { in: sessions.map((session) => session.id) } },
    });
    await this.prisma.whatsappSession.deleteMany({ where: { sessionName } });
  }

  async markSessionInactive(sessionName: string): Promise<void> {
    await this.prisma.whatsappSession.updateMany({
      where: { sessionName },
      data: { isActive: false },
    });
  }

  async hasActiveSession(sessionName: string): Promise<boolean> {
    return !!(await this.activeSession(sessionName));
  }

  private async loadCreds(sessionName: string): Promise<Record<string, unknown> | null> {
    const active = await this.activeSession(sessionName);
    if (!active) return null;
    const { BufferJSON } = this.whaileys();
    return JSON.parse(this.crypto.decrypt(active.creds), BufferJSON?.reviver) as Record<
      string,
      unknown
    >;
  }

  private async ensureSession(sessionName: string) {
    const active = await this.activeSession(sessionName);
    if (active) return active;
    const creds = this.whaileys().initAuthCreds();
    await this.saveCreds(sessionName, creds);
    const created = await this.activeSession(sessionName);
    if (!created) throw new Error('Nao foi possivel criar sessao WhatsApp.');
    return created;
  }

  private activeSession(sessionName: string) {
    return this.prisma.whatsappSession.findFirst({
      where: { sessionName, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async ensureConnection() {
    const connection = await this.prisma.whatsappConnection.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (connection) return connection;
    return this.prisma.whatsappConnection.create({ data: { status: 'disconnected' } });
  }

  private whaileys(): {
    initAuthCreds: () => Record<string, unknown>;
    BufferJSON?: { replacer?: (key: string, value: unknown) => unknown; reviver?: (key: string, value: unknown) => unknown };
    proto?: { Message?: { AppStateSyncKeyData?: { fromObject(value: unknown): unknown } } };
  } {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('whaileys');
  }
}
