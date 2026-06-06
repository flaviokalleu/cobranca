'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchPersonalFinance,
  createPersonalAccount,
  createPersonalCard,
  createSpendingLimit,
  createInvestmentGoal,
  deletePersonalAccount,
  deletePersonalCard,
  deleteSpendingLimit,
  deleteInvestmentGoal,
} from '@/store/personalFinanceSlice';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Target,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  PiggyBank,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
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

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Conta corrente' },
  { value: 'SAVINGS', label: 'Poupanca' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'INVESTMENT', label: 'Investimento' },
  { value: 'WALLET', label: 'Carteira digital' },
];

export default function FinancasPessoaisPage() {
  const dispatch = useAppDispatch();
  const { summary, accounts, cards, limits, goals } = useAppSelector(
    (s) => s.personalFinance,
  );

  const [modalAccount, setModalAccount] = useState(false);
  const [modalCard, setModalCard] = useState(false);
  const [modalLimit, setModalLimit] = useState(false);
  const [modalGoal, setModalGoal] = useState(false);

  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('CHECKING');
  const [accBalance, setAccBalance] = useState('0.00');

  const [cardName, setCardName] = useState('');
  const [cardLimit, setCardLimit] = useState('0.00');
  const [cardClosing, setCardClosing] = useState('');
  const [cardDue, setCardDue] = useState('');

  const [limCategory, setLimCategory] = useState('');
  const [limValue, setLimValue] = useState('0.00');
  const [limAlert, setLimAlert] = useState('80');

  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('0.00');
  const [goalCurrent, setGoalCurrent] = useState('0.00');

  useEffect(() => {
    void dispatch(fetchPersonalFinance());
  }, [dispatch]);

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(
      createPersonalAccount({
        name: accName,
        type: accType,
        balanceCents: Math.round(Number(accBalance) * 100),
      }),
    );
    if (createPersonalAccount.fulfilled.match(res)) {
      toast.success('Conta criada');
      setAccName(''); setAccType('CHECKING'); setAccBalance('0.00');
      setModalAccount(false);
    } else toast.error('Erro ao criar conta');
  }

  async function submitCard(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(
      createPersonalCard({
        name: cardName,
        limitCents: Math.round(Number(cardLimit) * 100),
        closingDay: cardClosing ? Number(cardClosing) : undefined,
        dueDay: cardDue ? Number(cardDue) : undefined,
      }),
    );
    if (createPersonalCard.fulfilled.match(res)) {
      toast.success('Cartao criado');
      setCardName(''); setCardLimit('0.00'); setCardClosing(''); setCardDue('');
      setModalCard(false);
    } else toast.error('Erro ao criar cartao');
  }

  async function submitLimit(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(
      createSpendingLimit({
        category: limCategory,
        limitCents: Math.round(Number(limValue) * 100),
        alertThresholdPercent: Number(limAlert),
      }),
    );
    if (createSpendingLimit.fulfilled.match(res)) {
      toast.success('Limite criado');
      setLimCategory(''); setLimValue('0.00'); setLimAlert('80');
      setModalLimit(false);
    } else toast.error('Erro ao criar limite');
  }

  async function submitGoal(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(
      createInvestmentGoal({
        name: goalName,
        targetCents: Math.round(Number(goalTarget) * 100),
        currentCents: Math.round(Number(goalCurrent) * 100),
      }),
    );
    if (createInvestmentGoal.fulfilled.match(res)) {
      toast.success('Meta criada');
      setGoalName(''); setGoalTarget('0.00'); setGoalCurrent('0.00');
      setModalGoal(false);
    } else toast.error('Erro ao criar meta');
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balanceCents, 0);
  const totalCardLimit = cards.reduce((s, c) => s + c.limitCents, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div>
            <h1 className="text-base font-bold text-gray-900">Financas Pessoais</h1>
            <p className="hidden text-xs text-gray-400 sm:block">Contas, cartoes, metas e limites</p>
          </div>
          <button
            onClick={() => void dispatch(fetchPersonalFinance())}
            className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            style={{ border: '1px solid #e5e7eb' }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">

        {/* KPIs do mes */}
        {summary && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Receita do mes', value: brl(summary.month.incomeCents), icon: TrendingUp, bg: 'bg-emerald-50', ic: 'text-emerald-500', tc: 'text-emerald-700' },
              { label: 'Gastos do mes', value: brl(summary.month.expenseCents), icon: TrendingDown, bg: 'bg-red-50', ic: 'text-red-500', tc: 'text-red-600' },
              { label: 'Saldo total', value: brl(totalBalance), icon: Wallet, bg: 'bg-violet-50', ic: 'text-violet-500', tc: 'text-violet-700' },
              { label: 'Limite cartoes', value: brl(totalCardLimit), icon: CreditCard, bg: 'bg-blue-50', ic: 'text-blue-500', tc: 'text-blue-700' },
            ].map((k) => (
              <div key={k.label} className={`rounded-2xl ${k.bg} p-4`} style={{ border: '1px solid #e5e7eb' }}>
                <div className="mb-2 flex items-start justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{k.label}</p>
                  <k.icon className={`h-3.5 w-3.5 ${k.ic}`} />
                </div>
                <p className={`text-lg font-bold tabular-nums ${k.tc}`}>{k.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Contas */}
          <section className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-violet-500" />
                <h2 className="text-sm font-bold text-gray-900">Contas</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{accounts.length}</span>
              </div>
              <button onClick={() => setModalAccount(true)} className="flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors">
                <Plus className="h-3.5 w-3.5" />Nova
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {accounts.length === 0 && (
                <p className="py-10 text-center text-sm text-gray-400">Nenhuma conta ainda</p>
              )}
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
                    <p className="text-[11px] text-gray-400">{ACCOUNT_TYPES.find(t => t.value === acc.type)?.label ?? acc.type}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className={`text-sm font-bold tabular-nums ${acc.balanceCents >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {brl(acc.balanceCents)}
                    </p>
                    <button
                      onClick={() => void dispatch(deletePersonalAccount(acc.id)).then(() => toast.success('Conta excluida'))}
                      className="rounded p-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cartoes */}
          <section className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-bold text-gray-900">Cartoes de credito</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{cards.length}</span>
              </div>
              <button onClick={() => setModalCard(true)} className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                <Plus className="h-3.5 w-3.5" />Novo
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {cards.length === 0 && (
                <p className="py-10 text-center text-sm text-gray-400">Nenhum cartao ainda</p>
              )}
              {cards.map((card) => (
                <div key={card.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{card.name}</p>
                    <p className="text-[11px] text-gray-400">
                      {card.closingDay ? `Fecha dia ${card.closingDay}` : ''}
                      {card.closingDay && card.dueDay ? ' · ' : ''}
                      {card.dueDay ? `Vence dia ${card.dueDay}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold tabular-nums text-blue-600">{brl(card.limitCents)}</p>
                    <button
                      onClick={() => void dispatch(deletePersonalCard(card.id)).then(() => toast.success('Cartao excluido'))}
                      className="rounded p-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Limites de gasto */}
          <section className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-bold text-gray-900">Limites por categoria</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{limits.length}</span>
              </div>
              <button onClick={() => setModalLimit(true)} className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
                <Plus className="h-3.5 w-3.5" />Novo
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {limits.length === 0 && (
                <p className="py-10 text-center text-sm text-gray-400">Nenhum limite definido</p>
              )}
              {limits.map((lim) => {
                const pct = lim.percentUsed ?? 0;
                const over = pct >= lim.alertThresholdPercent;
                return (
                  <div key={lim.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{lim.category}</p>
                        {over && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Alerta</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm tabular-nums text-gray-600">{brl(lim.usedCents ?? 0)} / {brl(lim.limitCents)}</p>
                        <button
                          onClick={() => void dispatch(deleteSpendingLimit(lim.id)).then(() => toast.success('Limite excluido'))}
                          className="rounded p-1 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 100 ? 'bg-red-500' : over ? 'bg-amber-400' : 'bg-emerald-500'}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-[10px] text-gray-400">{pct.toFixed(0)}% utilizado</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Metas */}
          <section className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-gray-900">Metas de investimento</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{goals.length}</span>
              </div>
              <button onClick={() => setModalGoal(true)} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                <Plus className="h-3.5 w-3.5" />Nova
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {goals.length === 0 && (
                <p className="py-10 text-center text-sm text-gray-400">Nenhuma meta ainda</p>
              )}
              {goals.map((goal) => {
                const pct = goal.percentDone ?? (goal.targetCents > 0 ? Math.min(100, (goal.currentCents / goal.targetCents) * 100) : 0);
                return (
                  <div key={goal.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{goal.name}</p>
                        {goal.dueDate && (
                          <p className="text-[11px] text-gray-400">
                            Prazo: {new Date(goal.dueDate).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums text-emerald-600">{brl(goal.currentCents)}</p>
                          <p className="text-[10px] text-gray-400">de {brl(goal.targetCents)}</p>
                        </div>
                        <button
                          onClick={() => void dispatch(deleteInvestmentGoal(goal.id)).then(() => toast.success('Meta excluida'))}
                          className="rounded p-1 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-[10px] text-gray-400">{pct.toFixed(0)}% concluido</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Gastos por categoria */}
          {summary && summary.byCategory.length > 0 && (
            <section className="overflow-hidden rounded-2xl bg-white lg:col-span-2" style={{ border: '1px solid #e5e7eb' }}>
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-rose-500" />
                  <h2 className="text-sm font-bold text-gray-900">Gastos por categoria</h2>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-gray-50 sm:grid-cols-3 lg:grid-cols-4">
                {summary.byCategory.map((cat) => (
                  <div key={cat.category} className="px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{cat.category}</p>
                    <p className="mt-1 text-base font-bold tabular-nums text-gray-900">{brl(cat.amountCents)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Modal Conta */}
      <Dialog open={modalAccount} onOpenChange={setModalAccount}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
          <form onSubmit={submitAccount} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input value={accName} onChange={(e) => setAccName(e.target.value)} required placeholder="Ex: Nubank" />
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select value={accType} onValueChange={setAccType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Saldo atual (R$)</Label>
              <Input type="number" step="0.01" min="0" value={accBalance} onChange={(e) => setAccBalance(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Criar conta</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Cartao */}
      <Dialog open={modalCard} onOpenChange={setModalCard}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo cartao</DialogTitle></DialogHeader>
          <form onSubmit={submitCard} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input value={cardName} onChange={(e) => setCardName(e.target.value)} required placeholder="Ex: Mastercard Itau" />
            </div>
            <div className="grid gap-1.5">
              <Label>Limite (R$)</Label>
              <Input type="number" step="0.01" min="0" value={cardLimit} onChange={(e) => setCardLimit(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Dia fechamento</Label>
                <Input type="number" min="1" max="31" placeholder="Ex: 5" value={cardClosing} onChange={(e) => setCardClosing(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Dia vencimento</Label>
                <Input type="number" min="1" max="31" placeholder="Ex: 12" value={cardDue} onChange={(e) => setCardDue(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full">Criar cartao</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Limite */}
      <Dialog open={modalLimit} onOpenChange={setModalLimit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo limite de gasto</DialogTitle></DialogHeader>
          <form onSubmit={submitLimit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Categoria</Label>
              <Input value={limCategory} onChange={(e) => setLimCategory(e.target.value)} required placeholder="Ex: Alimentacao" />
            </div>
            <div className="grid gap-1.5">
              <Label>Limite mensal (R$)</Label>
              <Input type="number" step="0.01" min="0" value={limValue} onChange={(e) => setLimValue(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Alertar em (%) — atual: {limAlert}%</Label>
              <Input type="range" min="10" max="100" step="5" value={limAlert} onChange={(e) => setLimAlert(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Criar limite</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Meta */}
      <Dialog open={modalGoal} onOpenChange={setModalGoal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova meta de investimento</DialogTitle></DialogHeader>
          <form onSubmit={submitGoal} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome da meta</Label>
              <Input value={goalName} onChange={(e) => setGoalName(e.target.value)} required placeholder="Ex: Reserva emergencia" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Valor alvo (R$)</Label>
                <Input type="number" step="0.01" min="0" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Ja guardado (R$)</Label>
                <Input type="number" step="0.01" min="0" value={goalCurrent} onChange={(e) => setGoalCurrent(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full">Criar meta</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
