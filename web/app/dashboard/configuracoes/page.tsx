'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppSelector } from '@/store/hooks';
import { api, type ApiResult } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Settings {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  companyName?: string | null;
  companyCnpj?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyState?: string | null;
  logoUrl?: string | null;
  reminderDaysBefore?: number;
  defaultDueDays?: number;
  notifyByEmail?: boolean;
  notifyByWhatsapp?: boolean;
  timezone?: string;
  nfeEnabled?: boolean;
  nfeCnpj?: string | null;
  nfeRazaoSocial?: string | null;
  nfeCodServico?: string | null;
  nfeCodMunicipio?: string | null;
  theme?: string;
}

const tabs = ['Empresa', 'PIX/Cobranca', 'Notificacoes', 'Integracoes', 'Seguranca'] as const;
type Tab = (typeof tabs)[number];

const emptySettings: Settings = {
  pixKey: '',
  merchantName: '',
  merchantCity: '',
  companyName: '',
  companyCnpj: '',
  companyPhone: '',
  companyEmail: '',
  companyAddress: '',
  companyCity: '',
  companyState: '',
  logoUrl: '',
  reminderDaysBefore: 3,
  defaultDueDays: 30,
  notifyByEmail: false,
  notifyByWhatsapp: true,
  timezone: 'America/Sao_Paulo',
  nfeEnabled: false,
  nfeCnpj: '',
  nfeRazaoSocial: '',
  nfeCodServico: '',
  nfeCodMunicipio: '',
  theme: 'system',
};

