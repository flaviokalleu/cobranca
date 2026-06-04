'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createInvestmentGoal,
  createPersonalAccount,
  createPersonalCard,
  createSpendingLimit,
  fetchPersonalFinance,
  ingestFinanceMessage,
} from '@/store/personalFinanceSlice';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Goal,
  MessageCircle,
  Plus,
  Send,
  ShieldAlert,
  Wallet,
} from 'lucide-react';

type ModalMode = 'account' | 'card' | 'limit' | 'goal' | null;

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const cents = (value: string) => Math.round(Number(value.replace(',', '.') || 0) * 100);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });

export default function WhatsAppFinanceiroPage() {
  const dispatch = useAppDispatch();
  const {
    summary,
    transactions,
    limits,
    goals,
    accounts,
    cards,
    lastReply,
    error,
  } = useAppSelector((state) => state.personalFinance);

  const [message, setMessage] = useState('Gastei 42,90 no mercado hoje');
  const [mode, setMode] = useState<ModalMode>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('CHECKING');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentacao');
  const [threshold, setThreshold] = useState('80');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [current, setCurrent] = useState('');

  useEffect(() => {
    void dispatch(fetchPersonalFinance());
  }, [dispatch]);

  const maxCategory = useMemo(
    () => Math.max(1, ...(summary?.byCategory.map((item) => item.amountCents) ?? [1])),
    [summary],
  );

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    const res = await dispatch(ingestFinanceMessage(trimmed));
    if (ingestFinanceMessage.fulfilled.match(res)) {
      toast.success('Registro criado');
      setMessage('');
    }
  }

  function openModal(nextMode: ModalMode) {
    setMode(nextMode);
    setName('');
    setType('CHECKING');
    setAmount('');
    setCategory('Alimentacao');
    setThreshold('80');
    setClosingDay('');
    setDueDay('');
    setCurrent('');
  }

  async function submitModal(e: React.FormEvent) {
    e.preventDefault();
    if (mode === 'account') {
      const res = await dispatch(
        createPersonalAccount({ name, type, balanceCents: cents(amount) }),
      );
      if (createPersonalAccount.fulfilled.match(res)) toast.success('Conta criada');
    }
    if (mode === 'card') {
      const res = await dispatch(
        createPersonalCard({
          name,
          limitCents: cents(amount),
          closingDay: closingDay ? Number(closingDay) : undefined,
          dueDay: dueDay ? Number(dueDay) : undefined,
        }),
      );
      if (createPersonalCard.fulfilled.match(res)) toast.success('Cartao criado');
    }
    if (mode === 'limit') {
      const res = await dispatch(
        createSpendingLimit({
          category,
          limitCents: cents(amount),
          alertThresholdPercent: Number(threshold || 80),
        }),
      );
      if (createSpendingLimit.fulfilled.match(res)) toast.success('Limite criado');
    }
    if (mode === 'goal') {
      const res = await dispatch(
        createInvestmentGoal({
          name,
          targetCents: cents(amount),
          currentCents: current ? cents(current) : undefined,
        }),
      );
      if (createInvestmentGoal.fulfilled.match(res)) toast.success('Meta criada');
    }
    setMode(null);
  }

  return (
    <>
      <PageHeader
        title="WhatsApp Financeiro"
        description="Financas por conversa, IA e alertas"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => openModal('account')}>
              <Wallet className="h-4 w-4" />
              Conta
            </Button>
            <Button variant="outline" onClick={() => openModal('card')}>
              <CreditCard className="h-4 w-4" />
              Cartao
            </Button>
            <Button variant="outline" onClick={() => openModal('limit')}>
              <ShieldAlert className="h-4 w-4" />
              Limite
            </Button>
            <Button onClick={() => openModal('goal')}>
              <Goal className="h-4 w-4" />
              Meta
            </Button>
          </div>
        }
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Receitas"
            value={brl(summary?.month.incomeCents ?? 0)}
            icon={ArrowUpCircle}
            accent="green"
          />
          <StatCard
            label="Gastos"
            value={brl(summary?.month.expenseCents ?? 0)}
            icon={ArrowDownCircle}
            accent="red"
          />
          <StatCard
            label="Resultado"
            value={brl(summary?.month.resultCents ?? 0)}
            icon={Wallet}
            accent="indigo"
          />
          <StatCard label="Contas" value={String(accounts.length)} icon={Wallet} accent="slate" />
          <StatCard label="Cartoes" value={String(cards.length)} icon={CreditCard} accent="slate" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              Entrada WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={sendMessage} className="flex flex-col gap-2 md:flex-row">
              <Input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Gastei 42,90 no mercado hoje"
              />
              <Button type="submit">
                <Send className="h-4 w-4" />
                Registrar
              </Button>
            </form>
            <div className="flex flex-wrap gap-2">
              {['Texto', 'Audio', 'Imagem', 'PDF'].map((item) => (
                <Badge key={item} variant="secondary">
                  {item}
                </Badge>
              ))}
            </div>
            {lastReply && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                {lastReply}
              </div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gastos por categoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(summary?.byCategory ?? []).map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.category}</span>
                    <span className="text-muted-foreground">{brl(item.amountCents)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, (item.amountCents / maxCategory) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {(summary?.byCategory.length ?? 0) === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma categoria registrada neste mes.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Limites e metas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {limits.map((limit) => (
                <div key={limit.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{limit.category}</span>
                    <span className="text-muted-foreground">
                      {brl(limit.usedCents ?? 0)} / {brl(limit.limitCents)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.min(100, limit.percentUsed ?? 0)}%` }}
                    />
                  </div>
                </div>
              ))}
              {goals.map((goal) => (
                <div key={goal.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-muted-foreground">
                      {brl(goal.currentCents)} / {brl(goal.targetCents)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, goal.percentDone ?? 0)}%` }}
                    />
                  </div>
                </div>
              ))}
              {limits.length === 0 && goals.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Crie limites e metas para acompanhar o mes.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{fmtDate(transaction.occurredAt)}</TableCell>
                  <TableCell className="font-medium">{transaction.description}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{transaction.source}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {transaction.type === 'EXPENSE' ? '-' : '+'}
                    {brl(transaction.amountCents)}
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    Nenhuma transacao registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={!!mode} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === 'account' && 'Nova conta'}
              {mode === 'card' && 'Novo cartao'}
              {mode === 'limit' && 'Novo limite'}
              {mode === 'goal' && 'Nova meta'}
            </DialogTitle>
            <DialogDescription>WEBBA Finance Assistant</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitModal} className="grid gap-4">
            {mode !== 'limit' && (
              <div className="grid gap-1.5">
                <Label>Nome</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
            )}
            {mode === 'account' && (
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHECKING">Conta corrente</SelectItem>
                    <SelectItem value="SAVINGS">Poupanca</SelectItem>
                    <SelectItem value="CASH">Dinheiro</SelectItem>
                    <SelectItem value="INVESTMENT">Investimento</SelectItem>
                    <SelectItem value="WALLET">Carteira</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {mode === 'limit' && (
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>
                {mode === 'goal' ? 'Valor alvo (R$)' : mode === 'card' ? 'Limite (R$)' : 'Valor (R$)'}
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </div>
            {mode === 'card' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Fechamento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={closingDay}
                    onChange={(event) => setClosingDay(event.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Vencimento</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(event) => setDueDay(event.target.value)}
                  />
                </div>
              </div>
            )}
            {mode === 'limit' && (
              <div className="grid gap-1.5">
                <Label>Alerta (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={threshold}
                  onChange={(event) => setThreshold(event.target.value)}
                />
              </div>
            )}
            {mode === 'goal' && (
              <div className="grid gap-1.5">
                <Label>Valor atual (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                />
              </div>
            )}
            <Button type="submit">
              <Plus className="h-4 w-4" />
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
