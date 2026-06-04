'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSummary } from '@/store/financeSlice';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil,
  Scale,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
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

  const data = summary ?? {
    revenueCents: 0,
    expenseCents: 0,
    resultCents: 0,
    cashCents: 0,
    aReceberCents: 0,
    aPagarCents: 0,
  };

  return (
    <>
      <PageHeader
        title="DRE"
        description="Resultado e posicao financeira"
        actions={
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              title="Relatorio derivado; edite a origem"
              disabled
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              title="Relatorio derivado; exclua pela origem"
              disabled
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Receita" value={brl(data.revenueCents)} icon={TrendingUp} accent="green" />
          <StatCard label="Despesa" value={brl(data.expenseCents)} icon={TrendingDown} accent="red" />
          <StatCard
            label="Resultado"
            value={brl(data.resultCents)}
            hint={data.resultCents >= 0 ? 'lucro' : 'prejuizo'}
            icon={Scale}
            accent={data.resultCents >= 0 ? 'green' : 'red'}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Em caixa" value={brl(data.cashCents)} icon={Wallet} accent="indigo" />
          <StatCard label="A receber" value={brl(data.aReceberCents)} icon={ArrowDownCircle} accent="indigo" />
          <StatCard label="A pagar" value={brl(data.aPagarCents)} icon={ArrowUpCircle} accent="slate" />
        </div>
      </div>
    </>
  );
}
