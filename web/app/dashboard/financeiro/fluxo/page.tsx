'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCashflow, type CashflowRow } from '@/store/financeSlice';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
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
const recurrenceLabel = (recurrence?: string | null) =>
  recurrence === 'MONTHLY' ? 'Mensal' : 'Avulsa';
const sourceLabel = (sourceType: CashflowRow['sourceType']) =>
  sourceType === 'RECEIVABLE' ? 'A receber' : 'A pagar';
const sourcePath = (sourceType: CashflowRow['sourceType']) =>
  sourceType === 'RECEIVABLE' ? '/dashboard/cobrancas' : '/dashboard/financeiro/pagar';

function StatusBadge({ status }: { status: string }) {
  if (status === 'PAID') return <Badge variant="success">Pago</Badge>;
  if (status === 'CANCELED') return <Badge variant="secondary">Cancelada</Badge>;
  return <Badge variant="warning">Pendente</Badge>;
}

export default function FluxoCaixaPage() {
  const dispatch = useAppDispatch();
  const { cashflow } = useAppSelector((state) => state.finance);

  useEffect(() => {
    void dispatch(fetchCashflow());
  }, [dispatch]);

  return (
    <>
      <PageHeader
        title="Fluxo de caixa"
        description="Entradas e saidas de contas a receber e contas a pagar"
      />
      <div className="space-y-6 p-6">
        <Card className="max-w-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo projetado
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
                <TableHead>Origem</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
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
                  <TableCell>{sourceLabel(row.sourceType)}</TableCell>
                  <TableCell className="font-medium">{row.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{row.category ?? '-'}</span>
                      <span className="text-xs text-muted-foreground">
                        {recurrenceLabel(row.recurrence)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
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
                      <Button asChild variant="ghost" size="icon" title="Editar na origem">
                        <Link href={sourcePath(row.sourceType)}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        title="Excluir na origem"
                        className="text-destructive"
                      >
                        <Link href={sourcePath(row.sourceType)}>
                          <Trash2 className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {cashflow.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    Sem entradas ou saidas ainda.
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
