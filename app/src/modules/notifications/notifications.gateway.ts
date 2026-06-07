import { Injectable, MessageEvent } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Observable, Subject } from 'rxjs';
import { JwtUser } from '../../auth/jwt-user.interface';

export interface RealtimeNotificationEvent {
  tenantId: string;
  type: 'notification.created' | 'notification.updated' | 'notification.deleted' | 'charge.paid' | 'lead.created' | 'whatsapp.message';
  payload: Record<string, unknown>;
}

@Injectable()
export class NotificationsGateway {
  private readonly streams = new Map<string, Subject<MessageEvent>>();

  stream(user: JwtUser): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      const subject = this.subjectForTenant(user.tenantId);
      subscriber.next({
        type: 'notifications.connected',
        data: { tenantId: user.tenantId, connectedAt: new Date().toISOString() },
      });
      const subscription = subject.subscribe(subscriber);
      return () => subscription.unsubscribe();
    });
  }

  @OnEvent('notification.realtime')
  handleRealtimeEvent(event: RealtimeNotificationEvent): void {
    this.subjectForTenant(event.tenantId).next({
      type: event.type,
      data: event.payload,
    });
  }

  private subjectForTenant(tenantId: string): Subject<MessageEvent> {
    let subject = this.streams.get(tenantId);
    if (!subject) {
      subject = new Subject<MessageEvent>();
      this.streams.set(tenantId, subject);
    }
    return subject;
  }
}
