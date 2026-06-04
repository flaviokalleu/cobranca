import { LogOut, Plug, RefreshCcw, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WhatsappConnectionStatus } from '@/services/whatsappAdminApi';

interface WhatsAppActionsProps {
  status: WhatsappConnectionStatus;
  loading: boolean;
  onConnect: () => void;
  onRegenerateQr: () => void;
  onRestart: () => void;
  onLogout: () => void;
}

export function WhatsAppActions({
  status,
  loading,
  onConnect,
  onRegenerateQr,
  onRestart,
  onLogout,
}: WhatsAppActionsProps) {
  if (status === 'connected') {
    return (
      <>
        <Button variant="outline" disabled={loading} onClick={onRestart}>
          <RotateCw className="h-4 w-4" />
          Reiniciar conexao
        </Button>
        <Button variant="destructive" disabled={loading} onClick={onLogout}>
          <LogOut className="h-4 w-4" />
          Desconectar WhatsApp
        </Button>
      </>
    );
  }

  if (status === 'waiting_qr' || status === 'session_expired') {
    return (
      <Button disabled={loading} onClick={onRegenerateQr}>
        <RefreshCcw className="h-4 w-4" />
        Gerar novo QR Code
      </Button>
    );
  }

  if (status === 'connecting' || status === 'reconnecting') {
    return (
      <Button disabled>
        <RotateCw className="h-4 w-4 animate-spin" />
        Conectando
      </Button>
    );
  }

  if (status === 'error') {
    return (
      <Button disabled={loading} onClick={onRestart}>
        <RefreshCcw className="h-4 w-4" />
        Tentar novamente
      </Button>
    );
  }

  return (
    <Button disabled={loading} onClick={onConnect}>
      <Plug className="h-4 w-4" />
      Conectar WhatsApp
    </Button>
  );
}
