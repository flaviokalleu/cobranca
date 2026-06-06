'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCashflow, type CashflowRow } from '@/store/financeSlice';
import { fetchFinancialEntries } from '@/store/financialEntriesSlice';
import {
  TrendingUp, TrendingDown, CircleDollarSign, MessageCircle, ArrowUpRight, ArrowDownRight, CalendarDays,
} from 'lucide-react';

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function lastOfMonth() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

type UnifiedRow = {
  id: string;
  date: string;
  description: string;
  category?: string | null;
  recurrence?: string | null;
  status: string;
  inCents: number;
  outCents: number;
  balanceCents: number;
  source: 'manual' | 'whatsapp';
  tipo?: string;
};

function StatusBadge({ status, source }: { status: string; source: string }) {
  if (source === 'whatsapp') {
    const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
      alta:  { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Confirmado' },
      media: { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400',   label: 'Provável'   },
      baixa: { bg: 'bg-red-50',     text: 'text-red-600',     dot: 'bg-red-500',     label: 'Revisar'    },
    };
    const s = map[status] ?? map.baixa;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg} ${s.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
      </span>
    );
  }
  if (status === 'PAID')
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Pago</span>;
  if (status === 'CANCELED')
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-gray-400" />Cancelado</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Pendente</span>;
}

