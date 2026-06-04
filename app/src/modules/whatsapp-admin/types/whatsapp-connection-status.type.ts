export type WhatsappConnectionStatus =
  | 'disconnected'
  | 'waiting_qr'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'session_expired';
