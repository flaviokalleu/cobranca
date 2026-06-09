'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { asArray } from '@/lib/pagination';
import { Calculator, Download, FileText, Play, Plus } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  document?: string | null;
  phone?: string | null;
}

interface LoanInstallment {
  id: string;
  number: number;
  totalCents: number;
  principalCents: number;
  interestCents: number;
  dueAt: string;
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
  firstDueAt: string;
  contractUrl?: string | null;
  customer: Customer;
  installmentsList: LoanInstallment[];
}

interface Simulation {
  installmentAmount: number;
  totalAmount: number;
  totalInterest: number;
  cetPercent: number;
  schedule: Array<{
    number: number;
    dueAt: string;
    principalCents: number;
    interestCents: number;
    totalCents: number;
    balanceCents: number;
  }>;
}

const statusVariant: Record<string, 'secondary' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'secondary',
  PENDING_SIGNATURE: 'warning',
  ACTIVE: 'success',
  PAID: 'secondary',
  DEFAULTED: 'destructive',
  CANCELED: 'secondary',
};

const money = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const date = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

const tomorrow = () => {
  const value = new Date();
  value.setDate(value.getDate() + 30);
  return value.toISOString().slice(0, 10);
};

export default function EmprestimosPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [principal, setPrincipal] = useState('1000');
  const [installments, setInstallments] = useState('12');
  const [interestType, setInterestType] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [interestRate, setInterestRate] = useState('2.5');
  const [firstDueAt, setFirstDueAt] = useState(tomorrow);
  const [simulation, setSimulation] = useState<Simulation | null>(null);

  async function load() {
    const [loansRes, customersRes] = await Promise.all([
      api('GET', '/loans?limit=100'),
      api('GET', '/customers?limit=100'),
    ]);
    setLoans(asArray<Loan>(loansRes.data));
    setCustomers(asArray<Customer>(customersRes.data));
  }

  useEffect(() => {
    void load();
  }, []);

  const kpis = useMemo(() => {
    const active = loans.filter((loan) => loan.status === 'ACTIVE');
    const activePortfolio = active.reduce((sum, loan) => sum + loan.principalCents, 0);
    const receivable = active.reduce(
      (sum, loan) =>
        sum +
        loan.installmentsList
          .filter((item) => item.status !== 'PAID')
          .reduce((subtotal, item) => subtotal + item.totalCents, 0),
      0,
    );
    const overdue = loans.reduce(
      (sum, loan) =>
        sum +
        loan.installmentsList
          .filter((item) => item.status === 'OVERDUE')
          .reduce((subtotal, item) => subtotal + item.totalCents, 0),
      0,
    );
    const paid = loans.filter((loan) => loan.status === 'PAID').length;
    return { activePortfolio, receivable, overdue, paid };
  }, [loans]);

  const payload = () => ({
    customerId,
    principalCents: Math.round(Number(principal.replace(',', '.')) * 100),
    installments: Number(installments),
    interestType,
    monthlyInterestRate: interestType === 'MONTHLY' ? Number(interestRate.replace(',', '.')) : undefined,
    yearlyInterestRate: interestType === 'YEARLY' ? Number(interestRate.replace(',', '.')) : undefined,
    firstDueAt,
  });

  async function simulate() {
    const { status, data } = await api<Simulation>('POST', '/loans/simulate', payload());
    if (status >= 300) {
      toast.error('Nao foi possivel simular este emprestimo.');
      return;
    }
    setSimulation(data);
  }

  async function createLoan() {
    if (!customerId) {
      toast.error('Selecione um cliente.');
      return;
    }
    const { status } = await api('POST', '/loans', payload());
    if (status >= 300) {
      toast.error('Nao foi possivel criar o emprestimo.');
      return;
    }
    toast.success('Emprestimo criado');
    setSimulation(null);
    await load();
  }

  async function activateLoan(id: string) {
    const { status } = await api('POST', `/loans/${id}/activate`);
    if (status >= 300) {
      toast.error('Nao foi possivel ativar.');
      return;
    }
    toast.success('Emprestimo ativado e parcelas geradas');
    await load();
  }

  async function downloadContract(id: string) {
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

  return (
    <>
      <PageHeader
        title="Emprestimos"
        description="Controle emprestimos, parcelas, contrato e quitacao."
      />
      <div className="grid gap-4 p-4 md:p-6">
        <div className="grid gap-3 md:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-sm">Carteira ativa</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{money(kpis.activePortfolio)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">A receber</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{money(kpis.receivable)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Em atraso</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{money(kpis.overdue)}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm">Quitados</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{kpis.paid}</CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simulador</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Esta plataforma nao substitui autorizacao regulatoria. Antes de operar credito em escala, valide regras civis, CET, contrato e cobranca com suporte juridico.
            </div>
            <div className="grid gap-3 md:grid-cols-6">
              <div className="grid gap-1.5 md:col-span-2">
                <Label>Cliente</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Valor</Label>
                <Input value={principal} onChange={(event) => setPrincipal(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Parcelas</Label>
                <Input type="number" min={1} max={60} value={installments} onChange={(event) => setInstallments(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Juros</Label>
                <Input value={interestRate} onChange={(event) => setInterestRate(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select value={interestType} onValueChange={(value) => setInterestType(value as 'MONTHLY' | 'YEARLY')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Ao mes</SelectItem>
                    <SelectItem value="YEARLY">Ao ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Primeira parcela</Label>
                <Input type="date" value={firstDueAt} onChange={(event) => setFirstDueAt(event.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={simulate}>
                <Calculator className="h-4 w-4" />
                Simular
              </Button>
              <Button type="button" onClick={createLoan}>
                <Plus className="h-4 w-4" />
                Gerar contrato
              </Button>
            </div>
            {simulation && (
              <div className="grid gap-3 md:grid-cols-[240px_1fr]">
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Parcela fixa</p>
                  <p className="text-xl font-semibold">{money(simulation.installmentAmount)}</p>
                  <p className="mt-3 text-sm text-muted-foreground">Total</p>
                  <p className="font-semibold">{money(simulation.totalAmount)}</p>
                  <p className="mt-3 text-sm text-muted-foreground">CET anual</p>
                  <p className="font-semibold">{simulation.cetPercent.toFixed(2)}%</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>Juros</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {simulation.schedule.slice(0, 8).map((row) => (
                      <TableRow key={row.number}>
                        <TableCell>{row.number}</TableCell>
                        <TableCell>{date(row.dueAt)}</TableCell>
                        <TableCell>{money(row.principalCents)}</TableCell>
                        <TableCell>{money(row.interestCents)}</TableCell>
                        <TableCell>{money(row.totalCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Parcelas</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell>{loan.customer.name}</TableCell>
                  <TableCell>{money(loan.principalCents)}</TableCell>
                  <TableCell>{loan.installments}x de {money(loan.installmentsList[0]?.totalCents ?? 0)}</TableCell>
                  <TableCell>{loan.interestRate}% {loan.interestType === 'MONTHLY' ? 'a.m.' : 'a.a.'}</TableCell>
                  <TableCell><Badge variant={statusVariant[loan.status] ?? 'secondary'}>{loan.status}</Badge></TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon" title="Detalhes">
                      <Link href={`/dashboard/emprestimos/${loan.id}`}><FileText className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Contrato PDF" onClick={() => void downloadContract(loan.id)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    {loan.status === 'PENDING_SIGNATURE' && (
                      <Button variant="ghost" size="icon" title="Ativar" onClick={() => void activateLoan(loan.id)}>
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {loans.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Nenhum emprestimo cadastrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

