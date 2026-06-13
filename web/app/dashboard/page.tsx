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

export default function PainelPage() {
  const dispatch = useAppDispatch();
  const { transactions, limits, goals } = useAppSelector((s) => s.personalFinance);
  const { items: categories, seeded } = useAppSelector((s) => s.categories);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  useEffect(() => {
    void dispatch(fetchPersonalFinance());
  }, [dispatch]);

  useEffect(() => {
    if (!seeded) void dispatch(fetchCategories());
  }, [dispatch, seeded]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  // Filtrar transações do mês selecionado
  const monthTx = useMemo(() => transactions.filter((t) => {
    const d = new Date(t.occurredAt);
    return d.getFullYear() === year && d.getMonth() === month;
  }), [transactions, year, month]);

  const totalIn = useMemo(
    () => monthTx.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amountCents, 0),
    [monthTx],
  );
  const totalOut = useMemo(
    () => monthTx.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amountCents, 0),
    [monthTx],
  );
  const saldo = totalIn - totalOut;

  // Gastos por categoria
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTx.filter(t => t.type === 'EXPENSE')) {
      const key = t.category || 'Sem categoria';
      map.set(key, (map.get(key) ?? 0) + t.amountCents);
    }
    return Array.from(map.entries())
      .map(([name, cents]) => ({
        name,
        cents,
        color: categories.find(c => c.name === name)?.color ?? '#9ca3af',
      }))
      .sort((a, b) => b.cents - a.cents);
  }, [monthTx, categories]);

  // Limites com uso do mês
  const limitsWithUsage = useMemo(() => limits.filter(l => l.active !== false).map((l) => {
    const used = monthTx
      .filter(t => t.type === 'EXPENSE' && t.category === l.category)
      .reduce((s, t) => s + t.amountCents, 0);
    const p = pct(used, l.limitCents);
    return { ...l, usedCents: used, percentUsed: p };
  }), [limits, monthTx]);

  const alertLimits = limitsWithUsage.filter(l => l.percentUsed >= (l.alertThresholdPercent ?? 80));

  // Lançamentos recentes (últimos 8)
  const recentes = useMemo(
    () => [...monthTx].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 8),
    [monthTx],
  );

  async function onDelete(id: string, desc: string) {
    if (!window.confirm(`Excluir "${desc}"?`)) return;
    const res = await dispatch(deletePersonalTransaction(id));
    if (deletePersonalTransaction.fulfilled.match(res)) toast.success('Lançamento excluído');
    else toast.error('Erro ao excluir');
  }

  const topCatTotal = byCategory.reduce((s, c) => s + c.cents, 0);

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header com navegador de mês */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-sm font-bold text-gray-900">
            {MONTHS[month]} {year}
            {isCurrentMonth && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Hoje</span>}
          </h1>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4">

        {/* Cartão de saldo */}
        <div
          className="rounded-2xl p-6 text-white"
          style={{ background: saldo >= 0 ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Saldo do mês</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{brl(saldo)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/20 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 opacity-80" />
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Entradas</span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums">{brl(totalIn)}</p>
            </div>
            <div className="rounded-xl bg-white/20 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 opacity-80" />
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Saídas</span>
              </div>
              <p className="mt-1 text-lg font-bold tabular-nums">{brl(totalOut)}</p>
            </div>
          </div>
        </div>

        {/* Alertas de limite */}
        {alertLimits.length > 0 && (
          <div className="space-y-2">
            {alertLimits.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-red-700">
                    Limite de <span className="font-bold">{l.category}</span>: {l.percentUsed}% usado
                  </p>
                  <p className="text-xs text-red-500">{brl(l.usedCents)} de {brl(l.limitCents)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gastos por categoria */}
        {byCategory.length > 0 && (
          <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Gastos por categoria</h2>
              <Link href="/dashboard/relatorios" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Ver mais <ArrowRight className="h-3.5 w-3.5" />
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
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${p}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metas */}
        {goals.length > 0 && (
          <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Metas</h2>
              <Link href="/dashboard/financeiro/pessoal" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                Gerenciar <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-4">
              {goals.slice(0, 3).map((goal) => {
                const p = pct(goal.currentCents, goal.targetCents);
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
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${p}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {brl(goal.currentCents)} de {brl(goal.targetCents)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lançamentos recentes */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
            <h2 className="text-sm font-bold text-gray-900">Lançamentos de {MONTHS[month]}</h2>
            <Link href="/dashboard/lancamentos" className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentes.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-sm text-gray-400">Nenhum lançamento este mês</p>
              <p className="mt-1 text-xs text-gray-300">Clique no botão verde para adicionar</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentes.map((t) => {
                const isIncome = t.type === 'INCOME';
                const catColor = categories.find(c => c.name === t.category)?.color ?? '#9ca3af';
                return (
                  <div key={t.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/60">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${catColor}20` }}
                    >
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

        {/* Espaço para o botão flutuante não cobrir conteúdo */}
        <div className="h-20" />
      </div>
    </div>
  );
}