export default function FluxoCaixaPage() {
  const dispatch = useAppDispatch();
  const { cashflow } = useAppSelector((s) => s.finance);
  const { entries: waEntries } = useAppSelector((s) => s.financialEntries);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    void dispatch(fetchCashflow(from || to ? { from: from || undefined, to: to || undefined } : undefined));
    void dispatch(fetchFinancialEntries());
  }, [dispatch, from, to]);

  // Unifica cashflow manual + entradas WhatsApp
  const { rows, totalIn, totalOut, balance } = useMemo(() => {
    // linhas manuais
    const manualRows: UnifiedRow[] = cashflow.rows.map((r: CashflowRow) => ({
      id: r.id,
      date: r.date,
      description: r.description,
      category: r.category,
      recurrence: r.recurrence,
      status: r.status,
      inCents: r.inCents ?? 0,
      outCents: r.outCents ?? 0,
      balanceCents: r.balanceCents,
      source: 'manual' as const,
    }));

    // linhas WA
    const waRows: UnifiedRow[] = waEntries.map(e => ({
      id: `wa-${e.id}`,
      date: e.dataTransacao ?? e.createdAt,
      description: e.descricao,
      category: e.pagadorNome ?? e.recebedorNome ?? undefined,
      recurrence: e.recorrencia,
      status: e.confianca,
      inCents: e.tipo === 'receita' ? e.valorCents : 0,
      outCents: e.tipo === 'gasto' ? e.valorCents : 0,
      balanceCents: e.tipo === 'receita' ? e.valorCents : -e.valorCents,
      source: 'whatsapp' as const,
      tipo: e.tipo,
    }));

    const all = [...manualRows, ...waRows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // recalcula saldo acumulado
    let running = 0;
    for (const r of all) {
      running += r.inCents - r.outCents;
      r.balanceCents = running;
    }

    const totalIn  = all.reduce((s, r) => s + r.inCents, 0);
    const totalOut = all.reduce((s, r) => s + r.outCents, 0);
    const balance  = totalIn - totalOut;

    return { rows: all.reverse(), totalIn, totalOut, balance };
  }, [cashflow.rows, waEntries]);

  const waCount = waEntries.length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <div>
            <h1 className="text-base font-bold text-gray-900">Fluxo de Caixa</h1>
            <p className="hidden text-xs text-gray-400 sm:block">
              Entradas e saídas · {rows.length} movimentações
            </p>
          </div>
        </div>
      </div>

      {/* Filtro de periodo */}
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-5 py-3" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            Periodo
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-gray-400">De</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-gray-400">Ate</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            {[
              { label: 'Este mes', f: firstOfMonth(), t: lastOfMonth() },
              { label: 'Tudo', f: '', t: '' },
            ].map((opt) => (
              <button key={opt.label} onClick={() => { setFrom(opt.f); setTo(opt.t); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${from === opt.f && to === opt.t ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-4 pt-4 sm:px-6 sm:pb-6">

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Saldo atual', value: brl(balance), icon: CircleDollarSign, bg: balance >= 0 ? 'bg-emerald-50' : 'bg-red-50', iconColor: balance >= 0 ? 'text-emerald-500' : 'text-red-500', textColor: balance >= 0 ? 'text-emerald-700' : 'text-red-600' },
            { label: 'Total entradas', value: brl(totalIn), icon: TrendingUp, bg: 'bg-blue-50', iconColor: 'text-blue-500', textColor: 'text-blue-700' },
            { label: 'Total saídas', value: brl(totalOut), icon: TrendingDown, bg: 'bg-rose-50', iconColor: 'text-rose-500', textColor: 'text-rose-700' },
            { label: 'WhatsApp', value: `${waCount} lançamento${waCount !== 1 ? 's' : ''}`, icon: MessageCircle, bg: 'bg-green-50', iconColor: 'text-green-500', textColor: 'text-green-700' },
          ].map(k => (
            <div key={k.label} className={`rounded-2xl ${k.bg} p-4`} style={{ border: '1px solid #e5e7eb' }}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{k.label}</p>
                <k.icon className={`h-3.5 w-3.5 ${k.iconColor}`} />
              </div>
              <p className={`text-lg font-bold tabular-nums ${k.textColor}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Mobile: cards */}
        <div className="space-y-2 sm:hidden">
          {rows.length === 0 && (
            <div className="rounded-2xl bg-white py-14 text-center" style={{ border: '1px solid #e5e7eb' }}>
              <CircleDollarSign className="mx-auto mb-2 h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-400">Sem movimentações ainda</p>
            </div>
          )}
          {rows.map(row => (
            <div key={row.id} className="rounded-2xl bg-white p-4" style={{ border: '1px solid #e5e7eb' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{row.description}</p>
                  {row.category && <p className="truncate text-xs text-gray-400">{row.category}</p>}
                  <div className="mt-1.5 flex items-center gap-2">
                    {row.source === 'whatsapp'
                      ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700"><MessageCircle className="h-3 w-3" />WhatsApp</span>
                      : <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">Manual</span>}
                    <StatusBadge status={row.status} source={row.source} />
                    <span className="text-[10px] text-gray-400">{fmtDate(row.date)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {row.inCents > 0 && (
                    <p className="flex items-center gap-0.5 justify-end text-sm font-bold text-emerald-600">
                      <ArrowUpRight className="h-3.5 w-3.5" />{brl(row.inCents)}
                    </p>
                  )}
                  {row.outCents > 0 && (
                    <p className="flex items-center gap-0.5 justify-end text-sm font-bold text-red-600">
                      <ArrowDownRight className="h-3.5 w-3.5" />{brl(row.outCents)}
                    </p>
                  )}
                  <p className={`mt-1 text-xs font-semibold ${row.balanceCents >= 0 ? 'text-gray-600' : 'text-red-500'}`}>
                    Saldo: {brl(row.balanceCents)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop: tabela */}
        <div className="hidden overflow-hidden rounded-2xl bg-white sm:block" style={{ border: '1px solid #e5e7eb' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/60">
                  {['Origem', 'Data', 'Descrição', 'Categoria', 'Recorrência', 'Status', 'Entrada', 'Saída', 'Saldo'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 last:text-right [&:nth-child(7)]:text-right [&:nth-child(8)]:text-right">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(row => (
                  <tr key={row.id} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-5 py-4">
                      {row.source === 'whatsapp'
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700"><MessageCircle className="h-3 w-3" />WhatsApp</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">Manual</span>}
                    </td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{fmtDate(row.date)}</td>
                    <td className="px-5 py-4">
                      <span className="block max-w-[200px] truncate font-medium text-gray-900">{row.description}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{row.category ?? '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        row.recurrence === 'MONTHLY' || row.recurrence === 'MENSAL'
                          ? 'bg-violet-50 text-violet-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {row.recurrence === 'MONTHLY' || row.recurrence === 'MENSAL' ? 'Mensal' : 'Avulso'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} source={row.source} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {row.inCents > 0
                        ? <span className="font-bold tabular-nums text-emerald-600">+{brl(row.inCents)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {row.outCents > 0
                        ? <span className="font-bold tabular-nums text-red-600">−{brl(row.outCents)}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={`font-bold tabular-nums ${row.balanceCents >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {brl(row.balanceCents)}
                      </span>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-14 text-center">
                      <CircleDollarSign className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                      <p className="text-sm text-gray-400">Sem movimentações ainda</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
