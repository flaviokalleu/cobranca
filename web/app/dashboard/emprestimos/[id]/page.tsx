'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import { PageHeader } from '@/components/page-header';
import { API_URL, api, getToken } from '@/lib/http-client';
import { Download, Receipt, RotateCcw } from 'lucide-react';

interface LoanInstallment {
  id: string;
  number: number;
  principalCents: number;
  interestCents: number;
  totalCents: number;
  dueAt: string;
  paidAt?: string | null;
  paidAmountCents?: number | null;
  status: string;
}

interface Loan {
  id: string;
  principalCents: number;
  totalCents: number;
  cetPercent: number;
  interestRate: number;
  interestType: string;
  installments: number;
  status: string;
  customer: { name: string; document?: string | null; phone?: string | null };
  installmentsList: LoanInstallment[];
}

const money = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '-');

export default function EmprestimoDetalhePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [loan, setLoan] = useState<Loan | null>(null);
  const [quote, setQuote] = useState<{
    balanceCents: number;
    discountCents: number;
    overdueFeesCents: number;
    payoffAmountCents: number;
  } | null>(null);

  async function load() {
    const { status, data } = await api<Loan>('GET', `/loans/${id}`);
    if (status >= 300) {
      toast.error('Emprestimo nao encontrado.');
      return;
    }
    setLoan(data);
  }

  useEffect(() => {
    void load();
  }, [id]);

  const totals = useMemo(() => {
    if (!loan) return { paid: 0, pending: 0 };
    return loan.installmentsList.reduce(
      (acc, item) => {
        if (item.status === 'PAID') acc.paid += item.paidAmountCents ?? item.totalCents;
        else acc.pending += item.totalCents;
        return acc;
      },
      { paid: 0, pending: 0 },
    );
  }, [loan]);

  async function downloadContract() {
    const token = getToken();
    const res = await fetch(`${API_URL}/loans/${id}/contract/pdf`, {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) {
      toast.error('Nao foi possivel baixar o contrato.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `contrato-${id}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function activate() {
    const { status } = await api('POST', `/loans/${id}/activate`);
    if (status >= 300) toast.error('Nao foi possivel ativar.');
    else {
      toast.success('Emprestimo ativado');
      await load();
    }
  }

  async function fetchQuote() {
    const { status, data } = await api<typeof quote>('GET', `/loans/${id}/payoff-quote`);
    if (status >= 300 || !data) toast.error('Nao foi possivel cotar quitacao.');
    else setQuote(data);
  }

  async function payoff() {
    if (!quote && !window.confirm('Gerar quitacao antecipada agora?')) return;
    const { status } = await api('POST', `/loans/${id}/payoff`);
    if (status >= 300) toast.error('Nao foi possivel quitar.');
    else {
      toast.success('Emprestimo quitado');
      setQuote(null);
      await load();
    }
  }

  async function payInstallment(item: LoanInstallment) {
    const value = window.prompt('Valor recebido em centavos', String(item.totalCents));
    if (!value) return;
    const { status } = await api('POST', `/loans/${id}/installments/${item.id}/pay`, {
      amountCents: Number(value),
    });
    if (status >= 300) toast.error('Nao foi possivel registrar pagamento.');
    else {
      toast.success('Pagamento registrado');
      await load();
    }
  }

  if (!loan) return <PageHeader title="Emprestimo" description="Carregando..." />;

  return (
    <>
      <PageHeader
        title={loan.customer.name}
        description={`Emprestimo ${loan.id}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {loan.status === 'PENDING_SIGNATURE' && (
              <Button onClick={() => void activate()}>
                <RotateCcw className="h-4 w-4" />
                Ativar
              </Button>
            )}
            <Button variant="outline" onClick={() => void fetchQuote()}>
              <Receipt className="h-4 w-4" />
              Cotar quitacao
            </Button>
            <Button variant="outline" onClick={() => void downloadContract()}>
              <Download className="h-4 w-4" />
              Contrato
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 p-6 lg:grid-cols-[320px_1fr]">
        <div className="grid gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex justify-between"><span>Status</span><Badge>{loan.status}</Badge></div>
              <div className="flex justify-between"><span>Principal</span><strong>{money(loan.principalCents)}</strong></div>
              <div className="flex justify-between"><span>Total</span><strong>{money(loan.totalCents)}</strong></div>
              <div className="flex justify-between"><span>CET</span><strong>{loan.cetPercent.toFixed(2)}%</strong></div>
              <div className="flex justify-between"><span>Recebido</span><strong>{money(totals.paid)}</strong></div>
              <div className="flex justify-between"><span>Pendente</span><strong>{money(totals.pending)}</strong></div>
            </CardContent>
          </Card>
          {quote && (
            <Card>
              <CardHeader><CardTitle className="text-base">Quitacao</CardTitle></CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div className="flex justify-between"><span>Saldo</span><strong>{money(quote.balanceCents)}</strong></div>
                <div className="flex justify-between"><span>Desconto juros futuros</span><strong>{money(quote.discountCents)}</strong></div>
                <div className="flex justify-between"><span>Mora</span><strong>{money(quote.overdueFeesCents)}</strong></div>
                <div className="flex justify-between text-base"><span>Total</span><strong>{money(quote.payoffAmountCents)}</strong></div>
                <Button onClick={() => void payoff()}>Registrar quitacao</Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Juros</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pago em</TableHead>
                <TableHead className="text-right">Acao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loan.installmentsList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.number}</TableCell>
                  <TableCell>{date(item.dueAt)}</TableCell>
                  <TableCell>{money(item.principalCents)}</TableCell>
                  <TableCell>{money(item.interestCents)}</TableCell>
                  <TableCell>{money(item.totalCents)}</TableCell>
                  <TableCell><Badge variant={item.status === 'PAID' ? 'success' : item.status === 'OVERDUE' ? 'destructive' : 'secondary'}>{item.status}</Badge></TableCell>
                  <TableCell>{date(item.paidAt)}</TableCell>
                  <TableCell className="text-right">
                    {item.status !== 'PAID' && (
                      <Button size="sm" variant="outline" onClick={() => void payInstallment(item)}>
                        Registrar pagamento
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

