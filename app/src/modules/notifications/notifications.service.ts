import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { QueueService } from '../../common/queue/queue.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

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
