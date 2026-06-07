import { Injectable, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PushSubscriptionDto } from './dto/push-subscription.dto';

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class PushService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit(): void {
    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
    if (!publicKey || !privateKey) return;
    webpush.setVapidDetails(
      process.env.WEB_PUSH_SUBJECT ?? 'mailto:admin@cobranca.local',
      publicKey,
      privateKey,
    );
  }

  publicKey() {
    return { publicKey: process.env.WEB_PUSH_PUBLIC_KEY ?? null };
  }

  async subscribe(tenantId: string, userId: string | undefined, dto: PushSubscriptionDto) {
    const subscription = await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        tenantId,
        userId: userId ?? null,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      update: {
        tenantId,
        userId: userId ?? null,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
    });
    await this.audit.record({
      tenantId,
      actor: userId ?? 'system',
      action: 'PUSH_SUBSCRIBED',
      entityType: 'PushSubscription',
      entityId: subscription.id,
    });
    return { ok: true, id: subscription.id };
  }

  async unsubscribe(tenantId: string, endpoint: string) {
    const result = await this.prisma.pushSubscription.deleteMany({
      where: { tenantId, endpoint },
    });
    return { ok: true, deleted: result.count };
  }

  async notifyTenant(tenantId: string, payload: PushPayload) {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { tenantId },
    });
    const hasVapid = Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY);
    if (!hasVapid) {
      await this.audit.record({
        tenantId,
        actor: 'system',
        action: 'PUSH_FALLBACK_LOCAL',
        entityType: 'PushSubscription',
        entityId: tenantId,
        metadata: { subscriptions: subscriptions.length, ...payload },
      });
      return { sent: 0, fallback: true, subscriptions: subscriptions.length };
    }

    let sent = 0;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (error) {
        const statusCode = this.statusCode(error);
        if (statusCode === 404 || statusCode === 410) {
          await this.prisma.pushSubscription.delete({ where: { id: subscription.id } });
        } else {
          await this.audit.record({
            tenantId,
            actor: 'system',
            action: 'PUSH_SEND_FAILED',
            entityType: 'PushSubscription',
            entityId: subscription.id,
            metadata: { reason: error instanceof Error ? error.message : 'unknown' },
          });
        }
      }
    }
    return { sent, fallback: false, subscriptions: subscriptions.length };
  }

  private statusCode(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    const maybe = error as { statusCode?: number };
    return maybe.statusCode;
  }
}
