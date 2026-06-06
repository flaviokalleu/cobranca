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
  updateInvestmentGoal,
} from '@/store/personalFinanceSlice';
import { api } from '@/lib/api';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, CreditCard, Target, AlertCircle,
  Plus, Trash2, RefreshCw, PiggyBank, Download, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Conta corrente' },
  { value: 'SAVINGS', label: 'Poupanca' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'INVESTMENT', label: 'Investimento' },
  { value: 'WALLET', label: 'Carteira digital' },
];

const PIE_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

export default function FinancasPessoaisPage() {
  const dispatch = useAppDispatch();
  const { summary, accounts, cards, limits, goals, transactions } = useAppSelector((s) => s.personalFinance);

  const [modalAccount, setModalAccount] = useState(false);
  const [modalCard, setModalCard] = useState(false);
  const [modalLimit, setModalLimit] = useState(false);
  const [modalGoal, setModalGoal] = useState(false);
  const [modalTx, setModalTx] = useState(false);
  const [modalContribute, setModalContribute] = useState<string | null>(null);

  const [accName, setAccName] = useState(''); const [accType, setAccType] = useState('CHECKING'); const [accBalance, setAccBalance] = useState('0.00');
  const [cardName, setCardName] = useState(''); const [cardLimit, setCardLimit] = useState('0.00'); const [cardClosing, setCardClosing] = useState(''); const [cardDue, setCardDue] = useState('');
  const [limCategory, setLimCategory] = useState(''); const [limValue, setLimValue] = useState('0.00'); const [limAlert, setLimAlert] = useState('80');
  const [goalName, setGoalName] = useState(''); const [goalTarget, setGoalTarget] = useState('0.00'); const [goalCurrent, setGoalCurrent] = useState('0.00');
  const [txType, setTxType] = useState('EXPENSE'); const [txAmount, setTxAmount] = useState('0.00'); const [txDesc, setTxDesc] = useState(''); const [txCategory, setTxCategory] = useState('Outros'); const [txDate, setTxDate] = useState(new Date().toISOString().slice(0,10));
  const [contributeAmount, setContributeAmount] = useState('0.00');

  useEffect(() => { void dispatch(fetchPersonalFinance()); }, [dispatch]);

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(createPersonalAccount({ name: accName, type: accType, balanceCents: Math.round(Number(accBalance) * 100) }));
    if (createPersonalAccount.fulfilled.match(res)) { toast.success('Conta criada'); setAccName(''); setModalAccount(false); }
    else toast.error('Erro ao criar conta');
  }
  async function submitCard(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(createPersonalCard({ name: cardName, limitCents: Math.round(Number(cardLimit) * 100), closingDay: cardClosing ? Number(cardClosing) : undefined, dueDay: cardDue ? Number(cardDue) : undefined }));
    if (createPersonalCard.fulfilled.match(res)) { toast.success('Cartao criado'); setCardName(''); setModalCard(false); }
    else toast.error('Erro ao criar cartao');
  }
  async function submitLimit(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(createSpendingLimit({ category: limCategory, limitCents: Math.round(Number(limValue) * 100), alertThresholdPercent: Number(limAlert) }));
    if (createSpendingLimit.fulfilled.match(res)) { toast.success('Limite criado'); setLimCategory(''); setModalLimit(false); }
    else toast.error('Erro ao criar limite');
  }
  async function submitGoal(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(createInvestmentGoal({ name: goalName, targetCents: Math.round(Number(goalTarget) * 100), currentCents: Math.round(Number(goalCurrent) * 100) }));
    if (createInvestmentGoal.fulfilled.match(res)) { toast.success('Meta criada'); setGoalName(''); setModalGoal(false); }
    else toast.error('Erro ao criar meta');
  }
  async function submitTransaction(e: React.FormEvent) {
    e.preventDefault();
    const { status } = await api('POST', '/personal-finance/transactions', {
      type: txType, amountCents: Math.round(Number(txAmount) * 100),
      description: txDesc, category: txCategory, occurredAt: txDate, source: 'MANUAL',
    });
    if (status < 300) { toast.success('Transacao registrada'); void dispatch(fetchPersonalFinance()); setTxDesc(''); setTxAmount('0.00'); setModalTx(false); }
    else toast.error('Erro ao registrar');
  }
  async function submitContribute(goalId: string) {
    const amountCents = Math.round(Number(contributeAmount) * 100);
    const { status } = await api('POST', `/personal-finance/goals/${goalId}/contribute`, { amountCents });
    if (status < 300) { toast.success('Aporte registrado!'); void dispatch(fetchPersonalFinance()); setContributeAmount('0.00'); setModalContribute(null); }
    else toast.error('Erro ao registrar aporte');
  }

  function downloadCsv() {
    const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
    window.open(`${base}/personal-finance/export`, '_blank');
  }

  const totalBalance = accounts.reduce((s, a) => s + a.balanceCents, 0);
  const totalCardLimit = cards.reduce((s, c) => s + c.limitCents, 0);
  const pieData = summary?.byCategory.slice(0, 8) ?? [];

  const last6Months = (() => {
    const months: { name: string; receita: number; gasto: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months.push({ name: d.toLocaleDateString('pt-BR', { month: 'short' }), receita: 0, gasto: 0 });
    }
    for (const tx of transactions ?? []) {
      const d = new Date(tx.occurredAt);
      const now = new Date();
      const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diffMonths >= 0 && diffMonths < 6) {
        const idx = 5 - diffMonths;
        if (tx.type === 'INCOME') months[idx].receita += tx.amountCents / 100;
        else if (tx.type === 'EXPENSE') months[idx].gasto += tx.amountCents / 100;
      }
    }
    return months;
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div>
            <h1 className="text-base font-bold text-gray-900">Financas Pessoais</h1>
            <p className="hidden text-xs text-gray-400 sm:block">Contas, cartoes, metas e limites</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors" style={{ border: '1px solid #e5e7eb' }}>
              <input type="file" accept=".ofx,.OFX" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData(); fd.append('file', file);
                const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const res = await fetch(`${base}/personal-finance/import-ofx`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
                if (res.ok) { const d = await res.json() as { imported: number; skipped: number }; toast.success(`${d.imported} transacoes importadas, ${d.skipped} ignoradas`); void dispatch(fetchPersonalFinance()); }
                else toast.error('Erro ao importar OFX');
                e.target.value = '';
              }} />
              <Download className="h-3.5 w-3.5" />Importar OFX
            </label>
            <button onClick={downloadCsv} className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors" style={{ border: '1px solid #e5e7eb' }}>
              <Download className="h-3.5 w-3.5" />Exportar CSV
            </button>
            <button onClick={() => void dispatch(fetchPersonalFinance())} className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors" style={{ border: '1px solid #e5e7eb' }}>
              <RefreshCw className="h-3.5 w-3.5" />Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">

        {/* KPIs */}
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

        {/* Graficos */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {pieData.length > 0 && (
            <div className="overflow-hidden rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
              <h2 className="mb-4 text-sm font-bold text-gray-900">Gastos por categoria</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData.map(c => ({ name: c.category, value: c.amountCents / 100 }))} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => brl(v * 100)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {last6Months.some(m => m.receita > 0 || m.gasto > 0) && (
            <div className="overflow-hidden rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
              <h2 className="mb-4 text-sm font-bold text-gray-900">Evolucao mensal</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={last6Months} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `R$${v}`} />
                  <Tooltip formatter={(v: number) => [`R$ ${v.toFixed(2)}`, '']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="receita" name="Receita" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="gasto" name="Gasto" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Botao nova transacao */}
        <div className="flex justify-end">
          <button onClick={() => setModalTx(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="h-4 w-4" />Nova transacao
          </button>
        </div>

        {/* Ultimas transacoes */}
        {(transactions ?? []).length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e7eb' }}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Ultimas transacoes</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {(transactions ?? []).slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${tx.type === 'INCOME' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {tx.type === 'INCOME' ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 max-w-[200px] truncate">{tx.description}</p>
                      <p className="text-[11px] text-gray-400">{tx.category} · {new Date(tx.occurredAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-bold tabular-nums ${tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{brl(tx.amountCents)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Contas */}
          <section className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-violet-500" /><h2 className="text-sm font-bold text-gray-900">Contas</h2><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{accounts.length}</span></div>
              <button onClick={() => setModalAccount(true)} className="flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"><Plus className="h-3.5 w-3.5" />Nova</button>
            </div>
            <div className="divide-y divide-gray-50">
              {accounts.length === 0 && <p className="py-10 text-center text-sm text-gray-400">Nenhuma conta ainda</p>}
              {accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between px-5 py-3.5">
                  <div><p className="text-sm font-semibold text-gray-900">{acc.name}</p><p className="text-[11px] text-gray-400">{ACCOUNT_TYPES.find(t => t.value === acc.type)?.label ?? acc.type}</p></div>
                  <div className="flex items-center gap-3">
                    <p className={`text-sm font-bold tabular-nums ${acc.balanceCents >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{brl(acc.balanceCents)}</p>
                    <button onClick={() => void dispatch(deletePersonalAccount(acc.id)).then(() => toast.success('Excluida'))} className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cartoes */}
          <section className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-500" /><h2 className="text-sm font-bold text-gray-900">Cartoes</h2><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{cards.length}</span></div>
              <button onClick={() => setModalCard(true)} className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"><Plus className="h-3.5 w-3.5" />Novo</button>
            </div>
            <div className="divide-y divide-gray-50">
              {cards.length === 0 && <p className="py-10 text-center text-sm text-gray-400">Nenhum cartao ainda</p>}
              {cards.map((card) => (
                <div key={card.id} className="flex items-center justify-between px-5 py-3.5">
                  <div><p className="text-sm font-semibold text-gray-900">{card.name}</p><p className="text-[11px] text-gray-400">{card.closingDay ? `Fecha dia ${card.closingDay}` : ''}{card.closingDay && card.dueDay ? ' · ' : ''}{card.dueDay ? `Vence dia ${card.dueDay}` : ''}</p></div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold tabular-nums text-blue-600">{brl(card.limitCents)}</p>
                    <button onClick={() => void dispatch(deletePersonalCard(card.id)).then(() => toast.success('Excluido'))} className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Limites */}
          <section className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /><h2 className="text-sm font-bold text-gray-900">Limites por categoria</h2><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{limits.length}</span></div>
              <button onClick={() => setModalLimit(true)} className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"><Plus className="h-3.5 w-3.5" />Novo</button>
            </div>
            <div className="divide-y divide-gray-50">
              {limits.length === 0 && <p className="py-10 text-center text-sm text-gray-400">Nenhum limite definido</p>}
              {limits.map((lim) => {
                const pct = lim.percentUsed ?? 0;
                const over = pct >= lim.alertThresholdPercent;
                return (
                  <div key={lim.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-900">{lim.category}</p>{over && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Alerta</span>}</div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm tabular-nums text-gray-600">{brl(lim.usedCents ?? 0)} / {brl(lim.limitCents)}</p>
                        <button onClick={() => void dispatch(deleteSpendingLimit(lim.id)).then(() => toast.success('Excluido'))} className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${pct > 100 ? 'bg-red-500' : over ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
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
              <div className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-500" /><h2 className="text-sm font-bold text-gray-900">Metas</h2><span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">{goals.length}</span></div>
              <button onClick={() => setModalGoal(true)} className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"><Plus className="h-3.5 w-3.5" />Nova</button>
            </div>
            <div className="divide-y divide-gray-50">
              {goals.length === 0 && <p className="py-10 text-center text-sm text-gray-400">Nenhuma meta ainda</p>}
              {goals.map((goal) => {
                const pct = goal.percentDone ?? (goal.targetCents > 0 ? Math.min(100, Math.round((goal.currentCents / goal.targetCents) * 100)) : 0);
                return (
                  <div key={goal.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between mb-2">
                      <div><p className="text-sm font-semibold text-gray-900">{goal.name}</p>{goal.dueDate && <p className="text-[11px] text-gray-400">Prazo: {new Date(goal.dueDate).toLocaleDateString('pt-BR')}</p>}</div>
                      <div className="flex items-center gap-2">
                        <div className="text-right"><p className="text-sm font-bold tabular-nums text-emerald-600">{brl(goal.currentCents)}</p><p className="text-[10px] text-gray-400">de {brl(goal.targetCents)}</p></div>
                        <button onClick={() => setModalContribute(goal.id)} className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">+ Aportar</button>
                        <button onClick={() => void dispatch(deleteInvestmentGoal(goal.id)).then(() => toast.success('Meta excluida'))} className="rounded p-1 text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-0.5 text-right text-[10px] text-gray-400">{pct}% concluido</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Gastos por categoria */}
          {summary && summary.byCategory.length > 0 && (
            <section className="overflow-hidden rounded-2xl bg-white lg:col-span-2" style={{ border: '1px solid #e5e7eb' }}>
              <div className="px-5 py-4 border-b border-gray-100"><div className="flex items-center gap-2"><PiggyBank className="h-4 w-4 text-rose-500" /><h2 className="text-sm font-bold text-gray-900">Gastos por categoria (mes atual)</h2></div></div>
              <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-gray-50 sm:grid-cols-3 lg:grid-cols-5">
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

      {/* Modais */}
      <Dialog open={modalTx} onOpenChange={setModalTx}>
        <DialogContent><DialogHeader><DialogTitle>Nova transacao</DialogTitle></DialogHeader>
          <form onSubmit={submitTransaction} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Tipo</Label>
                <Select value={txType} onValueChange={setTxType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="EXPENSE">Gasto</SelectItem><SelectItem value="INCOME">Receita</SelectItem><SelectItem value="TRANSFER">Transferencia</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label>Valor (R$)</Label><Input type="number" step="0.01" min="0" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} /></div>
            </div>
            <div className="grid gap-1.5"><Label>Descricao</Label><Input value={txDesc} onChange={(e) => setTxDesc(e.target.value)} required placeholder="Ex: Supermercado Extra" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Categoria</Label><Input value={txCategory} onChange={(e) => setTxCategory(e.target.value)} placeholder="Ex: Alimentacao" /></div>
              <div className="grid gap-1.5"><Label>Data</Label><Input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} /></div>
            </div>
            <Button type="submit" className="w-full">Registrar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modalAccount} onOpenChange={setModalAccount}>
        <DialogContent><DialogHeader><DialogTitle>Nova conta</DialogTitle></DialogHeader>
          <form onSubmit={submitAccount} className="grid gap-4">
            <div className="grid gap-1.5"><Label>Nome</Label><Input value={accName} onChange={(e) => setAccName(e.target.value)} required /></div>
            <div className="grid gap-1.5"><Label>Tipo</Label>
              <Select value={accType} onValueChange={setAccType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid gap-1.5"><Label>Saldo (R$)</Label><Input type="number" step="0.01" value={accBalance} onChange={(e) => setAccBalance(e.target.value)} /></div>
            <Button type="submit" className="w-full">Criar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modalCard} onOpenChange={setModalCard}>
        <DialogContent><DialogHeader><DialogTitle>Novo cartao</DialogTitle></DialogHeader>
          <form onSubmit={submitCard} className="grid gap-4">
            <div className="grid gap-1.5"><Label>Nome</Label><Input value={cardName} onChange={(e) => setCardName(e.target.value)} required /></div>
            <div className="grid gap-1.5"><Label>Limite (R$)</Label><Input type="number" step="0.01" value={cardLimit} onChange={(e) => setCardLimit(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Dia fechamento</Label><Input type="number" min="1" max="31" value={cardClosing} onChange={(e) => setCardClosing(e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Dia vencimento</Label><Input type="number" min="1" max="31" value={cardDue} onChange={(e) => setCardDue(e.target.value)} /></div>
            </div>
            <Button type="submit" className="w-full">Criar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modalLimit} onOpenChange={setModalLimit}>
        <DialogContent><DialogHeader><DialogTitle>Novo limite</DialogTitle></DialogHeader>
          <form onSubmit={submitLimit} className="grid gap-4">
            <div className="grid gap-1.5"><Label>Categoria</Label><Input value={limCategory} onChange={(e) => setLimCategory(e.target.value)} required /></div>
            <div className="grid gap-1.5"><Label>Limite mensal (R$)</Label><Input type="number" step="0.01" value={limValue} onChange={(e) => setLimValue(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Alertar em {limAlert}%</Label><input type="range" min="10" max="100" step="5" value={limAlert} onChange={(e) => setLimAlert(e.target.value)} className="w-full" /></div>
            <Button type="submit" className="w-full">Criar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={modalGoal} onOpenChange={setModalGoal}>
        <DialogContent><DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
          <form onSubmit={submitGoal} className="grid gap-4">
            <div className="grid gap-1.5"><Label>Nome</Label><Input value={goalName} onChange={(e) => setGoalName(e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Valor alvo (R$)</Label><Input type="number" step="0.01" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Ja guardado (R$)</Label><Input type="number" step="0.01" value={goalCurrent} onChange={(e) => setGoalCurrent(e.target.value)} /></div>
            </div>
            <Button type="submit" className="w-full">Criar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!modalContribute} onOpenChange={(o) => { if (!o) setModalContribute(null); }}>
        <DialogContent><DialogHeader><DialogTitle>Registrar aporte</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5"><Label>Valor do aporte (R$)</Label><Input type="number" step="0.01" min="0" value={contributeAmount} onChange={(e) => setContributeAmount(e.target.value)} autoFocus /></div>
            <Button onClick={() => modalContribute && void submitContribute(modalContribute)} className="w-full">Confirmar aporte</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
