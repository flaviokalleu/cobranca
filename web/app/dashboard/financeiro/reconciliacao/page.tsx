'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Split, TriangleAlert } from 'lucide-react';
import { api } from '@/lib/http-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BankAccount {
  id: string;
  name: string;
  type?: string | null;
  balanceCents?: number | null;
}

interface Result {
  id: string;
  accountId: string;
  period: string;
  matchedCount: number;
  suspectCount: number;
  unmatchedCount: number;
  totalMatchedCents: number;
  createdAt: string;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ReconciliacaoPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [accountId, setAccountId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const [accountsRes, resultsRes] = await Promise.all([
      api<BankAccount[]>('GET', '/open-finance/accounts'),
      api<Result[]>('GET', '/reconciliation/results'),
    ]);
    if (accountsRes.status < 400) {
      setAccounts(accountsRes.data);
      if (!accountId && accountsRes.data[0]) setAccountId(accountsRes.data[0].id);
    }
    if (resultsRes.status < 400) setResults(resultsRes.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (!accountId) return;
    setLoading(true);
    const res = await api('POST', '/reconciliation/run', {
      accountId,
      from: from || undefined,
      to: to || undefined,
    });
    setLoading(false);
    if (res.status < 400) {
      toast.success('Conferencia concluida');
      await load();
    } else {
      toast.error('Nao foi possivel conferir esta conta');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-4 py-4 sm:px-6">
        <h1 className="text-base font-bold">Conferir banco</h1>
        <p className="text-xs text-muted-foreground">Compare o extrato do banco com as cobrancas do sistema.</p>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[360px_1fr]">
        <Card className="p-4">
          <form onSubmit={run} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Conta do banco</Label>
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} {account.balanceCents != null ? `| ${brl(account.balanceCents)}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>De</Label>
                <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ate</Label>
                <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={!accountId || loading} className="w-full">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Split className="h-4 w-4" />}
              Conferir agora
            </Button>
          </form>
          {accounts.length === 0 && (
            <div className="mt-4 flex gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              Conecte uma conta bancaria ou use o modo de teste antes de conferir.
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Periodo</TableHead>
                <TableHead>Encontrados</TableHead>
                <TableHead>Suspeitos</TableHead>
                <TableHead>Sem ligacao</TableHead>
                <TableHead>Total conferido</TableHead>
                <TableHead>Executado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell className="font-medium">{result.period}</TableCell>
                  <TableCell>{result.matchedCount}</TableCell>
                  <TableCell>{result.suspectCount}</TableCell>
                  <TableCell>{result.unmatchedCount}</TableCell>
                  <TableCell>{brl(result.totalMatchedCents)}</TableCell>
                  <TableCell>{new Date(result.createdAt).toLocaleString('pt-BR')}</TableCell>
                </TableRow>
              ))}
              {results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Nenhuma conferencia feita ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}


