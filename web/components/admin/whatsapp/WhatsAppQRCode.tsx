import { AlertTriangle, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WhatsappStatus } from '@/services/whatsappAdminApi';

export function WhatsAppQRCode({ status }: { status: WhatsappStatus }) {
  if (status.status !== 'waiting_qr') {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-4 w-4" />
          QR Code de conexao
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex aspect-square items-center justify-center rounded-md border bg-white p-4">
          {status.qrImageDataUrl ? (
            <img src={status.qrImageDataUrl} alt="QR Code do WhatsApp" className="h-full w-full" />
          ) : status.qrCode ? (
            <pre className="max-h-full overflow-auto whitespace-pre-wrap break-all text-xs text-slate-700">
              {status.qrCode}
            </pre>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center text-sm text-slate-600">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <span>QR Code indisponivel. Gere um novo QR Code.</span>
            </div>
          )}
        </div>
        <ol className="grid content-center gap-3 text-sm text-muted-foreground">
          <li>1. Abra o WhatsApp no celular que sera usado como robo.</li>
          <li>2. Toque em Aparelhos conectados.</li>
          <li>3. Toque em Conectar um aparelho.</li>
          <li>4. Escaneie o QR Code exibido nesta tela.</li>
          <li>5. Aguarde a confirmacao.</li>
        </ol>
      </CardContent>
    </Card>
  );
}
