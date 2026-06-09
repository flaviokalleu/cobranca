'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/http-client';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CustomerDetail {
  customer: {
    id: string;
    name: string;
    document?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    city?: string | null;
    stage?: string | null;
  };
  charges: Array<{ id: string; description: string; amountCents: number; status: string; dueDate: string }>;
  documents: Array<{ id: string; name: string; status: string; createdAt: string }>;
  calendar: Array<{ id: string; title: string; status: string; startsAt: string }>;
  leads: Array<{ id: string; name: string; stage: string; createdAt: string }>;
  loans: Array<{ id: string; status: string; totalCents: number; installmentsList: Array<{ status: string; totalCents: number }> }>;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ClienteDetalhePage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<CustomerDetail | null>(null);

  useEffect(() => {
    void api<CustomerDetail>('GET', `/customers/${params.id}`).then((res) => {
      if (res.status < 400) setData(res.data);
    });
  }, [params.id]);

  const totals = useMemo(() => {
    const openCharges = data?.charges.filter((charge) => charge.status === 'PENDING') ?? [];
    const openLoans =
      data?.loans.flatMap((loan) => loan.installmentsList.filter((item) => item.status !== 'PAID')) ?? [];
    return {
      receivable: openCharges.reduce((sum, charge) => sum + charge.amountCents, 0),
      loanBalance: openLoans.reduce((sum, item) => sum + item.totalCents, 0),
      paid: data?.charges.filter((charge) => charge.status === 'PAID').length ?? 0,
    };
  }, [data]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-4 py-4 sm:px-6">
        <h1 className="text-base font-bold">{data.customer.name}</h1>
        <p className="text-xs text-muted-foreground">
          {data.customer.whatsapp ?? data.customer.phone ?? 'Sem telefone'} | {data.customer.email ?? 'Sem e-mail'}
        </p>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Etapa</p>
            <p className="mt-1 font-bold">{data.customer.stage ?? 'LEAD'}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">A receber</p>
            <p className="mt-1 font-bold">{brl(totals.receivable)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Saldo emprestimos</p>
            <p className="mt-1 font-bold">{brl(totals.loanBalance)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Cobrancas pagas</p>
            <p className="mt-1 font-bold">{totals.paid}</p>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cobranca</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.charges.map((charge) => (
                  <TableRow key={charge.id}>
                    <TableCell>
                      <Link href={`/dashboard/cobrancas/${charge.id}`} className="font-medium underline">
                        {charge.description}
                      </Link>
                      <div className="text-xs text-muted-foreground">{new Date(charge.dueDate).toLocaleDateString('pt-BR')}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{charge.status}</Badge></TableCell>
                    <TableCell className="text-right">{brl(charge.amountCents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ...data.documents.map((item) => ({ id: `doc-${item.id}`, title: item.name, type: 'Documento', status: item.status })),
                  ...data.calendar.map((item) => ({ id: `cal-${item.id}`, title: item.title, type: 'Agenda', status: item.status })),
                  ...data.leads.map((item) => ({ id: `lead-${item.id}`, title: item.name, type: 'Lead', status: item.stage })),
                  ...data.loans.map((item) => ({ id: `loan-${item.id}`, title: brl(item.totalCents), type: 'Emprestimo', status: item.status })),
                ].map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}

