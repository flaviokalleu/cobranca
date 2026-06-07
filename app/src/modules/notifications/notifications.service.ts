import { Injectable, MessageEvent, NotFoundException, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable } from 'rxjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { QueueService } from '../../common/queue/queue.service';
import { AppMailService } from '../../common/mail/mail.service';
import { JwtUser } from '../../auth/jwt-user.interface';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsGateway } from './notifications.gateway';
import {
  paginated,
  paginationArgs,
  PaginationDto,
} from '../../common/dto/pagination.dto';

export const NOTIFICATION_JOB = 'notification.send';

interface NotificationJob {
  tenantId: string;
  notificationId: string;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: QueueService,
    private readonly mail: AppMailService,
    private readonly events: EventEmitter2,
    private readonly gateway: NotificationsGateway,
  ) {}

  onModuleInit() {
    this.queue.register<NotificationJob>(NOTIFICATION_JOB, async (payload) => {
      await this.processNotification(payload);
    });
  }

  async create(tenantId: string, dto: CreateNotificationDto) {
    const channel = dto.channel ?? 'SYSTEM';
    const asyncChannel = channel === 'WHATSAPP' || channel === 'EMAIL';
    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        channel,
        title: dto.title,
        message: dto.message,
        recipientEmail: dto.recipientEmail ?? null,
        status: asyncChannel ? 'QUEUED' : 'UNREAD',
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      },
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'NOTIFICATION_CREATED',
      entityType: 'Notification',
      entityId: notification.id,
      metadata: { channel: notification.channel, status: notification.status },
    });

    if (asyncChannel) {
      this.queue.enqueue<NotificationJob>(NOTIFICATION_JOB, {
        tenantId,
        notificationId: notification.id,
      });
    }
    this.emitRealtime(tenantId, 'notification.created', {
      notificationId: notification.id,
      title: notification.title,
      channel: notification.channel,
      status: notification.status,
    });

    return notification;
  }

  stream(user: JwtUser): Observable<MessageEvent> {
    return this.gateway.stream(user);
  }

  async list(tenantId: string, query: PaginationDto) {
    const { skip, take } = paginationArgs(query);
    const search = query.search?.trim();
    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { message: { contains: search, mode: 'insensitive' as const } },
              { recipientEmail: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.notification.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async markRead(tenantId: string, id: string) {
    const current = await this.prisma.notification.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Notificacao nao encontrada neste tenant.');
    }

    const notification = await this.prisma.notification.update({
      where: { id: current.id },
      data: { status: 'READ' },
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'NOTIFICATION_READ',
      entityType: 'Notification',
      entityId: notification.id,
    });
    this.emitRealtime(tenantId, 'notification.updated', {
      notificationId: notification.id,
      status: notification.status,
    });

    return notification;
  }

  async update(tenantId: string, id: string, dto: UpdateNotificationDto) {
    const current = await this.prisma.notification.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Notificacao nao encontrada neste tenant.');
    }
    const channel = dto.channel ?? current.channel;
    const shouldQueue =
      (channel === 'WHATSAPP' || channel === 'EMAIL') &&
      dto.status === undefined &&
      current.status !== 'SENT';
    const notification = await this.prisma.notification.update({
      where: { id: current.id },
      data: {
        channel: dto.channel,
        title: dto.title,
        message: dto.message,
        recipientEmail:
          dto.recipientEmail === undefined ? undefined : dto.recipientEmail ?? null,
        status: shouldQueue ? 'QUEUED' : dto.status,
        entityType: dto.entityType === undefined ? undefined : dto.entityType,
        entityId: dto.entityId === undefined ? undefined : dto.entityId,
        scheduledAt:
          dto.scheduledAt === undefined
            ? undefined
            : dto.scheduledAt
              ? new Date(dto.scheduledAt)
              : null,
      },
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'NOTIFICATION_UPDATED',
      entityType: 'Notification',
      entityId: notification.id,
      metadata: { channel: notification.channel, status: notification.status },
    });

    if (shouldQueue) {
      this.queue.enqueue<NotificationJob>(NOTIFICATION_JOB, {
        tenantId,
        notificationId: notification.id,
      });
    }
    this.emitRealtime(tenantId, 'notification.updated', {
      notificationId: notification.id,
      title: notification.title,
      channel: notification.channel,
      status: notification.status,
    });
    return notification;
  }

  async remove(tenantId: string, id: string) {
    const current = await this.prisma.notification.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Notificacao nao encontrada neste tenant.');
    }
    await this.prisma.notification.delete({ where: { id: current.id } });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'NOTIFICATION_DELETED',
      entityType: 'Notification',
      entityId: current.id,
    });
    this.emitRealtime(tenantId, 'notification.deleted', { notificationId: current.id });
    return { ok: true };
  }

  private async processNotification(payload: NotificationJob) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: payload.notificationId,
        tenantId: payload.tenantId,
        status: 'QUEUED',
      },
    });
    if (!notification) return;

    if (notification.channel === 'EMAIL') {
      const recipientEmail =
        notification.recipientEmail ??
        (await this.resolveRecipientEmail(notification.tenantId, notification.entityType, notification.entityId));
      if (!recipientEmail) {
        await this.markNotificationFailed(notification, 'Destinatario de e-mail nao encontrado.');
        return;
      }

      const result = await this.mail.sendNotification(recipientEmail, {
        title: notification.title,
        message: notification.message,
      });
      if (!result.sent) {
        await this.markNotificationFailed(notification, result.reason ?? 'E-mail nao enviado.');
        return;
      }
    }

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
    this.emitRealtime(notification.tenantId, 'notification.updated', {
      notificationId: notification.id,
      status: 'SENT',
    });
  }

  private async resolveRecipientEmail(
    tenantId: string,
    entityType?: string | null,
    entityId?: string | null,
  ): Promise<string | null> {
    if (!entityType || !entityId) return null;
    const normalizedType = entityType.toLowerCase();
    if (normalizedType === 'customer') {
      const customer = await this.prisma.customer.findFirst({
        where: { id: entityId, tenantId },
        select: { email: true },
      });
      return customer?.email ?? null;
    }
    if (normalizedType === 'charge') {
      const charge = await this.prisma.charge.findFirst({
        where: { id: entityId, tenantId },
        select: { customer: { select: { email: true } } },
      });
      return charge?.customer.email ?? null;
    }
    return null;
  }

  private async markNotificationFailed(
    notification: { id: string; tenantId: string },
    reason: string,
  ): Promise<void> {
    await this.prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'FAILED',
        sentAt: null,
      },
    });
    await this.audit.record({
      tenantId: notification.tenantId,
      actor: 'system',
      action: 'NOTIFICATION_SEND_FAILED',
      entityType: 'Notification',
      entityId: notification.id,
      metadata: { reason },
    });
    this.emitRealtime(notification.tenantId, 'notification.updated', {
      notificationId: notification.id,
      status: 'FAILED',
    });
  }

  private emitRealtime(
    tenantId: string,
    type:
      | 'notification.created'
      | 'notification.updated'
      | 'notification.deleted'
      | 'charge.paid'
      | 'lead.created'
      | 'whatsapp.message',
    payload: Record<string, unknown>,
  ): void {
    this.events.emit('notification.realtime', { tenantId, type, payload });
  }
}
