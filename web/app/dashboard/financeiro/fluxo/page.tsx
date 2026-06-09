'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCashflow, type CashflowRow } from '@/store/financeSlice';
import { fetchFinancialEntries } from '@/store/financialEntriesSlice';
import { API_URL, api, getToken } from '@/lib/http-client';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { NotificationBell } from '@/components/notification-bell';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Download,
  MessageCircle,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

function firstOfMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function lastOfMonth() {
  const date = new Date();
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

function nextDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const normalize = (value?: string | null) => (value ?? '').toLowerCase();

type Source = 'manual' | 'whatsapp';
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
  source: Source;
  tipo?: string;
};

interface Projection {
  initialCashCents: number;
  alert: boolean;
  alertDate?: string | null;
  alertAmountCents: number;
  days: Array<{ date: string; inCents: number; outCents: number; accumulatedCents: number }>;
}

function recurrenceLabel(recurrence?: string | null) {
  return recurrence === 'MONTHLY' || recurrence === 'MENSAL' ? 'Mensal' : 'Avulso';
}

function statusLabel(row: UnifiedRow) {
  if (row.source === 'whatsapp') {
    if (row.status === 'alta') return 'Confirmado';
    if (row.status === 'media') return 'Provavel';
    return 'Revisar';
  }
  if (row.status === 'PAID') return 'Pago';
  if (row.status === 'CANCELED') return 'Cancelado';
  return 'Pendente';
}

function isRealized(row: UnifiedRow) {
  if (row.source === 'whatsapp') return row.status === 'alta';
  return row.status === 'PAID';
}

function isPending(row: UnifiedRow) {
  return row.status !== 'CANCELED' && !isRealized(row);
}

function StatusBadge({ row }: { row: UnifiedRow }) {
  if (row.source === 'whatsapp') {
    const map: Record<string, { bg: string; text: string; dot: string }> = {
      alta: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
      media: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
      baixa: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
    };
    const style = map[row.status] ?? map.baixa;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.bg} ${style.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
        {statusLabel(row)}
      </span>
    );
  }
  if (row.status === 'PAID') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Pago
      </span>
    );
  }
  if (row.status === 'CANCELED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
        Cancelado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Pendente
    </span>
  );
}

