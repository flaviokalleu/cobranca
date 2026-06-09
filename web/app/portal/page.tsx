'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { API_URL } from '@/lib/http-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Company {
  name: string;
  logoUrl: string | null;
  token: string;
}

function maskCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11)
    return d.replace(/(\d{3})(\d{0,3})(\d{0,3})(\d{0,2})/, (_, a, b, c, e) =>
      [a, b, c].filter(Boolean).join('.') + (e ? `-${e}` : ''),
    );
  return d.replace(/(\d{2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})/, (_, a, b, c, dd, e) =>
    [a, b, c].filter(Boolean).join('.') + (dd ? `/${dd}` : '') + (e ? `-${e}` : ''),
  );
}

export default function PortalLoginPage() {
  const router = useRouter();
  const [doc, setDoc] = useState('');
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[] | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = doc.replace(/\D/g, '');
    if (clean.length < 11) { toast.error('Informe um CPF ou CNPJ válido'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/portal/auth/cpf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document: clean }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        toast.error(err.message ?? 'CPF/CNPJ não encontrado');
        return;
      }
      const data = (await res.json()) as { companies: Company[] };
      if (data.companies.length === 1) {
        router.push(`/portal/${data.companies[0].token}`);
      } else {
        setCompanies(data.companies);
      }
    } catch {
      toast.error('Erro ao consultar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Portal do Cliente</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulte suas cobranças, boletos e PIX
          </p>
        </div>

        {!companies ? (
          <Card className="p-6">
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="doc" className="text-sm font-medium">
                  CPF ou CNPJ
                </label>
                <Input
                  id="doc"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={doc}
                  onChange={(e) => setDoc(maskCpf(e.target.value))}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? 'Consultando...' : 'Consultar cobranças'}
              </Button>
            </form>
          </Card>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Encontramos cobranças em {companies.length} empresa{companies.length > 1 ? 's' : ''}. Selecione:
            </p>
            {companies.map((c) => (
              <button
                key={c.token}
                onClick={() => router.push(`/portal/${c.token}`)}
                className="w-full"
              >
                <Card className="flex items-center gap-3 p-4 text-left transition-colors hover:bg-accent">
                  {c.logoUrl ? (
                    <Image src={c.logoUrl} alt={c.name} width={36} height={36} className="rounded object-contain" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-primary/10 text-xs font-bold text-primary">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium">{c.name}</span>
                </Card>
              </button>
            ))}
            <button
              className="w-full text-center text-xs text-muted-foreground underline"
              onClick={() => setCompanies(null)}
            >
              Usar outro CPF
            </button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">Powered by WEBBA ERP</p>
      </div>
    </main>
  );
}
