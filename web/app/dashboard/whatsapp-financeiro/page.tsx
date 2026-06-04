'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createInvestmentGoal,
  createPersonalAccount,
  createPersonalCard,
  createSpendingLimit,
  deleteInvestmentGoal,
  deletePersonalAccount,
  deletePersonalCard,
  deletePersonalTransaction,
  deleteSpendingLimit,
  fetchPersonalFinance,
  ingestFinanceMessage,
  type InvestmentGoal,
  type PersonalAccount,
  type PersonalCard,
  type PersonalTransaction,
  type SpendingLimit,
  updateInvestmentGoal,
  updatePersonalAccount,
  updatePersonalCard,
  updatePersonalTransaction,
  updateSpendingLimit,
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
  Pencil,
  Plus,
  Send,
  ShieldAlert,
  Trash2,
  Wallet,
} from 'lucide-react';

type ModalMode = 'account' | 'card' | 'limit' | 'goal' | 'transaction' | null;

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const cents = (value: string) => Math.round(Number(value.replace(',', '.') || 0) * 100);
const centsInput = (value: number) => (value / 100).toFixed(2);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const dateInput = (iso: string) => new Date(iso).toISOString().slice(0, 10);

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('CHECKING');
  const [transactionType, setTransactionType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentacao');
  const [threshold, setThreshold] = useState('80');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [current, setCurrent] = useState('');
  const [accountId, setAccountId] = useState('NONE');
  const [cardId, setCardId] = useState('NONE');
  const [occurredAt, setOccurredAt] = useState('');

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

  function resetModal(nextMode: ModalMode) {
    setMode(nextMode);
    setEditingId(null);
    setName('');
    setType('CHECKING');
    setTransactionType('EXPENSE');
    setAmount('');
    setCategory('Alimentacao');
    setThreshold('80');
    setClosingDay('');
    setDueDay('');
    setCurrent('');
    setAccountId('NONE');
    setCardId('NONE');
    setOccurredAt(new Date().toISOString().slice(0, 10));
  }

  function openModal(nextMode: Exclude<ModalMode, null>) {
    resetModal(nextMode);
  }

  function openAccount(account: PersonalAccount) {
    resetModal('account');
    setEditingId(account.id);
    setName(account.name);
    setType(account.type);
    setAmount(centsInput(account.balanceCents));
  }

  function openCard(card: PersonalCard) {
    resetModal('card');
    setEditingId(card.id);
    setName(card.name);
    setAmount(centsInput(card.limitCents));
    setClosingDay(card.closingDay ? String(card.closingDay) : '');
    setDueDay(card.dueDay ? String(card.dueDay) : '');
  }

  function openLimit(limit: SpendingLimit) {
    resetModal('limit');
    setEditingId(limit.id);
    setCategory(limit.category);
    setAmount(centsInput(limit.limitCents));
    setThreshold(String(limit.alertThresholdPercent));
  }

  function openGoal(goal: InvestmentGoal) {
    resetModal('goal');
    setEditingId(goal.id);
    setName(goal.name);
    setAmount(centsInput(goal.targetCents));
    setCurrent(centsInput(goal.currentCents));
  }

  function openTransaction(transaction: PersonalTransaction) {
    resetModal('transaction');
    setEditingId(transaction.id);
    setName(transaction.description);
    setTransactionType(transaction.type);
    setAmount(centsInput(transaction.amountCents));
    setCategory(transaction.category);
    setAccountId(transaction.accountId ?? 'NONE');
    setCardId(transaction.cardId ?? 'NONE');
    setOccurredAt(dateInput(transaction.occurredAt));
  }

  async function submitModal(e: React.FormEvent) {
    e.preventDefault();
    let res;
    if (mode === 'account') {
      res = editingId
        ? await dispatch(updatePersonalAccount({ id: editingId, name, type, balanceCents: cents(amount) }))
        : await dispatch(createPersonalAccount({ name, type, balanceCents: cents(amount) }));
    }
    if (mode === 'card') {
      const payload = {
        name,
        limitCents: cents(amount),
        closingDay: closingDay ? Number(closingDay) : undefined,
        dueDay: dueDay ? Number(dueDay) : undefined,
      };
      res = editingId
        ? await dispatch(updatePersonalCard({ id: editingId, ...payload }))
        : await dispatch(createPersonalCard(payload));
    }
    if (mode === 'limit') {
      const payload = {
        category,
        limitCents: cents(amount),
        alertThresholdPercent: Number(threshold || 80),
      };
      res = editingId
        ? await dispatch(updateSpendingLimit({ id: editingId, ...payload }))
        : await dispatch(createSpendingLimit(payload));
    }
    if (mode === 'goal') {
      const payload = {
        name,
        targetCents: cents(amount),
        currentCents: current ? cents(current) : undefined,
      };
      res = editingId
        ? await dispatch(updateInvestmentGoal({ id: editingId, ...payload }))
        : await dispatch(createInvestmentGoal(payload));
    }
    if (mode === 'transaction' && editingId) {
      res = await dispatch(
        updatePersonalTransaction({
          id: editingId,
          type: transactionType,
          amountCents: cents(amount),
          description: name,
          category,
          occurredAt,
          accountId: accountId === 'NONE' ? null : accountId,
          cardId: cardId === 'NONE' ? null : cardId,
        }),
      );
    }
    if (res && res.meta.requestStatus === 'fulfilled') {
      toast.success(editingId ? 'Registro atualizado' : 'Registro criado');
      setMode(null);
    } else if (res) {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function removeAccount(account: PersonalAccount) {
    if (!window.confirm(`Excluir conta "${account.name}"?`)) return;
    const res = await dispatch(deletePersonalAccount(account.id));
    if (deletePersonalAccount.fulfilled.match(res)) toast.success('Conta excluida');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function removeCard(card: PersonalCard) {
    if (!window.confirm(`Excluir cartao "${card.name}"?`)) return;
    const res = await dispatch(deletePersonalCard(card.id));
    if (deletePersonalCard.fulfilled.match(res)) toast.success('Cartao excluido');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function removeLimit(limit: SpendingLimit) {
    if (!window.confirm(`Excluir limite de "${limit.category}"?`)) return;
    const res = await dispatch(deleteSpendingLimit(limit.id));
    if (deleteSpendingLimit.fulfilled.match(res)) toast.success('Limite excluido');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function removeGoal(goal: InvestmentGoal) {
    if (!window.confirm(`Excluir meta "${goal.name}"?`)) return;
    const res = await dispatch(deleteInvestmentGoal(goal.id));
    if (deleteInvestmentGoal.fulfilled.match(res)) toast.success('Meta excluida');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function removeTransaction(transaction: PersonalTransaction) {
    if (!window.confirm(`Excluir transacao "${transaction.description}"?`)) return;
    const res = await dispatch(deletePersonalTransaction(transaction.id));
    if (deletePersonalTransaction.fulfilled.match(res)) toast.success('Transacao excluida');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
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
          <StatCard label="Receitas" value={brl(summary?.month.incomeCents ?? 0)} icon={ArrowUpCircle} accent="green" />
          <StatCard label="Gastos" value={brl(summary?.month.expenseCents ?? 0)} icon={ArrowDownCircle} accent="red" />
          <StatCard label="Resultado" value={brl(summary?.month.resultCents ?? 0)} icon={Wallet} accent="indigo" />
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
              <CardTitle className="text-base">Contas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">{account.type} · {brl(account.balanceCents)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => openAccount(account)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Excluir" onClick={() => void removeAccount(account)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {accounts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conta.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cartoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {cards.map((card) => (
                <div key={card.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div>
                    <p className="font-medium">{card.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {brl(card.limitCents)} · fecha {card.closingDay ?? '-'} · vence {card.dueDay ?? '-'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => openCard(card)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Excluir" onClick={() => void removeCard(card)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {cards.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum cartao.</p>}
            </CardContent>
          </Card>
        </div>

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
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, (item.amountCents / maxCategory) * 100)}%` }} />
                  </div>
                </div>
              ))}
              {(summary?.byCategory.length ?? 0) === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma categoria registrada neste mes.</p>
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
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{limit.category}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">{brl(limit.usedCents ?? 0)} / {brl(limit.limitCents)}</span>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => openLimit(limit)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" onClick={() => void removeLimit(limit)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, limit.percentUsed ?? 0)}%` }} />
                  </div>
                </div>
              ))}
              {goals.map((goal) => (
                <div key={goal.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{goal.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">{brl(goal.currentCents)} / {brl(goal.targetCents)}</span>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => openGoal(goal)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" onClick={() => void removeGoal(goal)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, goal.percentDone ?? 0)}%` }} />
                  </div>
                </div>
              ))}
              {limits.length === 0 && goals.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Crie limites e metas para acompanhar o mes.</p>
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
                <TableHead className="w-[96px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{fmtDate(transaction.occurredAt)}</TableCell>
                  <TableCell className="font-medium">{transaction.description}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell><Badge variant="outline">{transaction.source}</Badge></TableCell>
                  <TableCell className="text-right">
                    {transaction.type === 'EXPENSE' ? '-' : '+'}{brl(transaction.amountCents)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => openTransaction(transaction)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" onClick={() => void removeTransaction(transaction)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Nenhuma transacao registrada.</TableCell>
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
              {editingId ? 'Editar ' : 'Novo '}
              {mode === 'account' && 'conta'}
              {mode === 'card' && 'cartao'}
              {mode === 'limit' && 'limite'}
              {mode === 'goal' && 'meta'}
              {mode === 'transaction' && 'transacao'}
            </DialogTitle>
            <DialogDescription>WEBBA Finance Assistant</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitModal} className="grid gap-4">
            {mode !== 'limit' && (
              <div className="grid gap-1.5">
                <Label>{mode === 'transaction' ? 'Descricao' : 'Nome'}</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
            )}

            {mode === 'account' && (
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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

            {mode === 'transaction' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Tipo</Label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXPENSE">Gasto</SelectItem>
                      <SelectItem value="INCOME">Receita</SelectItem>
                      <SelectItem value="TRANSFER">Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Data</Label>
                  <Input type="date" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} required />
                </div>
              </div>
            )}

            {(mode === 'limit' || mode === 'transaction') && (
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Input value={category} onChange={(event) => setCategory(event.target.value)} required />
              </div>
            )}

            {mode === 'transaction' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Conta</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sem conta</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Cartao</Label>
                  <Select value={cardId} onValueChange={setCardId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">Sem cartao</SelectItem>
                      {cards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label>{mode === 'goal' ? 'Valor alvo (R$)' : mode === 'card' ? 'Limite (R$)' : 'Valor (R$)'}</Label>
              <Input type="number" step="0.01" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </div>

            {mode === 'card' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Fechamento</Label>
                  <Input type="number" min="1" max="31" value={closingDay} onChange={(event) => setClosingDay(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Vencimento</Label>
                  <Input type="number" min="1" max="31" value={dueDay} onChange={(event) => setDueDay(event.target.value)} />
                </div>
              </div>
            )}
            {mode === 'limit' && (
              <div className="grid gap-1.5">
                <Label>Alerta (%)</Label>
                <Input type="number" min="1" max="100" value={threshold} onChange={(event) => setThreshold(event.target.value)} />
              </div>
            )}
            {mode === 'goal' && (
              <div className="grid gap-1.5">
                <Label>Valor atual (R$)</Label>
                <Input type="number" step="0.01" min="0" value={current} onChange={(event) => setCurrent(event.target.value)} />
              </div>
            )}
            <Button type="submit">
              <Plus className="h-4 w-4" />
              {editingId ? 'Salvar alteracoes' : 'Salvar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
