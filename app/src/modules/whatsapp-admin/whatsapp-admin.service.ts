import { ForbiddenException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtUser } from '../../auth/jwt-user.interface';
import { MainWhatsappBotService } from '../whatsapp-bot/main-whatsapp-bot.service';
import { WhatsappOutboundService, WhatsappSocketLike } from '../whatsapp-bot/whatsapp-outbound.service';
import { WhatsappStatusDto } from './dto/whatsapp-status.dto';
import { WhatsappConnectionStatus } from './types/whatsapp-connection-status.type';
import { WhatsappAdminGateway } from './whatsapp-admin.gateway';
import { WhatsappPostgresAuthService } from './whatsapp-postgres-auth.service';

@Injectable()
export class WhatsappAdminService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappAdminService.name);
  private socket: (WhatsappSocketLike & { ev?: any; logout?: () => Promise<void>; user?: any; end?: () => void }) | null = null;
  private currentQr: string | null = null;
  private currentQrImageDataUrl: string | null = null;
  private connecting: Promise<void> | null = null;
  private manualLogout = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly auth: WhatsappPostgresAuthService,
    private readonly gateway: WhatsappAdminGateway,
    private readonly bot: MainWhatsappBotService,
    private readonly outbound: WhatsappOutboundService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureConnection();
    await this.ensureMainBot();
    const sessionName = this.sessionName();
    if (await this.auth.hasActiveSession(sessionName)) {
      void this.connect({ restore: true }).catch((err) =>
        this.logger.warn(`Nao foi possivel restaurar WhatsApp: ${(err as Error).message}`),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.socket?.end?.();
    this.outbound.unbindSocket();
  }

  async status(): Promise<WhatsappStatusDto> {
    const connection = await this.ensureConnection();
    const status = connection.status as WhatsappConnectionStatus;
    if (status === 'waiting_qr') {
      return {
        status,
        qrAvailable: !!this.currentQr,
        qrCode: this.currentQr,
        qrImageDataUrl: this.currentQrImageDataUrl,
        lastUpdate: connection.updatedAt,
        message: 'Escaneie o QR Code para conectar o WhatsApp.',
      };
    }
    if (status === 'disconnected') {
      return {
        status,
        lastUpdate: connection.updatedAt,
        message: 'WhatsApp nao conectado.',
      };
    }
    return {
      status,
      phone: connection.phone,
      profileName: connection.profileName,
      profilePictureUrl: connection.profilePictureUrl,
      connectedAt: connection.connectedAt,
      disconnectedAt: connection.disconnectedAt,
      lastUpdate: connection.updatedAt,
      lastError: connection.lastError,
      qrAvailable: !!this.currentQr,
      qrCode: status === 'waiting_qr' ? this.currentQr : null,
      qrImageDataUrl: status === 'waiting_qr' ? this.currentQrImageDataUrl : null,
    };
  }

  async connect(options?: { actor?: JwtUser; force?: boolean; restore?: boolean }): Promise<WhatsappStatusDto> {
    const current = await this.ensureConnection();
    if (
      !options?.force &&
      ['connected', 'connecting', 'waiting_qr'].includes(current.status)
    ) {
      return this.status();
    }
    if (this.connecting) {
      await this.connecting;
      return this.status();
    }

    this.manualLogout = false;
    this.connecting = this.openSocket(options?.restore ?? false)
      .catch(async (err) => {
        await this.setStatus('error', {
          lastError: (err as Error).message,
          actor: options?.actor,
        });
        throw err;
      })
      .finally(() => {
        this.connecting = null;
      });
    await this.connecting;
    await this.log('WHATSAPP_CONNECT_REQUESTED', options?.actor, 'connecting');
    return this.status();
  }

  async restart(actor: JwtUser): Promise<WhatsappStatusDto> {
    this.socket?.end?.();
    this.outbound.unbindSocket();
    await this.setStatus('reconnecting', { actor });
    this.gateway.emit({ type: 'whatsapp:reconnecting', payload: { status: 'reconnecting' } });
    return this.connect({ actor, force: true, restore: true });
  }

  async logout(actor: JwtUser): Promise<WhatsappStatusDto> {
    this.manualLogout = true;
    try {
      await this.socket?.logout?.();
    } catch (err) {
      this.logger.warn(`Logout WhatsApp retornou erro: ${(err as Error).message}`);
    }
    this.socket?.end?.();
    this.socket = null;
    this.outbound.unbindSocket();
    this.currentQr = null;
    this.currentQrImageDataUrl = null;
    await this.auth.clearSession(this.sessionName());
    await this.setStatus('disconnected', {
      disconnectedAt: new Date(),
      actor,
      clearError: true,
    });
    this.gateway.emit({
      type: 'whatsapp:disconnected',
      payload: { status: 'disconnected', reason: 'logout_manual' },
    });
    await this.log('WHATSAPP_LOGOUT', actor, 'disconnected');
    return this.status();
  }

  async qr(): Promise<WhatsappStatusDto> {
    return this.status();
  }

  eventsForToken(token: string): Observable<MessageEvent> {
    if (!token) throw new ForbiddenException('Token ausente.');
    const user = this.jwt.verify<JwtUser>(token);
    if (!['SUPERADMIN', 'ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Permissao insuficiente para eventos do WhatsApp.');
    }
    return this.gateway.stream();
  }

  private async openSocket(restore: boolean): Promise<void> {
    await this.setStatus(restore ? 'reconnecting' : 'connecting', {});
    this.gateway.emit({
      type: restore ? 'whatsapp:reconnecting' : 'whatsapp:connecting',
      payload: { status: restore ? 'reconnecting' : 'connecting' },
    });

    const baileys = this.baileys();
    const makeWASocket = baileys.default ?? baileys.makeWASocket;
    const { state, saveCreds } = await this.auth.loadAuthState(this.sessionName());
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['WEBBA', 'Chrome', '1.0'],
      syncFullHistory: false,
    });
    this.socket = socket;
    this.outbound.bindSocket(socket);

    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', (update: Record<string, any>) =>
      void this.handleConnectionUpdate(update),
    );
    socket.ev.on('messages.upsert', (event: { messages?: unknown[] }) => {
      for (const message of event.messages ?? []) {
        void this.bot.handleIncomingMessage(message);
      }
    });
  }

  private async handleConnectionUpdate(update: Record<string, any>): Promise<void> {
    if (typeof update.qr === 'string') {
      this.currentQr = update.qr;
      this.currentQrImageDataUrl = await this.toQrDataUrl(update.qr);
      await this.setStatus('waiting_qr', { lastQrGeneratedAt: new Date(), clearError: true });
      this.gateway.emit({
        type: 'whatsapp:qr',
        payload: {
          qrCode: update.qr,
          qrImageDataUrl: this.currentQrImageDataUrl,
          createdAt: new Date().toISOString(),
        },
      });
    }

    if (update.connection === 'connecting') {
      await this.setStatus('connecting', {});
      this.gateway.emit({ type: 'whatsapp:connecting', payload: { status: 'connecting' } });
    }

    if (update.connection === 'open') {
      const user = this.socket?.user;
      const phone = typeof user?.id === 'string' ? user.id.split(':')[0].replace(/\D/g, '') : null;
      const profileName = typeof user?.name === 'string' ? user.name : null;
      this.currentQr = null;
      this.currentQrImageDataUrl = null;
      await this.setStatus('connected', {
        phone,
        profileName,
        connectedAt: new Date(),
        clearError: true,
      });
      this.gateway.emit({
        type: 'whatsapp:connected',
        payload: {
          status: 'connected',
          phone,
          profileName,
          connectedAt: new Date().toISOString(),
        },
      });
    }

    if (update.connection === 'close') {
      await this.handleClose(update);
    }
  }

  private async handleClose(update: Record<string, any>): Promise<void> {
    this.outbound.unbindSocket();
    const statusCode = update.lastDisconnect?.error?.output?.statusCode;
    const loggedOut = statusCode === this.baileys().DisconnectReason?.loggedOut;
    if (this.manualLogout) return;

    if (loggedOut) {
      await this.auth.markSessionInactive(this.sessionName());
      await this.setStatus('session_expired', {
        disconnectedAt: new Date(),
        lastError: 'Sessao expirada. Gere um novo QR Code.',
      });
      this.gateway.emit({
        type: 'whatsapp:session_expired',
        payload: {
          status: 'session_expired',
          message: 'Sessao expirada. Gere um novo QR Code.',
        },
      });
      return;
    }

    await this.setStatus('reconnecting', {
      disconnectedAt: new Date(),
      lastError: update.lastDisconnect?.error?.message ?? null,
    });
    this.gateway.emit({ type: 'whatsapp:reconnecting', payload: { status: 'reconnecting' } });
    setTimeout(() => {
      void this.connect({ force: true, restore: true }).catch((err) =>
        this.logger.warn(`Reconexao WhatsApp falhou: ${(err as Error).message}`),
      );
    }, 3000);
  }

  private async setStatus(
    status: WhatsappConnectionStatus,
    input: {
      actor?: JwtUser;
      phone?: string | null;
      profileName?: string | null;
      connectedAt?: Date;
      disconnectedAt?: Date;
      lastQrGeneratedAt?: Date;
      lastError?: string | null;
      clearError?: boolean;
    },
  ): Promise<void> {
    const connection = await this.ensureConnection();
    await this.prisma.whatsappConnection.update({
      where: { id: connection.id },
      data: {
        status,
        phone: input.phone ?? undefined,
        profileName: input.profileName ?? undefined,
        connectedAt: input.connectedAt ?? undefined,
        disconnectedAt: input.disconnectedAt ?? undefined,
        lastQrGeneratedAt: input.lastQrGeneratedAt ?? undefined,
        lastError: input.clearError ? null : input.lastError ?? undefined,
      },
    });
    await this.prisma.mainWhatsappBot.updateMany({
      data: {
        status,
        phone: input.phone ?? undefined,
        profileName: input.profileName ?? undefined,
        connectedAt: input.connectedAt ?? undefined,
        disconnectedAt: input.disconnectedAt ?? undefined,
      },
    });
    if (status === 'error') {
      this.gateway.emit({
        type: 'whatsapp:error',
        payload: { status: 'error', message: input.lastError ?? 'Erro de conexao.' },
      });
    }
  }

  private async log(action: string, actor: JwtUser | undefined, status?: string): Promise<void> {
    const connection = await this.ensureConnection();
    await this.prisma.whatsappConnectionLog.create({
      data: {
        connectionId: connection.id,
        adminId: actor?.sub ?? null,
        action,
        status,
        description: action,
        metadata: actor ? JSON.stringify({ role: actor.role, tenantId: actor.tenantId }) : null,
      },
    });
  }

  private async ensureConnection() {
    const current = await this.prisma.whatsappConnection.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (current) return current;
    return this.prisma.whatsappConnection.create({ data: { status: 'disconnected' } });
  }

  private async ensureMainBot() {
    const current = await this.prisma.mainWhatsappBot.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (current) return current;
    return this.prisma.mainWhatsappBot.create({ data: { status: 'disconnected', isActive: true } });
  }

  private async toQrDataUrl(qr: string): Promise<string | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const qrcode = require('qrcode') as { toDataURL(value: string): Promise<string> };
      return await qrcode.toDataURL(qr);
    } catch {
      return null;
    }
  }

  private sessionName(): string {
    return process.env.WHATSAPP_SESSION_NAME ?? 'main-bot';
  }

  private baileys(): any {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@whiskeysockets/baileys');
  }
}
