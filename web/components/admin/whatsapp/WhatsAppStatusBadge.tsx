import { Badge } from '@/components/ui/badge';
import type { WhatsappConnectionStatus } from '@/services/whatsappAdminApi';

const labels: Record<WhatsappConnectionStatus, string> = {
  disconnected: 'Desconectado',
  waiting_qr: 'Aguardando QR',
  qr_expired: 'QR expirado',
  connecting: 'Conectando',
  connected: 'Conectado',
  reconnecting: 'Reconectando',
  error: 'Erro',
  session_expired: 'Sessao expirada',
};

export function WhatsAppStatusBadge({ status }: { status: WhatsappConnectionStatus }) {
  const variant =
    status === 'connected'
      ? 'success'
      : status === 'error' || status === 'session_expired' || status === 'qr_expired'
        ? 'destructive'
        : status === 'waiting_qr' || status === 'connecting' || status === 'reconnecting'
          ? 'warning'
          : 'secondary';

  return <Badge variant={variant}>{labels[status]}</Badge>;
}
