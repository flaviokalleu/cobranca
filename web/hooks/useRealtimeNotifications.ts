'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { API_URL, getToken } from '@/lib/http-client';
import { fetchCharges, fetchUpcomingCharges } from '@/store/dataSlice';
import { fetchLeads } from '@/store/crmSlice';
import { useAppDispatch } from '@/store/hooks';
import { fetchNotifications } from '@/store/notificationsSlice';

interface RealtimeEvent {
  type: string;
  data: Record<string, unknown>;
}

export function useRealtimeNotifications() {
  const dispatch = useAppDispatch();
  const [connected, setConnected] = useState(false);
  const [realtimeUnread, setRealtimeUnread] = useState(0);
  const retryRef = useRef(1000);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    let timeout: number | null = null;
    let controller: AbortController | null = null;

    async function connect() {
      controller = new AbortController();
      try {
        const response = await fetch(`${API_URL}/notifications/stream`, {
          headers: { authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error('Stream indisponivel.');

        setConnected(true);
        retryRef.current = 1000;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseEvents(buffer);
          buffer = parsed.rest;
          parsed.events.forEach(handleEvent);
        }
      } catch {
        setConnected(false);
      }

      if (!cancelled) {
        const delay = retryRef.current;
        retryRef.current = Math.min(retryRef.current * 2, 30000);
        timeout = window.setTimeout(connect, delay);
      }
    }

    function handleEvent(event: RealtimeEvent) {
      if (event.type === 'notifications.connected') {
        setConnected(true);
        return;
      }
      if (event.type.startsWith('notification.')) {
        void dispatch(fetchNotifications());
        return;
      }
      if (event.type === 'charge.paid') {
        toast.success('Cobranca paga recebida em tempo real.');
        void dispatch(fetchCharges());
        void dispatch(fetchUpcomingCharges());
        void dispatch(fetchNotifications());
        return;
      }
      if (event.type === 'lead.created') {
        toast.message('Novo lead criado.');
        void dispatch(fetchLeads());
        void dispatch(fetchNotifications());
        return;
      }
      if (event.type === 'whatsapp.message') {
        setRealtimeUnread((current) => current + 1);
        toast.message('Nova mensagem recebida no WhatsApp.');
      }
    }

    void connect();

    return () => {
      cancelled = true;
      setConnected(false);
      controller?.abort();
      if (timeout) window.clearTimeout(timeout);
    };
  }, [dispatch]);

  return {
    connected,
    realtimeUnread,
    resetRealtimeUnread: () => setRealtimeUnread(0),
  };
}

function parseEvents(buffer: string): { events: RealtimeEvent[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, '\n');
  const chunks = normalized.split('\n\n');
  const rest = chunks.pop() ?? '';
  const events = chunks
    .map(parseEvent)
    .filter((event): event is RealtimeEvent => Boolean(event));
  return { events, rest };
}

function parseEvent(chunk: string): RealtimeEvent | null {
  let type = 'message';
  let data = '';
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) type = line.slice(6).trim();
    if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  if (!data) return { type, data: {} };
  try {
    return { type, data: JSON.parse(data) as Record<string, unknown> };
  } catch {
    return { type, data: { raw: data } };
  }
}
