'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Copy, FileText, MessageCircle, QrCode, RefreshCw, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ChargeDetail {
  id: string;
  description: string;
  amountCents: number;
  paidAmountCents?: number | null;
  dueDate: string;
  status: string;
  publicToken?: string | null;
  customer: { id: string; name: string; phone?: string | null; whatsapp?: string | null; email?: string | null };
  nfe?: { id: string; status: string; pdfUrl?: string | null; externalId?: string | null } | null;
  ledger: Array<{ id: string; accountCode: string; direction: string; amountCents: number; description: string; createdAt: string }>;
  calendar: Array<{ id: string; title: string; startsAt: string; status: string }>;
}

interface PixResponse {
  pixCopyPaste: string;
  amountCents: number;
  interestCents: number;
}

interface Subscription {
  planCode?: string;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CobrancaDetalhePage({ params }: { params: { id: string } }) {
  const [charge, setCharge] = useState<ChargeDetail | null>(null);
  const [pix, setPix] = useState<PixResponse | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [plan, setPlan] = useState('FREE');
  const premium = useMemo(() => ['PRO', 'BUSINESS'].includes(plan), [plan]);

  async function load() {
    const [chargeRes, subscriptionRes] = await Promise.all([
      api<ChargeDetail>('GET', `/charges/${params.id}`),
      api<Subscription>('GET', '/subscription'),
    ]);
    if (chargeRes.status < 400) setCharge(chargeRes.data);
    if (subscriptionRes.status < 400) setPlan(subscriptionRes.data.planCode ?? 'FREE');
  }

  useEffect(() => {
    void load();
  }, [params.id]);

  async function loadPix() {
    const res = await api<PixResponse>('GET', `/charges/${params.id}/pix`);
    if (res.status < 400) setPix(res.data);
    else toast.error('Nao foi possivel gerar PIX');
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  }

  async function sendPixWhatsapp() {
    const res = await api('POST', `/charges/${params.id}/send-pix-whatsapp`);
    if (res.status < 400) toast.success('PIX enviado pelo WhatsApp');
    else toast.error('Nao foi possivel enviar pelo WhatsApp');
  }

  async function createPortalLink() {
    const res = await api<{ url: string }>('POST', `/charges/${params.id}/portal-link`);
    if (res.status < 400) {
      const url = `${window.location.origin}${res.data.url}`;
      setPortalUrl(url);
      await copy(url, 'Link do portal');
    } else {
      toast.error('Nao foi possivel gerar link do portal');
    }
  }

  async function emitNfe() {
    const res = await api('POST', `/nfe/charges/${params.id}/emit`);
    if (res.status < 400) {
      toast.success('NF-e/NFS-e emitida em modo configurado');
      await load();
    } else {
      toast.error('Nao foi possivel emitir NF-e/NFS-e');
    }
  }

  if (!charge) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const paymentLink = charge.publicToken && origin ? `${origin}/pagar/${charge.publicToken}` : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold">{charge.description}</h1>
            <p className="text-xs text-muted-foreground">
              <Link href={`/dashboard/clientes/${charge.customer.id}`} className="underline">
                {charge.customer.name}
              </Link>{' '}
              | {charge.status}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadPix()}>
              <QrCode className="h-4 w-4" />
              PIX
            </Button>
            <Button variant="outline" onClick={() => void sendPixWhatsapp()}>
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button variant="outline" onClick={() => void createPortalLink()}>
              <Send className="h-4 w-4" />
              Portal
            </Button>
            <Button onClick={() => void emitNfe()}>
              <FileText className="h-4 w-4" />
              {charge.nfe ? 'Ver NF' : 'Emitir NF'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Valor principal</p>
              <p className="text-xl font-bold">{brl(charge.amountCents)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Valor pago</p>
              <p className="text-xl font-bold">{charge.paidAmountCents ? brl(charge.paidAmountCents) : '-'}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground">Vencimento</p>
              <p className="text-xl font-bold">{new Date(charge.dueDate).toLocaleDateString('pt-BR')}</p>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Direcao</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charge.ledger.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.accountCode}</TableCell>
                    <TableCell>{entry.direction}</TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right">{brl(entry.amountCents)}</TableCell>
                  </TableRow>
                ))}
                {charge.ledger.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Sem eventos de ledger.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-semibold">PIX e links</h2>
            <div className="mt-3 space-y-2">
              {paymentLink && (
                <Button variant="outline" className="w-full justify-start" onClick={() => void copy(paymentLink, 'Link publico')}>
                  <Copy className="h-4 w-4" />
                  Copiar link publico
                </Button>
              )}
              {portalUrl && (
                <Button variant="outline" className="w-full justify-start" onClick={() => void copy(portalUrl, 'Link do portal')}>
                  <Copy className="h-4 w-4" />
                  Copiar portal
                </Button>
              )}
              {pix && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Valor PIX {brl(pix.amountCents)} | juros {brl(pix.interestCents)}
                  </p>
                  <textarea readOnly value={pix.pixCopyPaste} className="h-28 w-full rounded-md border bg-muted p-2 text-xs" />
                  <Button className="w-full" onClick={() => void copy(pix.pixCopyPaste, 'PIX')}>
                    <Copy className="h-4 w-4" />
                    Copiar PIX
                  </Button>
                </>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold">NF-e/NFS-e</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {charge.nfe ? `Status: ${charge.nfe.status}` : 'Ainda nao emitida.'}
            </p>
            {charge.nfe?.pdfUrl && (
              <a className="mt-3 inline-flex text-sm font-semibold text-primary underline" href={charge.nfe.pdfUrl}>
                Abrir PDF
              </a>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold">QR Code automatico</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Regra premium padrao: PRO ou BUSINESS.
            </p>
            <Button disabled={!premium} variant="outline" className="mt-3 w-full">
              <QrCode className="h-4 w-4" />
              {premium ? 'Gerar QR automatico' : 'Disponivel no PRO'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