export default function ConfiguracoesPage() {
  const role = useAppSelector((state) => state.auth.role);
  const [active, setActive] = useState<Tab>('Empresa');
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [saving, setSaving] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorUrl, setTwoFactorUrl] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const [settingsRes, meRes] = await Promise.all([
        api<Settings>('GET', '/settings'),
        api<{ twoFactorEnabled: boolean }>('GET', '/auth/me'),
      ]);
      if (settingsRes.status < 400) setSettings({ ...emptySettings, ...settingsRes.data });
      if (meRes.status < 400) setTwoFactorEnabled(Boolean(meRes.data.twoFactorEnabled));
    }
    if (role === 'ADMIN') void load();
  }, [role]);

  if (role !== 'ADMIN') {
    return (
      <>
        <PageHeader title="Configuracoes" />
        <div className="p-6">
          <Card className="p-6 text-sm text-muted-foreground">Acesso restrito a administradores.</Card>
        </div>
      </>
    );
  }

  function field<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const res = await api<Settings>('PUT', '/settings', settings);
    setSaving(false);
    if (res.status < 400) {
      setSettings({ ...emptySettings, ...res.data });
      toast.success('Configuracoes salvas');
    } else {
      toast.error('Nao foi possivel salvar');
    }
  }

  async function setupTwoFactor() {
    const res: ApiResult<{ secret: string; otpauthUrl: string }> = await api('POST', '/auth/2fa/setup');
    if (res.status >= 300) {
      toast.error('Nao foi possivel gerar 2FA');
      return;
    }
    setTwoFactorSecret(res.data.secret);
    setTwoFactorUrl(res.data.otpauthUrl);
  }

  async function enableTwoFactor() {
    const res = await api<{ backupCodes: string[] }>('POST', '/auth/2fa/enable', { code: twoFactorCode });
    if (res.status >= 300) {
      toast.error('Codigo 2FA invalido');
      return;
    }
    setBackupCodes(res.data.backupCodes ?? []);
    setTwoFactorEnabled(true);
    setTwoFactorCode('');
    toast.success('2FA habilitado');
  }

  async function disableTwoFactor() {
    const res = await api('POST', '/auth/2fa/disable', { code: twoFactorCode });
    if (res.status >= 300) {
      toast.error('Codigo 2FA invalido');
      return;
    }
    setTwoFactorEnabled(false);
    setTwoFactorSecret('');
    setTwoFactorUrl('');
    setTwoFactorCode('');
    setBackupCodes([]);
    toast.success('2FA desabilitado');
  }

  return (
    <>
      <PageHeader title="Configuracoes" description="Empresa, cobranca, integracoes e seguranca" />
      <form onSubmit={save} className="space-y-4 p-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className={`rounded-md px-3 py-2 text-sm font-medium ${
                active === tab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{active}</CardTitle>
            <CardDescription>Campos salvos por tenant com auditoria.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {active === 'Empresa' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome da empresa" value={settings.companyName ?? ''} onChange={(value) => field('companyName', value)} />
                <Field label="CNPJ" value={settings.companyCnpj ?? ''} onChange={(value) => field('companyCnpj', value)} />
                <Field label="Telefone" value={settings.companyPhone ?? ''} onChange={(value) => field('companyPhone', value)} />
                <Field label="E-mail" value={settings.companyEmail ?? ''} onChange={(value) => field('companyEmail', value)} />
                <Field label="Endereco" value={settings.companyAddress ?? ''} onChange={(value) => field('companyAddress', value)} />
                <Field label="Cidade" value={settings.companyCity ?? ''} onChange={(value) => field('companyCity', value)} />
                <Field label="UF" value={settings.companyState ?? ''} onChange={(value) => field('companyState', value)} />
                <Field label="Logo URL" value={settings.logoUrl ?? ''} onChange={(value) => field('logoUrl', value)} />
              </div>
            )}

            {active === 'PIX/Cobranca' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Chave PIX" value={settings.pixKey} onChange={(value) => field('pixKey', value)} />
                <Field label="Nome recebedor" value={settings.merchantName} onChange={(value) => field('merchantName', value)} />
                <Field label="Cidade recebedor" value={settings.merchantCity} onChange={(value) => field('merchantCity', value)} />
                <NumberField label="Dias padrao vencimento" value={settings.defaultDueDays ?? 30} onChange={(value) => field('defaultDueDays', value)} />
                <NumberField label="Dias lembrete" value={settings.reminderDaysBefore ?? 3} onChange={(value) => field('reminderDaysBefore', value)} />
              </div>
            )}

            {active === 'Notificacoes' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Toggle label="E-mail" checked={Boolean(settings.notifyByEmail)} onChange={(value) => field('notifyByEmail', value)} />
                <Toggle label="WhatsApp" checked={Boolean(settings.notifyByWhatsapp)} onChange={(value) => field('notifyByWhatsapp', value)} />
                <Field label="Timezone" value={settings.timezone ?? ''} onChange={(value) => field('timezone', value)} />
              </div>
            )}

            {active === 'Integracoes' && (
              <div className="grid gap-4 md:grid-cols-2">
                <Toggle label="Emitir NF-e/NFS-e ao pagar" checked={Boolean(settings.nfeEnabled)} onChange={(value) => field('nfeEnabled', value)} />
                <Field label="Nuvem Fiscal CNPJ" value={settings.nfeCnpj ?? ''} onChange={(value) => field('nfeCnpj', value)} />
                <Field label="Razao social fiscal" value={settings.nfeRazaoSocial ?? ''} onChange={(value) => field('nfeRazaoSocial', value)} />
                <Field label="Codigo servico" value={settings.nfeCodServico ?? ''} onChange={(value) => field('nfeCodServico', value)} />
                <Field label="Codigo municipio" value={settings.nfeCodMunicipio ?? ''} onChange={(value) => field('nfeCodMunicipio', value)} />
              </div>
            )}

            {active === 'Seguranca' && (
              <div className="grid gap-4">
                <Toggle label="Tema escuro por padrao" checked={settings.theme === 'dark'} onChange={(value) => field('theme', value ? 'dark' : 'system')} />
                <div className="rounded-md bg-muted p-3 text-sm">
                  2FA: <strong>{twoFactorEnabled ? 'Ativo' : 'Inativo'}</strong>
                </div>
                {!twoFactorEnabled && !twoFactorSecret && (
                  <Button type="button" onClick={() => void setupTwoFactor()}>Gerar segredo 2FA</Button>
                )}
                {!twoFactorEnabled && twoFactorSecret && (
                  <div className="grid gap-3">
                    <Field label="Secret" readOnly value={twoFactorSecret} onChange={() => undefined} />
                    <Field label="URI otpauth" readOnly value={twoFactorUrl} onChange={() => undefined} />
                    <Field label="Codigo do app autenticador" value={twoFactorCode} onChange={setTwoFactorCode} />
                    <Button type="button" onClick={() => void enableTwoFactor()}>Habilitar 2FA</Button>
                  </div>
                )}
                {twoFactorEnabled && (
                  <div className="grid gap-3">
                    <Field label="Codigo para desabilitar" value={twoFactorCode} onChange={setTwoFactorCode} />
                    <Button type="button" variant="destructive" onClick={() => void disableTwoFactor()}>
                      Desabilitar 2FA
                    </Button>
                  </div>
                )}
                {backupCodes.length > 0 && (
                  <div className="rounded-md border p-3">
                    <p className="mb-2 text-sm font-semibold">Codigos de backup</p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                      {backupCodes.map((code) => <span key={code}>{code}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar configuracoes'}
        </Button>
      </form>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input readOnly={readOnly} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-md border p-3 text-sm">
      <span className="font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
