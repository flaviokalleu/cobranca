'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPayables } from '@/store/financeSlice';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  BadgeDollarSign,
  AlertTriangle,
  Users,
  Banknote,
  Plus,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const isOverdue = (c: { status: string; dueDate: string }) =>
  c.status === 'PENDING' && new Date(c.dueDate).getTime() < Date.now();

export default function PainelPage() {
  const dispatch = useAppDispatch();
  const { customers, charges } = useAppSelector((s) => s.data);
  const { payables } = useAppSelector((s) => s.finance);

  useEffect(() => {
    void dispatch(fetchPayables());
  }, [dispatch]);

  const kpis = useMemo(() => {
    const pending = charges.filter((c) => c.status === 'PENDING');
    const aReceber = pending.reduce((s, c) => s + c.amountCents, 0);
    const recebido = charges
      .filter((c) => c.status === 'PAID')
      .reduce((s, c) => s + c.amountCents, 0);
    const vencidas = pending.filter((c) => isOverdue(c)).length;
    const aPagar = payables
      .filter((p) => p.status === 'PENDING')
      .reduce((s, p) => s + p.amountCents, 0);
    const total = aReceber + recebido;
    const pctRecebido = total > 0 ? Math.round((recebido / total) * 100) : 0;
    return { aReceber, recebido, vencidas, aPagar, pctRecebido };
  }, [charges, payables]);

  const chartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        mes: d.toLocaleDateString('pt-BR', { month: 'short' }),
        total: 0,
      };
    });
    for (const c of charges) {
      if (c.status === 'PAID' && c.paidAt) {
        const d = new Date(c.paidAt);
        const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
        if (m) m.total += c.amountCents / 100;
      }
    }
    return months;
  }, [charges]);

  const recentes = charges.slice(0, 5);

  return (
    <>
      <PageHeader
        title="Painel"
        description="Visão geral das suas cobranças"
        actions={
          <Button asChild>
            <Link href="/dashboard/cobrancas">
              <Plus className="h-4 w-4" />
              Nova cobrança
            </Link>
          </Button>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="A receber" value={brl(kpis.aReceber)} icon={Wallet} accent="indigo" />
          <StatCard label="A pagar" value={brl(kpis.aPagar)} icon={Banknote} accent="red" />
          <StatCard label="Recebido" value={brl(kpis.recebido)} icon={BadgeDollarSign} accent="green" />
          <StatCard
            label="Vencidas"
            value={String(kpis.vencidas)}
            hint="cobranças em atraso"
            icon={AlertTriangle}
            accent="red"
          />
          <StatCard label="Clientes" value={String(customers.length)} icon={Users} accent="slate" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recebíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Já recebido</span>
              <span className="font-medium">{kpis.pctRecebido}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${kpis.pctRecebido}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {brl(kpis.recebido)} recebido de {brl(kpis.aReceber + kpis.recebido)} no total.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recebido por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214 31% 91%)" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                  <Tooltip
                    formatter={(value) => [brl(Math.round(Number(value) * 100)), 'Recebido']}
                  />
                  <Bar dataKey="total" fill="hsl(243 75% 59%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Cobranças recentes</CardTitle>
            <Link
              href="/dashboard/cobrancas"
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-6 font-medium">{c.description}</TableCell>
                    <TableCell>{brl(c.amountCents)}</TableCell>
                    <TableCell>{fmtDate(c.dueDate)}</TableCell>
                    <TableCell className="pr-6">
                      {c.status === 'PAID' ? (
                        <Badge variant="success">Pago</Badge>
                      ) : isOverdue(c) ? (
                        <Badge variant="destructive">Vencida</Badge>
                      ) : (
                        <Badge variant="warning">Pendente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {recentes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      Nenhuma cobrança ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
