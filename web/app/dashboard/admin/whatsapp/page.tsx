'use client';

import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { WhatsAppActions } from '@/components/admin/whatsapp/WhatsAppActions';
import { WhatsAppConnectionCard } from '@/components/admin/whatsapp/WhatsAppConnectionCard';
import { WhatsAppConnectionLogs } from '@/components/admin/whatsapp/WhatsAppConnectionLogs';
import { WhatsAppMessageLogs } from '@/components/admin/whatsapp/WhatsAppMessageLogs';
import { WhatsAppMetricsPanel } from '@/components/admin/whatsapp/WhatsAppMetricsPanel';
import { WhatsAppQRCode } from '@/components/admin/whatsapp/WhatsAppQRCode';
import { WhatsAppSettingsPanel } from '@/components/admin/whatsapp/WhatsAppSettingsPanel';
import { Card, CardContent } from '@/components/ui/card';
import { useWhatsappConnection } from '@/hooks/useWhatsappConnection';

export default function AdminWhatsappPage() {
  const whatsapp = useWhatsappConnection();

  function run(action: () => void, message: string) {
    action();
    toast.message(message);
  }

  return (
    <>
      <PageHeader
        title="WhatsApp do robo"
        description="Acompanhe a conexao do WhatsApp, mensagens recebidas e comprovantes processados."
        actions={
          <WhatsAppActions
            status={whatsapp.status.status}
            loading={whatsapp.actionLoading}
            onConnect={() => run(whatsapp.connect, 'Conectando WhatsApp')}
            onRegenerateQr={() => run(whatsapp.regenerateQr, 'Gerando QR Code')}
            onRestart={() => run(whatsapp.restart, 'Reiniciando conexao')}
            onLogout={() => run(whatsapp.logout, 'Desconectando WhatsApp')}
          />
        }
      />

      <main className="space-y-6 p-6">
        {whatsapp.error && (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="p-4 text-sm text-destructive">{whatsapp.error}</CardContent>
          </Card>
        )}
        <WhatsAppConnectionCard status={whatsapp.status} />
        <WhatsAppQRCode status={whatsapp.status} />
        <WhatsAppSettingsPanel
          settings={whatsapp.settings}
          loading={whatsapp.actionLoading}
          onSave={whatsapp.saveSettings}
          onSendTest={whatsapp.sendTestMessage}
          onSaved={(message) => toast.success(message)}
          onError={(message) => toast.error(message)}
        />
        <WhatsAppMetricsPanel metrics={whatsapp.metrics} />
        <div className="grid gap-6 xl:grid-cols-2">
          <WhatsAppMessageLogs messages={whatsapp.messages} />
          <WhatsAppConnectionLogs logs={whatsapp.logs} />
        </div>
      </main>
    </>
  );
}


