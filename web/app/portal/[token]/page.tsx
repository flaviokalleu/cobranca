'use client';

import { useEffect, useState } from 'react';
import { Copy, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/lib/http-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface PortalCharge {
  id: string;
  description: string;
  amountCents: number;
  paidAmountCents?: number | null;
  dueDate: string;
  paidAt?: string | null;
  status: string;
}

interface PortalData {
  customer: { name: string; email?: string | null; phone?: string | null };
  settings?: { merchantName?: string | null; companyName?: string | null; logoUrl?: string | null };
  charges: PortalCharge[];
}

interface PixResponse {
  pixCopyPaste: string;
  amountCents: number;
  interestCents: number;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PortalPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pixByCharge, setPixByCharge] = useState<Record<string, PixResponse>>({});

  useEffect(() => {
    void fetch(`${API_URL}/portal/${params.token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((payload: PortalData) => setData(payload))
      .catch(() => toast.error('Portal indisponivel ou link expirado'))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function loadPix(chargeId: string) {
    const response = await fetch(`${API_URL}/portal/${params.token}/charges/${chargeId}/pix`, {
      method: 'POST',
    });
    if (!response.ok) {
      toast.error('Nao foi possivel gerar o PIX');
      return;
    }
    const pix = (await response.json()) as PixResponse;
    setPixByCharge((current) => ({ ...current, [chargeId]: pix }));
  }

  async function copyPix(value: string) {
    await navigator.clipboard.writeText(value);
    toast.success('PIX copiado');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center text-sm text-muted-foreground">
        Link do portal invalido ou expirado.
      </div>
    );
  }

  const company = data.settings?.companyName ?? data.settings?.merchantName ?? 'WEBBA ERP';

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{company}</p>
          <h1 className="mt-1 text-2xl font-bold">Ola, {data.customer.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Suas cobrancas e PIX ficam nesta pagina.</p>
        </div>

        {data.charges.map((charge) => {
          const pix = pixByCharge[charge.id];
          const paid = charge.status === 'PAID';
          return (
            <Card key={charge.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{charge.description}</h2>
                  <p className="text-xs text-muted-foreground">
                    Vencimento {new Date(charge.dueDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className={paid ? 'text-sm font-semibold text-emerald-600' : 'text-sm font-semibold text-amber-600'}>
                  {paid ? 'Pago' : 'Pendente'}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold">{brl(charge.paidAmountCents ?? charge.amountCents)}</p>
              {!paid && (
                <div className="mt-4 space-y-3">
                  {!pix ? (
                    <Button className="w-full" onClick={() => void loadPix(charge.id)}>
                      <QrCode className="h-4 w-4" />
                      Gerar PIX
                    </Button>
                  ) : (
                    <>
                      <textarea
                        readOnly
                        value={pix.pixCopyPaste}
                        className="h-28 w-full resize-none rounded-md border bg-muted p-3 text-xs"
                      />
                      <Button className="w-full" onClick={() => void copyPix(pix.pixCopyPaste)}>
                        <Copy className="h-4 w-4" />
                        Copiar PIX
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {data.charges.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma cobranca encontrada para este portal.
          </Card>
        )}
      </div>
    </main>
  );
}
