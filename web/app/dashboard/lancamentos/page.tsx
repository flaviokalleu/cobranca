'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonalFinance, deletePersonalTransaction } from '@/store/personalFinanceSlice';
import { fetchCategories } from '@/store/categoriesSlice';
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Trash2, Search, X } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export default function LancamentosPage() {
  const dispatch = useAppDispatch();
  const { transactions } = useAppSelector((s) => s.personalFinance);
  const { items: categories, seeded } = useAppSelector((s) => s.categories);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [search, setSearch] = useState('');

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions
      .filter((t) => {
        const d = new Date(t.occurredAt);
        if (d.getFullYear() !== year || d.getMonth() !== month) return false;
        if (filter !== 'ALL' && t.type !== filter) return false;
        if (q && !t.description.toLowerCase().includes(q) && !(t.category ?? '').toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [transactions, year, month, filter, search]);

  const totalIn = filtered.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amountCents, 0);
  const totalOut = filtered.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amountCents, 0);

  // Agrupar por dia
  const byDay = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const key = t.occurredAt.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  async function onDelete(id: string, desc: string) {
    if (!window.confirm(`Excluir "${desc}"?`)) return;
    const res = await dispatch(deletePersonalTransaction(id));
    if (deletePersonalTransaction.fulfilled.match(res)) toast.success('Excluído');
    else toast.error('Erro ao excluir');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-2xl">
          <div className="flex h-14 items-center justify-between px-4">
            <button onClick={prevMonth} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
            <h1 className="text-sm font-bold text-gray-900">{MONTHS[month]} {year}</h1>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100 disabled:opacity-30">
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          {/* Filtros */}
          <div className="flex gap-2 px-4 pb-3">
            {(['ALL', 'INCOME', 'EXPENSE'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === f
                    ? f === 'INCOME' ? 'bg-emerald-500 text-white'
                      : f === 'EXPENSE' ? 'bg-red-500 text-white'
                      : 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f === 'ALL' ? 'Todos' : f === 'INCOME' ? `Entradas · ${brl(totalIn)}` : `Saídas · ${brl(totalOut)}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-3 p-4">
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Buscar lançamento ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-900 outline-none focus:border-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white py-14 text-center" style={{ border: '1px solid #e5e7eb' }}>
            <p className="text-sm text-gray-400">Nenhum lançamento encontrado</p>
          </div>
        ) : (
          byDay.map(([dateKey, txs]) => {
            const d = new Date(dateKey + 'T12:00:00');
            const isToday = dateKey === now.toISOString().slice(0, 10);
            return (
              <div key={dateKey} className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-center gap-2 border-b border-gray-50 bg-gray-50/60 px-4 py-2">
                  <span className="text-xs font-bold text-gray-500">
                    {isToday ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    {txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amountCents, 0) > 0 &&
                      <span className="text-emerald-600 font-semibold">
                        +{brl(txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amountCents, 0))}
                      </span>}
                    {txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amountCents, 0) > 0 &&
                      <span className="ml-2 text-red-500 font-semibold">
                        -{brl(txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amountCents, 0))}
                      </span>}
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {txs.map((t) => {
                    const isIncome = t.type === 'INCOME';
                    const catColor = categories.find(c => c.name === t.category)?.color ?? '#9ca3af';
                    return (
                      <div key={t.id} className="group flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/60">
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
                          {t.category && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: catColor }} />
                              <span className="text-xs text-gray-400">{t.category}</span>
                            </div>
                          )}
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
              </div>
            );
          })
        )}
        <div className="h-20" />
      </div>
    </div>
  );
}
