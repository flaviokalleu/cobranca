import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, map } from 'rxjs';

export interface WhatsappRealtimeEvent {
  type:
    | 'whatsapp:qr'
    | 'whatsapp:qr_expired'
    | 'whatsapp:connecting'
    | 'whatsapp:connected'
    | 'whatsapp:disconnected'
    | 'whatsapp:reconnecting'
    | 'whatsapp:error'
    | 'whatsapp:session_expired';
  payload: Record<string, unknown>;
}

@Injectable()
export class WhatsappAdminGateway {
  private readonly events$ = new Subject<WhatsappRealtimeEvent>();

  emit(event: WhatsappRealtimeEvent): void {
    this.events$.next(event);
  }

  stream(): Observable<MessageEvent> {
    return this.events$.asObservable().pipe(
      map((event) => ({
        type: event.type,
        data: event.payload,
      })),
    );
  }
}
