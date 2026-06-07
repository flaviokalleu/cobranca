import { API_URL, api, getToken } from '@/lib/api';

export type WhatsappConnectionStatus =
  | 'disconnected'
  | 'waiting_qr'
  | 'qr_expired'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'session_expired';

export interface WhatsappStatus {
  status: WhatsappConnectionStatus;
  phone?: string | null;
  profileName?: string | null;
  profilePictureUrl?: string | null;
  connectedAt?: string | null;
  disconnectedAt?: string | null;
  lastUpdate?: string | null;
  lastError?: string | null;
  qrAvailable?: boolean;
  qrCode?: string | null;
  qrImageDataUrl?: string | null;
  isActive?: boolean;
  welcomeMessage?: string | null;
  alertPhone?: string | null;
  connectedUptimeSeconds?: number | null;
  messagesProcessedToday?: number;
  receiptsProcessedToday?: number;
  message?: string;
}

export interface WhatsappConnectionLog {
  action: string;
  status: string | null;
  description: string | null;
  createdAt: string;
}

export interface WhatsappMessageLog {
  direction: string;
  phone: string | null;
  messageType: string | null;
  status: string;
  description: string | null;
  createdAt: string;
}

export interface WhatsappMetrics {
  errorCount: number;
  receiptsProcessed: number;
  totalMessages: number;
  series: Array<{
    date: string;
    inbound: number;
    outbound: number;
    errors: number;
    processed: number;
  }>;
}

export interface WhatsappSettings {
  isActive: boolean;
  welcomeMessage: string | null;
  alertPhone: string | null;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { status, data } = await api<T & { message?: string }>(method, path, body);
  if (status >= 300) {
    throw new Error(data.message ?? 'Nao foi possivel concluir a acao.');
  }
  return data;
}

export function getWhatsappStatus() {
  return request<WhatsappStatus>('GET', '/admin/whatsapp/status');
}

export function connectWhatsapp(force = false) {
  return request<WhatsappStatus>('POST', '/admin/whatsapp/connect', { force });
}

export function restartWhatsapp() {
  return request<WhatsappStatus>('POST', '/admin/whatsapp/restart');
}

export function logoutWhatsapp() {
  return request<WhatsappStatus>('POST', '/admin/whatsapp/logout');
}

export function getWhatsappLogs() {
  return request<WhatsappConnectionLog[]>('GET', '/admin/whatsapp/logs');
}

export function getWhatsappMessages() {
  return request<WhatsappMessageLog[]>('GET', '/admin/whatsapp/messages');
}

export function getWhatsappMetrics() {
  return request<WhatsappMetrics>('GET', '/admin/whatsapp/metrics');
}

export function getWhatsappSettings() {
  return request<WhatsappSettings>('GET', '/admin/whatsapp/settings');
}

export function updateWhatsappSettings(body: Partial<WhatsappSettings>) {
  return request<WhatsappSettings>('PATCH', '/admin/whatsapp/settings', body);
}

export function sendWhatsappTestMessage(body: { to: string; message: string }) {
  return request<{ ok: boolean; message: string }>('POST', '/admin/whatsapp/test-message', body);
}

export function whatsappEventsUrl(): string | null {
  const token = getToken();
  if (!token) return null;
  return `${API_URL}/admin/whatsapp/events?token=${encodeURIComponent(token)}`;
}
