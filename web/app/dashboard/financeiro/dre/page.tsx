'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSummary } from '@/store/financeSlice';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function DrePage() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);
  const summary = useAppSelector((s) => s.finance.summary);

  useEffect(() => {
    if (role === 'ADMIN') void dispatch(fetchSummary());
  }, [role, dispatch]);

  if (role !== 'ADMIN') {
    return (
      <>
        <PageHeader title="DRE" />
        <div className="p-6">
          <Card className="p-6 text-sm text-muted-foreground">
            Acesso restrito a administradores.
          </Card>
        </div>
      </>
    );
  }

  const s = summary ?? {
    revenueCents: 0,
    expenseCents: 0,
    resultCents: 0,
    cashCents: 0,
    aReceberCents: 0,
    aPagarCents: 0,
  };

  return (
    <>
      <PageHeader title="DRE" description="Resultado e posição financeira" />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Receita" value={brl(s.revenueCents)} icon={TrendingUp} accent="green" />
          <StatCard label="Despesa" value={brl(s.expenseCents)} icon={TrendingDown} accent="red" />
          <StatCard
            label="Resultado"
            value={brl(s.resultCents)}
            hint={s.resultCents >= 0 ? 'lucro' : 'prejuízo'}
            icon={Scale}
            accent={s.resultCents >= 0 ? 'green' : 'red'}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Em caixa" value={brl(s.cashCents)} icon={Wallet} accent="indigo" />
          <StatCard label="A receber" value={brl(s.aReceberCents)} icon={ArrowDownCircle} accent="indigo" />
          <StatCard label="A pagar" value={brl(s.aPagarCents)} icon={ArrowUpCircle} accent="slate" />
        </div>
      </div>
    </>
  );
}
