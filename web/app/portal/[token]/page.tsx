'use client';

import { useEffect, useState } from 'react';
import { Copy, QrCode, RefreshCw, FileText, CreditCard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { API_URL } from '@/lib/http-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PortalCharge {
  id: string;
  description: string;
  amountCents: number;
  paidAmountCents?: number | null;
  dueDate: string;
  paidAt?: string | null;
  status: string;
  paymentLink?: string | null;
  bankSlipUrl?: string | null;
  gatewayProvider?: string | null;
  gatewayChargeId?: string | null;
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

interface AsaasPixResponse {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export default function PortalPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pixByCharge, setPixByCharge] = useState<Record<string, PixResponse>>({});
  const [asaasPixByCharge, setAsaasPixByCharge] = useState<Record<string, AsaasPixResponse>>({});
  const [loadingPix, setLoadingPix] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void fetch(`${API_URL}/portal/${params.token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((payload: PortalData) => setData(payload))
      .catch(() => toast.error('Portal indisponível ou link expirado'))
      .finally(() => setLoading(false));
  }, [params.token]);

  async function loadPixLocal(chargeId: string) {
    setLoadingPix((s) => ({ ...s, [chargeId]: true }));
    try {
      const res = await fetch(`${API_URL}/portal/${params.token}/charges/${chargeId}/pix`, {
        method: 'POST',
      });
      if (!res.ok) { toast.error('Não foi possível gerar o PIX'); return; }
      const pix = (await res.json()) as PixResponse;
      setPixByCharge((s) => ({ ...s, [chargeId]: pix }));
    } finally {
      setLoadingPix((s) => ({ ...s, [chargeId]: false }));
    }
  }

  async function loadAsaasPix(chargeId: string) {
    setLoadingPix((s) => ({ ...s, [`asaas_${chargeId}`]: true }));
    try {
      const res = await fetch(`${API_URL}/portal/${params.token}/charges/${chargeId}/asaas-pix`);
      if (!res.ok) { toast.error('Não foi possível gerar o QR Code'); return; }
      const qr = (await res.json()) as AsaasPixResponse;
      setAsaasPixByCharge((s) => ({ ...s, [chargeId]: qr }));
    } finally {
      setLoadingPix((s) => ({ ...s, [`asaas_${chargeId}`]: false }));
    }
  }

  async function copyText(value: string, label = 'PIX copiado') {
    await navigator.clipboard.writeText(value);
    toast.success(label);
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
        Link do portal inválido ou expirado.
      </div>
    );
  }

  const company = data.settings?.companyName ?? data.settings?.merchantName ?? 'WEBBA ERP';

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-lg space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {data.settings?.logoUrl && (
            <Image
              src={data.settings.logoUrl}
              alt={company}
              width={40}
              height={40}
              className="rounded-lg object-contain"
            />
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{company}</p>
            <h1 className="mt-0.5 text-2xl font-bold">Olá, {data.customer.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Suas cobranças e formas de pagamento.</p>
          </div>
        </div>

        {/* Cobranças */}
        {data.charges.map((charge) => {
          const pix = pixByCharge[charge.id];
          const asaasPix = asaasPixByCharge[charge.id];
          const paid = charge.status === 'PAID';
          const hasAsaas = charge.gatewayProvider === 'ASAAS' && !!charge.gatewayChargeId;

          return (
            <Card key={charge.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{charge.description}</h2>
                  <p className="text-xs text-muted-foreground">
                    Vencimento {fmtDate(charge.dueDate)}
                  </p>
                </div>
                <Badge variant={paid ? 'default' : 'secondary'} className={paid ? 'bg-emerald-600' : 'bg-amber-500 text-white'}>
                  {paid ? 'Pago' : 'Pendente'}
                </Badge>
              </div>

              <p className="mt-3 text-2xl font-bold">{brl(charge.paidAmountCents ?? charge.amountCents)}</p>

              {paid && charge.paidAt && (
                <p className="mt-1 text-xs text-emerald-600">Pago em {fmtDate(charge.paidAt)}</p>
              )}

              {!paid && (
                <div className="mt-4 space-y-2">
                  {/* Botão: Pagar Online (invoiceUrl Asaas — boleto + PIX + cartão) */}
                  {charge.paymentLink && (
                    <a href={charge.paymentLink} target="_blank" rel="noreferrer" className="block">
                      <Button className="w-full gap-2">
                        <CreditCard className="h-4 w-4" />
                        Pagar Online (Boleto / PIX / Cartão)
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </a>
                  )}

                  {/* Botão: Baixar Boleto */}
                  {charge.bankSlipUrl && (
                    <a href={charge.bankSlipUrl} target="_blank" rel="noreferrer" className="block">
                      <Button variant="outline" className="w-full gap-2">
                        <FileText className="h-4 w-4" />
                        Baixar Boleto
                      </Button>
                    </a>
                  )}

                  {/* QR Code PIX via Asaas */}
                  {hasAsaas && !asaasPix && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      disabled={loadingPix[`asaas_${charge.id}`]}
                      onClick={() => void loadAsaasPix(charge.id)}
                    >
                      <QrCode className="h-4 w-4" />
                      {loadingPix[`asaas_${charge.id}`] ? 'Gerando...' : 'Ver QR Code PIX'}
                    </Button>
                  )}

                  {hasAsaas && asaasPix && (
                    <div className="space-y-2 rounded-lg border p-3">
                      <p className="text-center text-xs font-medium text-muted-foreground">Escaneie o QR Code para pagar</p>
                      <div className="flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`data:image/png;base64,${asaasPix.encodedImage}`}
                          alt="QR Code PIX"
                          className="h-48 w-48"
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => void copyText(asaasPix.payload, 'PIX copia-e-cola copiado')}
                      >
                        <Copy className="h-3 w-3" />
                        Copiar código PIX
                      </Button>
                    </div>
                  )}

                  {/* PIX local (sem Asaas) */}
                  {!hasAsaas && !charge.paymentLink && (
                    <>
                      {!pix ? (
                        <Button
                          className="w-full gap-2"
                          disabled={loadingPix[charge.id]}
                          onClick={() => void loadPixLocal(charge.id)}
                        >
                          <QrCode className="h-4 w-4" />
                          {loadingPix[charge.id] ? 'Gerando...' : 'Gerar PIX'}
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            readOnly
                            value={pix.pixCopyPaste}
                            className="h-28 w-full resize-none rounded-md border bg-muted p-3 text-xs"
                          />
                          <Button className="w-full gap-2" onClick={() => void copyText(pix.pixCopyPaste)}>
                            <Copy className="h-4 w-4" />
                            Copiar PIX
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {data.charges.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma cobrança encontrada para este portal.
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">Powered by WEBBA ERP</p>
      </div>
    </main>
  );
}
