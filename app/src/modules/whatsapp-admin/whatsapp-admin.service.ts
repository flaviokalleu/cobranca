import {
  ForbiddenException,
  Injectable,
  Logger,
  MessageEvent,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
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
  private suppressReconnectUntil = 0;
  private lastQrLogAt = 0;
  private pendingCredsSave: Promise<void> = Promise.resolve();

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
    this.closeSocket({ suppressReconnect: true });
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
    if (status === 'qr_expired') {
      return {
        status,
        qrAvailable: false,
        qrCode: null,
        qrImageDataUrl: null,
        lastUpdate: connection.updatedAt,
        lastError: connection.lastError,
        message: 'QR Code expirou. Gere um novo QR Code.',
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
      qrCode: null,
      qrImageDataUrl: null,
    };
  }

  async connect(options?: { actor?: JwtUser; force?: boolean; restore?: boolean }): Promise<WhatsappStatusDto> {
    const current = await this.ensureConnection();
    const reusableWaitingQr = current.status === 'waiting_qr' && !!this.currentQr;
    if (
      !options?.force &&
      (['connected', 'connecting'].includes(current.status) || reusableWaitingQr)
    ) {
      return this.status();
    }
    if (this.connecting) {
      await this.connecting;
      return this.status();
    }

    this.manualLogout = false;
    if (options?.force || current.status === 'waiting_qr') {
      this.closeSocket({ suppressReconnect: true });
      this.currentQr = null;
      this.currentQrImageDataUrl = null;
      this.lastQrLogAt = 0;
    }
    if (options?.force && !options.restore) {
      await this.auth.clearSession(this.sessionName());
    }
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
    this.closeSocket({ suppressReconnect: true });
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
    this.closeSocket({ suppressReconnect: true });
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

  async logs(): Promise<
    Array<{
      action: string;
      status: string | null;
      description: string | null;
      createdAt: Date;
    }>
  > {
    return this.prisma.whatsappConnectionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        action: true,
        status: true,
        description: true,
        createdAt: true,
      },
    });
  }

  eventsForToken(token: string): Observable<MessageEvent> {
    if (!token) throw new ForbiddenException('Token ausente.');
    let user: JwtUser;
    try {
      user = this.jwt.verify<JwtUser>(token);
    } catch {
      throw new ForbiddenException('Token invalido para eventos do WhatsApp.');
    }
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

    const whaileys = this.whaileys();
    const makeWASocket = whaileys.default ?? whaileys.makeWASocket;
    const { state, saveCreds } = await this.auth.loadAuthState(this.sessionName());
    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: ['WEBBA', 'Chrome', '1.0'],
      syncFullHistory: false,
    });
    this.socket = socket;
    this.outbound.bindSocket(socket);

    socket.ev.on('creds.update', (update: Record<string, unknown>) => {
      if (update && typeof update === 'object') {
        Object.assign(state.creds, update);
      }
      this.pendingCredsSave = saveCreds().catch((err) =>
        this.setStatus('error', {
          lastError: (err as Error).message,
        }),
      );
    });
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
      const shouldLogQr = !this.currentQr || Date.now() - this.lastQrLogAt > 60_000;
      this.currentQr = update.qr;
      this.currentQrImageDataUrl = await this.toQrDataUrl(update.qr);
      await this.setStatus('waiting_qr', { lastQrGeneratedAt: new Date(), clearError: true });
      if (shouldLogQr) {
        this.lastQrLogAt = Date.now();
        await this.log(
          'WHATSAPP_QR_GENERATED',
          undefined,
          'waiting_qr',
          'Novo QR Code gerado. Escaneie antes de expirar.',
        );
      }
      this.gateway.emit({
        type: 'whatsapp:qr',
        payload: {
          qrCode: update.qr,
          qrImageDataUrl: this.currentQrImageDataUrl,
          createdAt: new Date().toISOString(),
        },
      });
    }

    if (update.connection === 'connecting' && !this.currentQr) {
      await this.setStatus('connecting', {});
      this.gateway.emit({ type: 'whatsapp:connecting', payload: { status: 'connecting' } });
    }

    if (update.connection === 'open') {
      const user = this.socket?.user;
      const phone = typeof user?.id === 'string' ? user.id.split(':')[0].replace(/\D/g, '') : null;
      const profileName = typeof user?.name === 'string' ? user.name : null;
      this.currentQr = null;
      this.currentQrImageDataUrl = null;
      this.lastQrLogAt = 0;
      await this.setStatus('connected', {
        phone,
        profileName,
        connectedAt: new Date(),
        clearError: true,
      });
      await this.log('WHATSAPP_CONNECTED', undefined, 'connected');
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
    if (Date.now() < this.suppressReconnectUntil) return;
    const statusCode = update.lastDisconnect?.error?.output?.statusCode;
    const closeMessage = update.lastDisconnect?.error?.message ?? null;
    const disconnectReason = this.whaileys().DisconnectReason ?? {};
    const loggedOut = statusCode === disconnectReason.loggedOut;
    const restartRequired = statusCode === disconnectReason.restartRequired;
    const qrTimedOut = statusCode === disconnectReason.timedOut && !!this.currentQr;
    if (this.manualLogout) return;

    if (restartRequired) {
      this.currentQr = null;
      this.currentQrImageDataUrl = null;
      this.lastQrLogAt = 0;
      await this.pendingCredsSave;
      await this.setStatus('reconnecting', {
        disconnectedAt: new Date(),
        lastError: null,
        clearError: true,
      });
      await this.log(
        'WHATSAPP_RESTART_REQUIRED',
        undefined,
        'reconnecting',
        'Pareamento aceito pelo WhatsApp. Reiniciando conexao com a sessao salva.',
      );
      this.gateway.emit({
        type: 'whatsapp:reconnecting',
        payload: {
          status: 'reconnecting',
          message: 'Pareamento aceito. Reiniciando conexao.',
          qrAvailable: false,
        },
      });
      setTimeout(() => {
        void this.connect({ force: true, restore: true }).catch((err) =>
          this.logger.warn(`Reconexao WhatsApp apos pareamento falhou: ${(err as Error).message}`),
        );
      }, 500);
      return;
    }

    if (qrTimedOut) {
      this.currentQr = null;
      this.currentQrImageDataUrl = null;
      this.lastQrLogAt = 0;
      await this.auth.clearSession(this.sessionName());
      await this.setStatus('qr_expired', {
        disconnectedAt: new Date(),
        lastError: 'QR Code expirou. Gere um novo QR Code e escaneie antes de expirar.',
      });
      await this.log(
        'WHATSAPP_QR_EXPIRED',
        undefined,
        'qr_expired',
        `QR Code expirou sem pareamento. statusCode=${statusCode}`,
      );
      this.gateway.emit({
        type: 'whatsapp:qr_expired',
        payload: {
          status: 'qr_expired',
          message: 'QR Code expirou. Gere um novo QR Code.',
          qrAvailable: false,
        },
      });
      return;
    }

    if (loggedOut) {
      this.currentQr = null;
      this.currentQrImageDataUrl = null;
      this.lastQrLogAt = 0;
      await this.auth.markSessionInactive(this.sessionName());
      await this.setStatus('session_expired', {
        disconnectedAt: new Date(),
        lastError: 'Sessao expirada. Gere um novo QR Code.',
      });
      await this.log(
        'WHATSAPP_SESSION_EXPIRED',
        undefined,
        'session_expired',
        `Sessao expirada. statusCode=${statusCode}`,
      );
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
      lastError: closeMessage,
    });
    await this.log(
      'WHATSAPP_CONNECTION_CLOSED',
      undefined,
      'reconnecting',
      `Conexao fechada. statusCode=${statusCode ?? 'desconhecido'}; erro=${closeMessage ?? 'sem detalhe'}`,
    );
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

  private async log(
    action: string,
    actor: JwtUser | undefined,
    status?: string,
    description = action,
  ): Promise<void> {
    const connection = await this.ensureConnection();
    await this.prisma.whatsappConnectionLog.create({
      data: {
        connectionId: connection.id,
        adminId: actor?.sub ?? null,
        action,
        status,
        description,
        metadata: actor ? JSON.stringify({ role: actor.role, tenantId: actor.tenantId }) : null,
      },
    });
  }

  private closeSocket(options?: { suppressReconnect?: boolean }): void {
    if (options?.suppressReconnect) {
      this.suppressReconnectUntil = Date.now() + 5_000;
    }
    const socket = this.socket;
    this.socket = null;
    this.outbound.unbindSocket();
    try {
      socket?.ev?.removeAllListeners?.('connection.update');
      socket?.ev?.removeAllListeners?.('messages.upsert');
      socket?.ev?.removeAllListeners?.('creds.update');
      socket?.end?.();
    } catch (err) {
      this.logger.warn(`Erro ao fechar socket WhatsApp: ${(err as Error).message}`);
    }
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

  private whaileys(): any {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('whaileys');
  }
}
