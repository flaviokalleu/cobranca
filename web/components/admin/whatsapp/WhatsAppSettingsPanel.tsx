'use client';

import { useEffect, useState } from 'react';
import { Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WhatsappSettings } from '@/services/whatsappAdminApi';

interface WhatsAppSettingsPanelProps {
  settings: WhatsappSettings;
  loading: boolean;
  onSave: (settings: Partial<WhatsappSettings>) => Promise<void>;
  onSendTest: (payload: { to: string; message: string }) => Promise<{ message: string }>;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

export function WhatsAppSettingsPanel({
  settings,
  loading,
  onSave,
  onSendTest,
  onSaved,
  onError,
}: WhatsAppSettingsPanelProps) {
  const [isActive, setIsActive] = useState(settings.isActive);
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcomeMessage ?? '');
  const [alertPhone, setAlertPhone] = useState(settings.alertPhone ?? '');
  const [testPhone, setTestPhone] = useState(settings.alertPhone ?? '');
  const [testMessage, setTestMessage] = useState('Teste do robo WEBBA ERP.');

  useEffect(() => {
    setIsActive(settings.isActive);
    setWelcomeMessage(settings.welcomeMessage ?? '');
    setAlertPhone(settings.alertPhone ?? '');
    setTestPhone((current) => current || settings.alertPhone || '');
  }, [settings]);

  async function save() {
    try {
      await onSave({
        isActive,
        welcomeMessage: welcomeMessage.trim() || null,
        alertPhone: alertPhone.trim() || null,
      });
      onSaved('Configuracoes do WhatsApp salvas.');
    } catch (err) {
      onError((err as Error).message);
    }
  }

  async function sendTest() {
    try {
      const result = await onSendTest({
        to: testPhone.trim(),
        message: testMessage.trim(),
      });
      onSaved(result.message);
    } catch (err) {
      onError((err as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configuracoes do bot</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <label className="flex items-center gap-3 rounded-md border p-3">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
              className="h-5 w-5 accent-primary"
            />
            <span className="text-sm font-medium">Robo ativo para processar mensagens</span>
          </label>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Mensagem de boas-vindas</Label>
            <textarea
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(event) => setWelcomeMessage(event.target.value)}
              maxLength={1000}
              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Ola, {nome}! Sou o assistente WEBBA ERP."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alertPhone">Telefone padrao para alertas</Label>
            <Input
              id="alertPhone"
              value={alertPhone}
              onChange={(event) => setAlertPhone(event.target.value)}
              placeholder="5511999999999"
            />
          </div>

          <Button disabled={loading} onClick={save}>
            <Save className="h-4 w-4" />
            Salvar configuracoes
          </Button>
        </div>

        <div className="space-y-4 rounded-md border p-4">
          <div className="space-y-2">
            <Label htmlFor="testPhone">Numero para teste</Label>
            <Input
              id="testPhone"
              value={testPhone}
              onChange={(event) => setTestPhone(event.target.value)}
              placeholder="5511999999999"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="testMessage">Mensagem de teste</Label>
            <textarea
              id="testMessage"
              value={testMessage}
              onChange={(event) => setTestMessage(event.target.value)}
              maxLength={1000}
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <Button
            variant="outline"
            disabled={loading || !testPhone.trim() || !testMessage.trim()}
            onClick={sendTest}
          >
            <Send className="h-4 w-4" />
            Enviar teste
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