export default function FluxoCaixaPage() {
  const dispatch = useAppDispatch();
  const cashflow = useAppSelector((state) => state.finance.cashflow);
  const whatsappEntries = useAppSelector((state) => state.financialEntries.entries ?? []);

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(lastOfMonth());
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [movementFilter, setMovementFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [recurrenceFilter, setRecurrenceFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [projection, setProjection] = useState<Projection | null>(null);

  useEffect(() => {
    void dispatch(fetchCashflow(from || to ? { from: from || undefined, to: to || undefined } : undefined));
    void dispatch(fetchFinancialEntries());
    void api<Projection>('GET', '/finance/cashflow-projection?days=90').then((res) => {
      if (res.status < 400) setProjection(res.data);
    });
  }, [dispatch, from, to]);

  const allRows = useMemo(() => {
    const manualRows: UnifiedRow[] = (cashflow?.rows ?? []).map((row: CashflowRow) => ({
      id: row.id,
      date: row.date,
      description: row.description,
      category: row.category,
      recurrence: row.recurrence,
      status: row.status,
      inCents: row.inCents ?? 0,
      outCents: row.outCents ?? 0,
      balanceCents: row.balanceCents,
      source: 'manual',
    }));

    const whatsappRows: UnifiedRow[] = whatsappEntries.map((entry) => ({
      id: `wa-${entry.id}`,
      date: entry.dataTransacao ?? entry.createdAt,
      description: entry.descricao,
      category: entry.pagadorNome ?? entry.recebedorNome ?? undefined,
      recurrence: entry.recorrencia,
      status: entry.confianca,
      inCents: entry.tipo === 'receita' ? entry.valorCents : 0,
      outCents: entry.tipo === 'gasto' ? entry.valorCents : 0,
      balanceCents: entry.tipo === 'receita' ? entry.valorCents : -entry.valorCents,
      source: 'whatsapp',
      tipo: entry.tipo,
    }));

    return [...manualRows, ...whatsappRows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [cashflow.rows, whatsappEntries]);

  const categoryOptions = useMemo(() => {
    const categories = allRows
      .map((row) => row.category)
      .filter((category): category is string => Boolean(category));
    return Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b));
  }, [allRows]);

  const rows = useMemo(() => {
    const fromTime = from ? new Date(from).getTime() : null;
    const toDate = to ? new Date(to) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);
    const toTime = toDate?.getTime() ?? null;
    const text = normalize(query);

    const filtered = allRows.filter((row) => {
      const rowTime = new Date(row.date).getTime();
      const inRange = (!fromTime || rowTime >= fromTime) && (!toTime || rowTime <= toTime);
      const sourceOk = sourceFilter === 'ALL' || row.source === sourceFilter;
      const movementOk =
        movementFilter === 'ALL' ||
        (movementFilter === 'IN' && row.inCents > 0) ||
        (movementFilter === 'OUT' && row.outCents > 0);
      const statusOk =
        statusFilter === 'ALL' ||
        (statusFilter === 'REALIZED' && isRealized(row)) ||
        (statusFilter === 'PENDING' && isPending(row)) ||
        (statusFilter === 'REVIEW' && row.source === 'whatsapp' && row.status === 'baixa') ||
        row.status === statusFilter;
      const recurrenceOk =
        recurrenceFilter === 'ALL' ||
        (recurrenceFilter === 'MONTHLY' &&
          (row.recurrence === 'MONTHLY' || row.recurrence === 'MENSAL')) ||
        (recurrenceFilter === 'ONCE' &&
          row.recurrence !== 'MONTHLY' &&
          row.recurrence !== 'MENSAL');
      const categoryOk = categoryFilter === 'ALL' || row.category === categoryFilter;
      const queryOk =
        !text ||
        normalize(row.description).includes(text) ||
        normalize(row.category).includes(text) ||
        statusLabel(row).toLowerCase().includes(text);

      return inRange && sourceOk && movementOk && statusOk && recurrenceOk && categoryOk && queryOk;
    });

    let running = 0;
    return filtered
      .map((row) => {
        running += row.inCents - row.outCents;
        return { ...row, balanceCents: running };
      })
      .reverse();
  }, [
    allRows,
    categoryFilter,
    from,
    movementFilter,
    query,
    recurrenceFilter,
    sourceFilter,
    statusFilter,
    to,
  ]);

  const totals = useMemo(() => {
    const totalIn = rows.reduce((sum, row) => sum + row.inCents, 0);
    const totalOut = rows.reduce((sum, row) => sum + row.outCents, 0);
    const realizedIn = rows.filter(isRealized).reduce((sum, row) => sum + row.inCents, 0);
    const realizedOut = rows.filter(isRealized).reduce((sum, row) => sum + row.outCents, 0);
    const pendingIn = rows.filter(isPending).reduce((sum, row) => sum + row.inCents, 0);
    const pendingOut = rows.filter(isPending).reduce((sum, row) => sum + row.outCents, 0);
    const whatsappCount = rows.filter((row) => row.source === 'whatsapp').length;

    return {
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      realizedIn,
      realizedOut,
      realizedBalance: realizedIn - realizedOut,
      pendingIn,
      pendingOut,
      pendingBalance: pendingIn - pendingOut,
      whatsappCount,
    };
  }, [rows]);

  function applyPreset(preset: 'MONTH' | 'NEXT_30' | 'ALL') {
    if (preset === 'MONTH') {
      setFrom(firstOfMonth());
      setTo(lastOfMonth());
      return;
    }
    if (preset === 'NEXT_30') {
      setFrom(nextDays(0));
      setTo(nextDays(30));
      return;
    }
    setFrom('');
    setTo('');
  }

  function clearAdvancedFilters() {
    setSourceFilter('ALL');
    setMovementFilter('ALL');
    setStatusFilter('ALL');
    setRecurrenceFilter('ALL');
    setCategoryFilter('ALL');
    setQuery('');
  }

  async function downloadReport(type: 'cashflow' | 'summary') {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const token = getToken();
    const response = await fetch(
      `${API_URL}/finance/reports/${type}.pdf${params.toString() ? `?${params}` : ''}`,
      { headers: token ? { authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) return;
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = type === 'cashflow' ? 'fluxo-de-caixa.pdf' : 'resumo-financeiro.pdf';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  const kpis = [
    {
      label: 'Entradas no periodo',
      value: brl(totals.totalIn),
      sub: `Recebido: ${brl(totals.realizedIn)} | A receber: ${brl(totals.pendingIn)}`,
      icon: TrendingUp,
      bg: 'bg-blue-50',
      iconColor: 'text-blue-500',
      textColor: 'text-blue-700',
    },
    {
      label: 'Saidas no periodo',
      value: brl(totals.totalOut),
      sub: `Pago: ${brl(totals.realizedOut)} | A pagar: ${brl(totals.pendingOut)}`,
      icon: TrendingDown,
      bg: 'bg-rose-50',
      iconColor: 'text-rose-500',
      textColor: 'text-rose-700',
    },
    {
      label: 'Saldo previsto',
      value: brl(totals.balance),
      sub: `Realizado: ${brl(totals.realizedBalance)}`,
      icon: CircleDollarSign,
      bg: totals.balance >= 0 ? 'bg-emerald-50' : 'bg-red-50',
      iconColor: totals.balance >= 0 ? 'text-emerald-500' : 'text-red-500',
      textColor: totals.balance >= 0 ? 'text-emerald-700' : 'text-red-600',
    },
    {
      label: 'Em aberto',
      value: brl(Math.abs(totals.pendingBalance)),
      sub: `Entrar: ${brl(totals.pendingIn)} | Sair: ${brl(totals.pendingOut)}`,
      icon: CalendarDays,
      bg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      textColor: 'text-amber-700',
    },
    {
      label: 'WhatsApp',
      value: `${totals.whatsappCount} lancamento${totals.whatsappCount !== 1 ? 's' : ''}`,
      sub: 'Comprovantes e mensagens processadas',
      icon: MessageCircle,
      bg: 'bg-green-50',
      iconColor: 'text-green-500',
      textColor: 'text-green-700',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-gray-900">Entradas e saidas</h1>
            <p className="hidden text-xs text-gray-400 sm:block">
              Veja tudo que entrou, saiu e ainda vai vencer
            </p>
          </div>
          <NotificationBell />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <div className="rounded-2xl bg-white px-4 py-4 sm:px-5" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="grid flex-1 gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">De</span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Ate</span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Origem</span>
                <select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                  className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="ALL">Todas</option>
                  <option value="manual">Manual</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tipo</span>
                <select
                  value={movementFilter}
                  onChange={(event) => setMovementFilter(event.target.value)}
                  className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="ALL">Entradas e saidas</option>
                  <option value="IN">Entradas</option>
                  <option value="OUT">Saidas</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="ALL">Todos</option>
                  <option value="REALIZED">Ja aconteceu</option>
                  <option value="PENDING">Em aberto</option>
                  <option value="REVIEW">Revisar WhatsApp</option>
                  <option value="CANCELED">Cancelado</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Repeticao</span>
                <select
                  value={recurrenceFilter}
                  onChange={(event) => setRecurrenceFilter(event.target.value)}
                  className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="ALL">Todas</option>
                  <option value="MONTHLY">Mensal</option>
                  <option value="ONCE">Avulsa</option>
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Categoria</span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="ALL">Todas</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 grid gap-1.5 sm:col-span-2 md:col-span-3 xl:col-span-3">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Buscar</span>
                <span className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar descricao, categoria ou status"
                    className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2 xl:w-56">
              <button onClick={() => applyPreset('MONTH')} className="h-9 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white">
                Este mes
              </button>
              <button onClick={() => applyPreset('NEXT_30')} className="h-9 rounded-lg bg-gray-100 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-200">
                Proximos 30 dias
              </button>
              <button onClick={() => applyPreset('ALL')} className="h-9 rounded-lg bg-gray-100 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-200">
                Tudo
              </button>
              <button onClick={clearAdvancedFilters} className="h-9 rounded-lg bg-gray-100 px-3 text-xs font-semibold text-gray-600 hover:bg-gray-200">
                Limpar filtros
              </button>
              <div className="flex w-full gap-2 sm:w-auto">
                <button onClick={() => void downloadReport('cashflow')} className="inline-flex flex-1 sm:flex-none h-9 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white hover:bg-gray-800">
                  <Download className="h-3.5 w-3.5" /> PDF
                </button>
                <button onClick={() => void downloadReport('summary')} className="inline-flex flex-1 sm:flex-none h-9 items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 text-xs font-semibold text-white hover:bg-gray-800">
                  <Download className="h-3.5 w-3.5" /> Resumo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 px-4 pb-4 pt-4 sm:px-6 sm:pb-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => (
            <div key={kpi.label} className={`rounded-2xl ${kpi.bg} p-4`} style={{ border: '1px solid #e5e7eb' }}>
              <div className="mb-2 flex items-start justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{kpi.label}</p>
                <kpi.icon className={`h-3.5 w-3.5 ${kpi.iconColor}`} />
              </div>
              <p className={`text-lg font-bold tabular-nums ${kpi.textColor}`}>{kpi.value}</p>
              <p className="mt-1 text-[11px] font-medium text-gray-500">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {projection && (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="rounded-2xl bg-white p-4" style={{ border: '1px solid #e5e7eb' }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900">Proximos 90 dias</h2>
                <span className="text-xs font-medium text-gray-400">Saldo previsto</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={projection.days}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickFormatter={(v: string) => v.slice(5)} />
                    <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tick={{ fontSize: 10 }} width={36} />
                    <Tooltip formatter={(value) => brl(Number(value))} />
                    <Line type="monotone" dataKey="accumulatedCents" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div
              className={`rounded-2xl p-4 ${projection.alert ? 'bg-red-50' : 'bg-emerald-50'}`}
              style={{ border: '1px solid #e5e7eb' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Alerta de saldo</p>
              <p className={`mt-2 text-lg font-bold ${projection.alert ? 'text-red-600' : 'text-emerald-700'}`}>
                {projection.alert ? 'Pode faltar dinheiro' : 'Saldo previsto positivo'}
              </p>
              {projection.alert && (
                <p className="mt-2 text-sm text-red-600">
                  {projection.alertDate} | {brl(projection.alertAmountCents)}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2 sm:hidden">
          {rows.length === 0 && (
            <div className="rounded-2xl bg-white py-14 text-center" style={{ border: '1px solid #e5e7eb' }}>
              <CircleDollarSign className="mx-auto mb-2 h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-400">Sem movimentacoes nesse filtro</p>
            </div>
          )}
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl bg-white p-4" style={{ border: '1px solid #e5e7eb' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{row.description}</p>
                  {row.category && <p className="truncate text-xs text-gray-400">{row.category}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {row.source === 'whatsapp' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                        <MessageCircle className="h-3 w-3" />
                        WhatsApp
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                        Manual
                      </span>
                    )}
                    <StatusBadge row={row} />
                    <span className="text-[10px] text-gray-400">{fmtDate(row.date)}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {row.inCents > 0 && (
                    <p className="flex items-center justify-end gap-0.5 text-sm font-bold text-emerald-600">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      {brl(row.inCents)}
                    </p>
                  )}
                  {row.outCents > 0 && (
                    <p className="flex items-center justify-end gap-0.5 text-sm font-bold text-red-600">
                      <ArrowDownRight className="h-3.5 w-3.5" />
                      {brl(row.outCents)}
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

        <div className="hidden overflow-hidden rounded-2xl bg-white sm:block" style={{ border: '1px solid #e5e7eb' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/60">
                  {['Origem', 'Data', 'Descricao', 'Categoria', 'Recorrencia', 'Status', 'Entrada', 'Saida', 'Saldo'].map((header) => (
                    <th
                      key={header}
                      className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 last:text-right [&:nth-child(7)]:text-right [&:nth-child(8)]:text-right"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-5 py-4">
                      {row.source === 'whatsapp' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                          <MessageCircle className="h-3 w-3" />
                          WhatsApp
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                          Manual
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-gray-500">{fmtDate(row.date)}</td>
                    <td className="px-5 py-4">
                      <span className="block max-w-[220px] truncate font-medium text-gray-900">{row.description}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{row.category ?? '-'}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          recurrenceLabel(row.recurrence) === 'Mensal'
                            ? 'bg-violet-50 text-violet-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {recurrenceLabel(row.recurrence)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge row={row} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {row.inCents > 0 ? (
                        <span className="font-bold tabular-nums text-emerald-600">+{brl(row.inCents)}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {row.outCents > 0 ? (
                        <span className="font-bold tabular-nums text-red-600">-{brl(row.outCents)}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
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
                      <p className="text-sm text-gray-400">Sem movimentacoes nesse filtro</p>
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


