'use client';

import { useEffect, useState } from 'react';
import { API_URL } from '@/lib/http-client';
import { CheckCircle2, Copy, Loader2, LockKeyhole, Wallet } from 'lucide-react';

interface PublicCharge {
  publicToken: string;
  customerName: string;
  description: string;
  dueDate: string;
  status: string;
  principalCents: number;
  interestCents: number;
  amountCents: number;
  pixCopyPaste: string | null;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PublicPaymentPage({ params }: { params: { token: string } }) {
  const [charge, setCharge] = useState<PublicCharge | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const response = await fetch(`${API_URL}/public/charges/${params.token}`);
      const data = response.ok ? ((await response.json()) as PublicCharge) : null;
      if (active) {
        setCharge(data);
        setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [params.token]);

  async function copyPix() {
    if (!charge?.pixCopyPaste) return;
    await navigator.clipboard.writeText(charge.pixCopyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </main>
    );
  }

  if (!charge) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-lg bg-white p-6 text-center shadow-sm">
          <LockKeyhole className="mx-auto h-8 w-8 text-gray-300" />
          <h1 className="mt-3 text-lg font-bold text-gray-900">Cobranca nao encontrada</h1>
        </div>
      </main>
    );
  }

  const paid = charge.status === 'PAID';

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto grid max-w-3xl gap-4">
        <header className="flex items-center justify-between rounded-lg bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pagamento</p>
            <h1 className="text-lg font-bold text-gray-900">{charge.customerName}</h1>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {paid ? 'Pago' : 'Pendente'}
          </span>
        </header>

        <section className="rounded-lg bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
              <Wallet className="h-5 w-5 text-red-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">{charge.description}</p>
              <p className="mt-1 text-xs text-gray-400">
                Vencimento: {new Date(charge.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </p>
              <p className="mt-5 text-3xl font-bold tracking-tight text-gray-900">
                {brl(charge.amountCents)}
              </p>
              {charge.interestCents > 0 && (
                <p className="mt-1 text-xs font-medium text-red-600">
                  Principal {brl(charge.principalCents)} + juros {brl(charge.interestCents)}
                </p>
              )}
            </div>
          </div>
        </section>

        {!paid && charge.pixCopyPaste && (
          <section className="rounded-lg bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-gray-900">PIX copia-e-cola</h2>
              <button
                onClick={() => void copyPix()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <textarea
              readOnly
              value={charge.pixCopyPaste}
              className="h-32 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600"
            />
          </section>
        )}
      </div>
    </main>
  );
}
