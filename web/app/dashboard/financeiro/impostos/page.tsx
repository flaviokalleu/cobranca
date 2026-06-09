'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Calculator, ClipboardCheck } from 'lucide-react';
import { api } from '@/lib/http-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TaxCalculation {
  id: string;
  regime: string;
  period: string;
  revenue12mCents: number;
  revenueMonthCents: number;
  dasCents: number;
  effectiveRateBps: number;
  createdAt: string;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const toCents = (value: string) => Math.round(Number(value || 0) * 100);

export default function ImpostosPage() {
  const [regime, setRegime] = useState('MEI');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [revenue12m, setRevenue12m] = useState('0');
  const [revenueMonth, setRevenueMonth] = useState('0');
  const [history, setHistory] = useState<TaxCalculation[]>([]);
  const latest = history[0];

  async function load() {
    const res = await api<TaxCalculation[]>('GET', '/tax/history');
    if (res.status < 400) setHistory(res.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams({
      regime,
      faturamento12m: String(toCents(revenue12m)),
      faturamentoMes: String(toCents(revenueMonth)),
      period,
    });
    const res = await api('POST', `/tax/calculate?${params.toString()}`);
    if (res.status < 400) {
      toast.success('Imposto calculado');
      await load();
    } else {
      toast.error('Nao foi possivel calcular imposto');
    }
  }

  async function createDasTask() {
    if (!latest) return;
    const due = new Date();
    due.setDate(20);
    if (due.getTime() < Date.now()) due.setMonth(due.getMonth() + 1);
    const res = await api('POST', '/tasks', {
      title: `Pagar DAS ${latest.period}`,
      notes: `Valor estimado: ${brl(latest.dasCents)} | Regime: ${latest.regime}`,
      dueDate: due.toISOString(),
      priority: 'HIGH',
    });
    if (res.status < 400) toast.success('Tarefa de DAS criada');
    else toast.error('Nao foi possivel criar a tarefa');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-4 py-4 sm:px-6">
        <h1 className="text-base font-bold">Impostos</h1>
        <p className="text-xs text-muted-foreground">Calculo de MEI/Simples e controle de DAS.</p>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[360px_1fr]">
        <Card className="p-4">
          <form onSubmit={calculate} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Regime</Label>
              <select
                value={regime}
                onChange={(event) => setRegime(event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="MEI">MEI</option>
                <option value="SIMPLES_I">Simples Anexo I</option>
                <option value="SIMPLES_III">Simples Anexo III</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Periodo</Label>
              <Input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Faturamento 12 meses (R$)</Label>
              <Input type="number" step="0.01" value={revenue12m} onChange={(event) => setRevenue12m(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Faturamento do mes (R$)</Label>
              <Input type="number" step="0.01" value={revenueMonth} onChange={(event) => setRevenueMonth(event.target.value)} />
            </div>
            <Button type="submit" className="w-full">
              <Calculator className="h-4 w-4" />
              Calcular DAS
            </Button>
          </form>
          {latest && (
            <Button type="button" variant="outline" className="mt-3 w-full" onClick={() => void createDasTask()}>
              <ClipboardCheck className="h-4 w-4" />
              Criar tarefa DAS
            </Button>
          )}
        </Card>

        <div className="space-y-4">
          {latest && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">DAS estimado</p>
                <p className="text-xl font-bold">{brl(latest.dasCents)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Aliquota efetiva</p>
                <p className="text-xl font-bold">{(latest.effectiveRateBps / 100).toFixed(2)}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Regime</p>
                <p className="text-xl font-bold">{latest.regime}</p>
              </Card>
            </div>
          )}

          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Regime</TableHead>
                  <TableHead>Faturamento mes</TableHead>
                  <TableHead>DAS</TableHead>
                  <TableHead>Aliquota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.period}</TableCell>
                    <TableCell>{item.regime}</TableCell>
                    <TableCell>{brl(item.revenueMonthCents)}</TableCell>
                    <TableCell>{brl(item.dasCents)}</TableCell>
                    <TableCell>{(item.effectiveRateBps / 100).toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                      Nenhum imposto calculado ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}

