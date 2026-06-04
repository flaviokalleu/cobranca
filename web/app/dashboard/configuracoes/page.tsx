'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSettings, saveSettings } from '@/store/dataSlice';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ConfiguracoesPage() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);
  const settings = useAppSelector((s) => s.data.settings);

  const [pixKey, setPixKey] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantCity, setMerchantCity] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (role === 'ADMIN') void dispatch(fetchSettings());
  }, [role, dispatch]);

  useEffect(() => {
    if (settings) {
      setPixKey(settings.pixKey);
      setMerchantName(settings.merchantName);
      setMerchantCity(settings.merchantCity);
    }
  }, [settings]);

  if (role !== 'ADMIN') {
    return (
      <>
        <PageHeader title="Configurações" />
        <div className="p-6">
          <Card className="p-6 text-sm text-muted-foreground">
            Acesso restrito a administradores.
          </Card>
        </div>
      </>
    );
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await dispatch(saveSettings({ pixKey, merchantName, merchantCity }));
    setSaving(false);
    if (saveSettings.fulfilled.match(res)) toast.success('Configurações salvas');
  }

  return (
    <>
      <PageHeader title="Configurações" description="Dados do recebedor PIX" />
      <div className="max-w-xl p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recebedor PIX</CardTitle>
            <CardDescription>
              Esses dados entram no copia-e-cola gerado nas cobranças.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSave} className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Chave PIX</Label>
                <Input
                  placeholder="e-mail, CPF/CNPJ, telefone ou aleatória"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Nome do recebedor (máx. 25)</Label>
                <Input
                  maxLength={25}
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Cidade (máx. 15)</Label>
                <Input
                  maxLength={15}
                  value={merchantCity}
                  onChange={(e) => setMerchantCity(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar configurações'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
