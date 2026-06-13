'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonalFinance, deletePersonalTransaction } from '@/store/personalFinanceSlice';
import { fetchCategories } from '@/store/categoriesSlice';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Target, AlertCircle, Trash2, ChevronRight as ArrowRight,
  Plus, Smile, Frown, Meh,
} from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function pct(used: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

function SaldoMessage({ saldo, totalOut, prevOut }: { saldo: number; totalOut: number; prevOut: number }) {
  if (totalOut === 0 && saldo === 0) return null;
  const diff = totalOut - prevOut;
  const pctDiff = prevOut > 0 ? Math.round((Math.abs(diff) / prevOut) * 100) : 0;

  if (saldo > 0 && diff < 0 && pctDiff > 5) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm text-white">
        <Smile className="h-4 w-4 flex-shrink-0" />
        <span>Você gastou {pctDiff}% a menos que o mês passado!</span>
      </div>
    );
  }
  if (saldo < 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm text-white">
        <Frown className="h-4 w-4 flex-shrink-0" />
        <span>Suas saídas ultrapassaram suas entradas este mês.</span>
      </div>
    );
  }
  if (diff > 0 && pctDiff > 10) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm text-white">
        <Meh className="h-4 w-4 flex-shrink-0" />
        <span>Você gastou {pctDiff}% a mais que o mês passado.</span>
      </div>
    );
  }
  return null;
}

