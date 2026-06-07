import { WhatsappConnectionStatus } from '../types/whatsapp-connection-status.type';

export interface WhatsappStatusDto {
  status: WhatsappConnectionStatus;
  phone?: string | null;
  profileName?: string | null;
  profilePictureUrl?: string | null;
  connectedAt?: Date | null;
  disconnectedAt?: Date | null;
  lastUpdate?: Date | null;
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
