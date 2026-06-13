'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonalFinance } from '@/store/personalFinanceSlice';
import { fetchCategories } from '@/store/categoriesSlice';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function pct(part: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export default function RelatoriosPage() {
  const dispatch = useAppDispatch();
  const { transactions } = useAppSelector((s) => s.personalFinance);
  const { items: categories, seeded } = useAppSelector((s) => s.categories);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [tab, setTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');

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
    return d.getFullYear() === year && d.getMonth() === month && t.type === tab;
  }), [transactions, year, month, tab]);

  const total = useMemo(() => monthTx.reduce((s, t) => s + t.amountCents, 0), [monthTx]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of monthTx) {
      const key = t.category || 'Sem categoria';
      map.set(key, (map.get(key) ?? 0) + t.amountCents);
    }
    return Array.from(map.entries())
      .map(([name, cents]) => ({
        name,
        cents,
        color: categories.find(c => c.name === name)?.color ?? '#9ca3af',
        pct: pct(cents, total),
      }))
      .sort((a, b) => b.cents - a.cents);
  }, [monthTx, categories, total]);

  // Histórico dos últimos 6 meses
  const history = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      let m = month - (5 - i);
      let y = year;
      while (m < 0) { m += 12; y--; }
      const tx = transactions.filter(t => {
        const d = new Date(t.occurredAt);
        return d.getFullYear() === y && d.getMonth() === m && t.type === tab;
      });
      return {
        label: MONTHS[m].slice(0, 3),
        cents: tx.reduce((s, t) => s + t.amountCents, 0),
        isSelected: y === year && m === month,
      };
    });
  }, [transactions, year, month, tab]);

  const maxHist = Math.max(...history.map(h => h.cents), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-sm font-bold text-gray-900">{MONTHS[month]} {year}</h1>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30">
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4">

        {/* Tab entrada / saída */}
        <div className="grid grid-cols-2 gap-2">
          {(['EXPENSE', 'INCOME'] as const).map((t) => {
            const isActive = tab === t;
            const isExp = t === 'EXPENSE';
            const monthTotal = transactions.filter(tx => {
              const d = new Date(tx.occurredAt);
              return d.getFullYear() === year && d.getMonth() === month && tx.type === t;
            }).reduce((s, tx) => s + tx.amountCents, 0);
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                  isActive
                    ? isExp ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'
                    : 'border-gray-100 bg-white hover:bg-gray-50'
                }`}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                  isActive
                    ? isExp ? 'bg-red-100' : 'bg-emerald-100'
                    : 'bg-gray-100'
                }`}>
                  {isExp
                    ? <TrendingDown className={`h-4 w-4 ${isActive ? 'text-red-500' : 'text-gray-400'}`} />
                    : <TrendingUp className={`h-4 w-4 ${isActive ? 'text-emerald-500' : 'text-gray-400'}`} />}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${isActive ? isExp ? 'text-red-600' : 'text-emerald-600' : 'text-gray-400'}`}>
                    {isExp ? 'Saídas' : 'Entradas'}
                  </p>
                  <p className={`text-base font-bold tabular-nums ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                    {brl(monthTotal)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Histórico em barras */}
        <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Últimos 6 meses</p>
          <div className="flex items-end gap-2 h-24">
            {history.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: 72 }}>
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${h.isSelected ? (tab === 'EXPENSE' ? 'bg-red-400' : 'bg-emerald-400') : 'bg-gray-200'}`}
                    style={{ height: `${Math.max(4, pct(h.cents, maxHist) * 0.72)}px` }}
                  />
                </div>
                <span className={`text-[10px] font-semibold ${h.isSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                  {h.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {byCategory.length === 0 ? (
          <div className="rounded-2xl bg-white py-14 text-center" style={{ border: '1px solid #e5e7eb' }}>
            <p className="text-sm text-gray-400">Sem lançamentos em {MONTHS[month]}</p>
          </div>
        ) : (
          <>
            {/* Donut */}
            <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Por categoria</p>
              <div className="flex items-center gap-4">
                <div className="h-36 w-36 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byCategory} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                        paddingAngle={2} dataKey="cents" strokeWidth={0}>
                        {byCategory.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => (typeof v === 'number' ? brl(v) : v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  {byCategory.slice(0, 5).map((c) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="flex-1 truncate text-xs text-gray-600">{c.name}</span>
                      <span className="text-xs font-bold text-gray-400">{c.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Lista por categoria */}
            <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
              <div className="border-b border-gray-50 px-5 py-4">
                <p className="text-sm font-bold text-gray-900">Detalhes por categoria</p>
              </div>
              <div className="divide-y divide-gray-50">
                {byCategory.map((cat) => (
                  <div key={cat.name} className="px-5 py-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                        <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900 tabular-nums">{brl(cat.cents)}</span>
                        <span className="ml-2 text-xs text-gray-400">{cat.pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${cat.pct}%`, background: cat.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="h-20" />
      </div>
    </div>
  );
}
