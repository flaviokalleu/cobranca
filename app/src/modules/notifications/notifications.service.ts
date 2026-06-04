import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { QueueService } from '../../common/queue/queue.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

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

    return notification;
  }

  list(tenantId: string) {
    return this.prisma.notification.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
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

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  }
}
