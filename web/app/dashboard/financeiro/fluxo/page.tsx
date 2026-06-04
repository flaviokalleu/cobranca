'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCashflow } from '@/store/financeSlice';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2 } from 'lucide-react';

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
      <PageHeader title="Fluxo de caixa" description="Entradas e saidas do caixa" />
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
                <TableHead>Descricao</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Saida</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="w-[96px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashflow.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {fmt(row.date)}
                  </TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {row.inCents ? brl(row.inCents) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-rose-600">
                    {row.outCents ? brl(row.outCents) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {brl(row.balanceCents)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Relatorio derivado; edite a origem"
                        disabled
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Relatorio derivado; exclua pela origem"
                        disabled
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {cashflow.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    Sem movimentacoes de caixa ainda.
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
