'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCashflow } from '@/store/financeSlice';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (iso: string) => new Date(iso).toLocaleString('pt-BR');

export default function FluxoCaixaPage() {
  const dispatch = useAppDispatch();
  const { cashflow } = useAppSelector((s) => s.finance);

  useEffect(() => {
    void dispatch(fetchCashflow());
  }, [dispatch]);

  return (
    <>
      <PageHeader title="Fluxo de caixa" description="Entradas e saídas do caixa" />
      <div className="space-y-6 p-6">
        <Card className="max-w-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo em caixa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{brl(cashflow.balanceCents)}</p>
          </CardContent>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Saída</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashflow.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {fmt(r.date)}
                  </TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {r.inCents ? brl(r.inCents) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-rose-600">
                    {r.outCents ? brl(r.outCents) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {brl(r.balanceCents)}
                  </TableCell>
                </TableRow>
              ))}
              {cashflow.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    Sem movimentações de caixa ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}
