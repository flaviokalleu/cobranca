'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  connectWhatsapp,
  getWhatsappLogs,
  getWhatsappStatus,
  logoutWhatsapp,
  restartWhatsapp,
  type WhatsappConnectionLog,
  type WhatsappStatus,
  whatsappEventsUrl,
} from '@/services/whatsappAdminApi';

const initialStatus: WhatsappStatus = {
  status: 'disconnected',
  message: 'WhatsApp nao conectado.',
};

export function useWhatsappConnection() {
  const [status, setStatus] = useState<WhatsappStatus>(initialStatus);
  const [logs, setLogs] = useState<WhatsappConnectionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextStatus, nextLogs] = await Promise.all([getWhatsappStatus(), getWhatsappLogs()]);
      setStatus(nextStatus);
      setLogs(nextLogs);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const runAction = useCallback(
    async (action: () => Promise<WhatsappStatus>) => {
      setActionLoading(true);
      try {
        const next = await action();
        setStatus(next);
        await refresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setActionLoading(false);
      }
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const url = whatsappEventsUrl();
    if (!url) return;
    const source = new EventSource(url);
    const events = [
      'whatsapp:qr',
      'whatsapp:qr_expired',
      'whatsapp:connecting',
      'whatsapp:connected',
      'whatsapp:disconnected',
      'whatsapp:reconnecting',
      'whatsapp:error',
      'whatsapp:session_expired',
    ];
    const handler = (event: MessageEvent) => {
      const payload = safeJson(event.data);
      setStatus((current) => ({
        ...current,
        ...payload,
        status: (payload.status as WhatsappStatus['status']) ?? current.status,
      }));
      void refresh();
    };
    events.forEach((eventName) => source.addEventListener(eventName, handler));
    source.onerror = () => {
      source.close();
    };
    return () => {
      events.forEach((eventName) => source.removeEventListener(eventName, handler));
      source.close();
    };
  }, [refresh]);

  return useMemo(
    () => ({
      status,
      logs,
      loading,
      actionLoading,
      error,
      refresh,
      connect: () => runAction(() => connectWhatsapp(false)),
      regenerateQr: () => runAction(() => connectWhatsapp(true)),
      restart: () => runAction(restartWhatsapp),
      logout: () => runAction(logoutWhatsapp),
    }),
    [actionLoading, error, loading, logs, refresh, runAction, status],
  );
}

function safeJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
