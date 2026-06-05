export type WhatsappConnectionStatus =
  | 'disconnected'
  | 'waiting_qr'
  | 'qr_expired'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'session_expired';
