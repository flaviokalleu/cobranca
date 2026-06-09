'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { API_URL } from '@/lib/http-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InvitationPreview {
  email: string;
  role: string;
  companyName: string;
}

export default function ConvitePage({ params }: { params: { token: string } }) {
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    void fetch(`${API_URL}/invitations/accept/${params.token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: InvitationPreview) => setPreview(data))
      .catch(() => toast.error('Convite invalido ou expirado'));
  }, [params.token]);

  async function accept(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`${API_URL}/invitations/accept/${params.token}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      toast.error('Nao foi possivel aceitar o convite');
      return;
    }
    setAccepted(true);
    toast.success('Usuario criado');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md p-6">
        {accepted ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <h1 className="mt-4 text-xl font-bold">Acesso criado</h1>
            <p className="mt-2 text-sm text-muted-foreground">Volte para o login e entre com seu e-mail e senha.</p>
          </div>
        ) : (
          <>
            <KeyRound className="h-8 w-8 text-primary" />
            <h1 className="mt-4 text-xl font-bold">Aceitar convite</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {preview
                ? `${preview.email} foi convidado para ${preview.companyName} como ${preview.role}.`
                : 'Carregando convite...'}
            </p>
            <form onSubmit={accept} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={!preview || password.length < 6}>
                Criar meu acesso
              </Button>
            </form>
          </>
        )}
      </Card>
    </main>
  );
}