export default function PainelPage() {
  const dispatch = useAppDispatch();
  const { transactions, limits, goals } = useAppSelector((s) => s.personalFinance);
  const { items: categories, seeded } = useAppSelector((s) => s.categories);

  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  useEffect(() => { void dispatch(fetchPersonalFinance()); }, [dispatch]);
  useEffect(() => { if (!seeded) void dispatch(fetchCategories()); }, [dispatch, seeded]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const monthTx = useMemo(() => transactions.filter((t) => {
    const d = new Date(t.occurredAt);
    return d.getFullYear() === year && d.getMonth() === month;
  }), [transactions, year, month]);

  const totalIn  = useMemo(() => monthTx.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amountCents, 0), [monthTx]);
  const totalOut = useMemo(() => monthTx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amountCents, 0), [monthTx]);
  const saldo    = totalIn - totalOut;

  const prevMonthIdx = month === 0 ? 11 : month - 1;
  const prevYear     = month === 0 ? year - 1 : year;
  const prevOut = useMemo(() => transactions
    .filter(t => { const d = new Date(t.occurredAt); return d.getFullYear() === prevYear && d.getMonth() === prevMonthIdx && t.type === 'EXPENSE'; })
    .reduce((s, t) => s + t.amountCents, 0),
  [transactions, prevYear, prevMonthIdx]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTx.filter(t => t.type === 'EXPENSE')) {
      const key = t.category || 'Sem categoria';
      map.set(key, (map.get(key) ?? 0) + t.amountCents);
    }
    return Array.from(map.entries())
      .map(([name, cents]) => ({ name, cents, color: categories.find(c => c.name === name)?.color ?? '#9ca3af' }))
      .sort((a, b) => b.cents - a.cents);
  }, [monthTx, categories]);

  const limitsWithUsage = useMemo(() => limits.filter(l => l.active !== false).map((l) => {
    const used = monthTx.filter(t => t.type === 'EXPENSE' && t.category === l.category).reduce((s, t) => s + t.amountCents, 0);
    return { ...l, usedCents: used, percentUsed: pct(used, l.limitCents) };
  }), [limits, monthTx]);

  const alertLimits = limitsWithUsage.filter(l => l.percentUsed >= (l.alertThresholdPercent ?? 80));

  const recentes = useMemo(
    () => [...monthTx].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 8),
    [monthTx],
  );

  async function onDelete(id: string, desc: string) {
    if (!window.confirm(`Excluir "${desc}"?`)) return;
    const res = await dispatch(deletePersonalTransaction(id));
    if (deletePersonalTransaction.fulfilled.match(res)) toast.success('Removido');
    else toast.error('Erro ao excluir');
  }

  const topCatTotal = byCategory.reduce((s, c) => s + c.cents, 0);
  const hasAnyData  = transactions.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navegador de mês */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-sm font-bold text-gray-900">
            {MONTHS[month]} {year}
            {isCurrentMonth && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Este mês</span>}
          </h1>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30">
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4">

        {/* Onboarding para quem nunca usou */}
        {!hasAnyData && (
          <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100">
              <Plus className="h-7 w-7 text-indigo-500" />
            </div>
            <h2 className="text-base font-bold text-indigo-800">Bem-vindo! Vamos começar.</h2>
            <p className="mt-1 text-sm text-indigo-600">
              Clique no botão verde no canto inferior direito para registrar sua primeira entrada ou saída de dinheiro.
            </p>
            <p className="mt-3 text-xs text-indigo-400">Leva menos de 10 segundos!</p>
          </div>
        )}

        {/* Cartão de saldo */}
        <div
          data-tour="saldo"
          className="rounded-2xl p-6 text-white"
          style={{ background: saldo >= 0 ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
            {saldo >= 0 ? 'O que sobrou esse mês' : 'Quanto ficou negativo'}
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{brl(saldo)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/20 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 opacity-80" />
                <span className="text-xs font-semibold uppercase opacity-80">Entrou</span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums">{brl(totalIn)}</p>
            </div>
            <div className="rounded-xl bg-white/20 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 opacity-80" />
                <span className="text-xs font-semibold uppercase opacity-80">Saiu</span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums">{brl(totalOut)}</p>
            </div>
          </div>
          {hasAnyData && (
            <div className="mt-3">
              <SaldoMessage saldo={saldo} totalOut={totalOut} prevOut={prevOut} />
            </div>
          )}
        </div>

        {/* Alertas de limite */}
        {alertLimits.length > 0 && (
          <div className="space-y-2">
            {alertLimits.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-red-700">
                    Atenção: você usou {l.percentUsed}% do limite de <strong>{l.category}</strong>
                  </p>
                  <p className="text-xs text-red-500">Gastou {brl(l.usedCents)} do limite de {brl(l.limitCents)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Para onde foi o dinheiro */}
        {byCategory.length > 0 && (
          <div data-tour="categorias" className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Para onde foi o dinheiro</h2>
                <p className="text-xs text-gray-400">Top categorias do mês</p>
              </div>
              <Link href="/dashboard/relatorios" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Ver tudo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {byCategory.slice(0, 5).map((cat) => {
                const p = pct(cat.cents, topCatTotal);
                return (
                  <div key={cat.name}>
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                        <span className="text-sm text-gray-700">{cat.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{brl(cat.cents)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, background: cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Minhas metas */}
        {goals.length > 0 && (
          <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Minhas metas</h2>
                <p className="text-xs text-gray-400">Quanto já juntou para cada objetivo</p>
              </div>
              <Link href="/dashboard/financeiro/pessoal" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Gerenciar <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-4">
              {goals.slice(0, 3).map((goal) => {
                const p = pct(goal.currentCents, goal.targetCents);
                const falta = goal.targetCents - goal.currentCents;
                return (
                  <div key={goal.id}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800">{goal.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-indigo-600">{p}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${p}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {p >= 100 ? 'Meta atingida! Parabéns!' : `Faltam ${brl(Math.max(0, falta))} para atingir a meta`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Últimas movimentações */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Últimas movimentações</h2>
              <p className="text-xs text-gray-400">O que entrou e saiu recentemente</p>
            </div>
            <Link href="/dashboard/lancamentos" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentes.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">Nenhum lançamento em {MONTHS[month]}</p>
              <p className="mt-1 text-xs text-gray-300">Use o botão verde para registrar</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentes.map((t) => {
                const isIncome = t.type === 'INCOME';
                const catColor = categories.find(c => c.name === t.category)?.color ?? '#9ca3af';
                return (
                  <div key={t.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${catColor}20` }}>
                      {isIncome
                        ? <TrendingUp className="h-4 w-4" style={{ color: catColor }} />
                        : <TrendingDown className="h-4 w-4" style={{ color: catColor }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{t.description}</p>
                      <div className="flex items-center gap-1.5">
                        {t.category && (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: catColor }} />
                            <span className="text-xs text-gray-400">{t.category}</span>
                            <span className="text-gray-200">·</span>
                          </>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(t.occurredAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-sm font-bold tabular-nums ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isIncome ? '+' : '-'}{brl(t.amountCents)}
                    </span>
                    <button
                      onClick={() => void onDelete(t.id, t.description)}
                      className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-400 group-hover:flex"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Links rápidos */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/carteira"
            className="flex items-center gap-3 rounded-2xl bg-white p-4 hover:bg-gray-50"
            style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Minha Carteira</p>
              <p className="text-[11px] text-gray-400">Contas e bancos</p>
            </div>
          </Link>
          <Link href="/dashboard/relatorios"
            className="flex items-center gap-3 rounded-2xl bg-white p-4 hover:bg-gray-50"
            style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
              <Target className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800">Relatórios</p>
              <p className="text-[11px] text-gray-400">Ver análises e PDF</p>
            </div>
          </Link>
        </div>

        <div className="h-20" />
      </div>
    </div>
  );
}
