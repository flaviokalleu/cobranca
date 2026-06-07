'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  connectWhatsapp,
  getWhatsappLogs,
  getWhatsappMetrics,
  getWhatsappMessages,
  getWhatsappSettings,
  getWhatsappStatus,
  logoutWhatsapp,
  restartWhatsapp,
  sendWhatsappTestMessage,
  updateWhatsappSettings,
  type WhatsappConnectionLog,
  type WhatsappMetrics,
  type WhatsappMessageLog,
  type WhatsappSettings,
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
  const [messages, setMessages] = useState<WhatsappMessageLog[]>([]);
  const [metrics, setMetrics] = useState<WhatsappMetrics>({
    errorCount: 0,
    receiptsProcessed: 0,
    totalMessages: 0,
    series: [],
  });
  const [settings, setSettings] = useState<WhatsappSettings>({
    isActive: true,
    welcomeMessage: null,
    alertPhone: null,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextStatus, nextLogs, nextMessages, nextMetrics, nextSettings] = await Promise.all([
        getWhatsappStatus(),
        getWhatsappLogs(),
        getWhatsappMessages(),
        getWhatsappMetrics(),
        getWhatsappSettings(),
      ]);
      setStatus(nextStatus);
      setLogs(nextLogs);
      setMessages(nextMessages);
      setMetrics(nextMetrics);
      setSettings(nextSettings);
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
      messages,
      metrics,
      settings,
      loading,
      actionLoading,
      error,
      refresh,
      connect: () => runAction(() => connectWhatsapp(false)),
      regenerateQr: () => runAction(() => connectWhatsapp(true)),
      restart: () => runAction(restartWhatsapp),
      logout: () => runAction(logoutWhatsapp),
      saveSettings: async (body: Partial<WhatsappSettings>) => {
        setActionLoading(true);
        try {
          const next = await updateWhatsappSettings(body);
          setSettings(next);
          await refresh();
        } catch (err) {
          setError((err as Error).message);
          throw err;
        } finally {
          setActionLoading(false);
        }
      },
      sendTestMessage: async (body: { to: string; message: string }) => {
        setActionLoading(true);
        try {
          const result = await sendWhatsappTestMessage(body);
          await refresh();
          return result;
        } catch (err) {
          setError((err as Error).message);
          throw err;
        } finally {
          setActionLoading(false);
        }
      },
    }),
    [actionLoading, error, loading, logs, messages, metrics, refresh, runAction, settings, status],
  );
}

function safeJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
