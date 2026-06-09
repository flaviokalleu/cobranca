﻿﻿﻿'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchDashboardKpis, fetchPayables } from '@/store/financeSlice';
import { fetchLeads } from '@/store/crmSlice';
import { fetchTasks } from '@/store/tasksSlice';
import { fetchFinancialEntries } from '@/store/financialEntriesSlice';
import { api } from '@/lib/http-client';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
  Wallet, Banknote, TrendingUp, AlertTriangle, Users, Target,
  ListChecks, ArrowRight, MessageCircle, Clock, Plus, ChevronRight,
  CircleDollarSign, ArrowUpRight, ArrowDownRight, Activity,
  CalendarDays, TrendingDown, BarChart2, Percent,
} from 'lucide-react';

//  tipos de período 
type Period = 'hoje' | '7d' | '30d' | 'trim' | 'ano';

const PERIOD_LABELS: Record<Period, string> = {
  hoje: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  trim: 'Trimestre',
  ano: 'Este ano',
};

function periodRange(p: Period): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  if (p === 'hoje') {
    from.setHours(0, 0, 0, 0);
  } else if (p === '7d') {
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
  } else if (p === '30d') {
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);
  } else if (p === 'trim') {
    from.setDate(from.getDate() - 89);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

//  helpers 
const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const inRange = (iso: string, from: Date, to: Date) => {
  const d = new Date(iso);
  return d >= from && d <= to;
};
const isOverdue = (c: { status: string; dueDate: string }) =>
  c.status === 'PENDING' && new Date(c.dueDate).getTime() < Date.now();

//  sub-componentes 
function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
      {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            value === p
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

function KpiCard({
  label, value, sub, icon: Icon, iconBg, iconColor,
  delta, deltaUp, href, highlight,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; iconBg: string; iconColor: string;
  delta?: string; deltaUp?: boolean; href?: string; highlight?: boolean;
}) {
  const content = (
    <div className={`group flex flex-col gap-3 rounded-2xl bg-white p-4 sm:p-5 transition-all hover:shadow-md ${highlight ? 'ring-2 ring-red-100' : ''}`}
      style={{ border: highlight ? '1.5px solid #fca5a5' : '1px solid #e5e7eb' }}>
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: iconBg }}>
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        {href && <ChevronRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-gray-500" />}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
      </div>
      {delta !== undefined && (
        <div className="flex items-center gap-1">
          {deltaUp
            ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            : <ArrowDownRight className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />}
          <span className={`text-xs font-semibold ${deltaUp ? 'text-emerald-600' : 'text-red-500'}`}>{delta}</span>
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function StatusBadge({ status, dueDate }: { status: string; dueDate: string }) {
  if (status === 'PAID')
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Pago</span>;
  if (isOverdue({ status, dueDate }))
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Vencida</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Pendente</span>;
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const palette = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6'];
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ background: palette[name.charCodeAt(0) % palette.length] }}>
      {initials || '?'}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 text-xs shadow-xl">
      <p className="mb-2 font-semibold text-gray-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name === 'receita' ? 'Entrada' : p.name === 'despesa' ? 'Saida' : p.name}</span>
          <span className="ml-auto font-bold text-gray-900">{brl(Math.round(p.value * 100))}</span>
        </p>
      ))}
    </div>
  );
}

const DONUT_COLORS = ['#e53935', '#4f46e5', '#10b981', '#f59e0b'];

type RecentRow =
  | { kind: 'charge'; id: string; nome: string; descricao: string; tipo: string; data: string; valorCents: number; status: string; dueDate: string }
  | { kind: 'wa'; id: string; nome: string; descricao: string; tipo: string; data: string; valorCents: number; confianca: string };

interface AlertsSummary {
  overdueCharges: { count: number; totalCents: number };
  overduePayables: { count: number; totalCents: number };
  lowStock: { count: number };
  overdueTasks: { count: number };
  pendingFinancialEntries: { count: number };
  chargingDueToday: { count: number; totalCents: number };
}

//  Page 
export default function PainelPage() {
  const dispatch = useAppDispatch();
  const { customers, charges } = useAppSelector((s) => s.data);
  const { payables, dashboardKpis } = useAppSelector((s) => s.finance);
  const { leads } = useAppSelector((s) => s.crm);
  const { tasks } = useAppSelector((s) => s.tasks);
  const { entries: financialEntries } = useAppSelector((s) => s.financialEntries);

  const [period, setPeriod] = useState<Period>('30d');
  const [alerts, setAlerts] = useState<AlertsSummary | null>(null);

  useEffect(() => {
    void dispatch(fetchPayables());
    void dispatch(fetchLeads());
    void dispatch(fetchTasks());
    void dispatch(fetchFinancialEntries());
    void api<AlertsSummary>('GET', '/alerts/summary').then((res) => {
      if (res.status < 400) setAlerts(res.data);
    });
  }, [dispatch]);

  //  Filtros de data 
  const { from, to } = useMemo(() => periodRange(period), [period]);

  useEffect(() => {
    void dispatch(fetchDashboardKpis({ from: isoDate(from), to: isoDate(to) }));
  }, [dispatch, from, to]);

  const chargesFiltered = useMemo(
    () => charges.filter(c => inRange(c.dueDate, from, to)),
    [charges, from, to],
  );
  const payablesFiltered = useMemo(
    () => payables.filter(p => inRange(p.dueDate, from, to)),
    [payables, from, to],
  );
  const entriesFiltered = useMemo(
    () => financialEntries.filter(e => inRange(e.dataTransacao ?? e.createdAt, from, to)),
    [financialEntries, from, to],
  );

  //  KPIs 
  const localKpis = useMemo(() => {
    const pending = chargesFiltered.filter(c => c.status === 'PENDING');
    const aReceber = pending.reduce((s, c) => s + c.amountCents, 0);
    const recebidoManual = chargesFiltered.filter(c => c.status === 'PAID').reduce((s, c) => s + c.amountCents, 0);
    const waEntradas = entriesFiltered.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valorCents, 0);
    const recebido = recebidoManual + waEntradas;
    const vencidas = pending.filter(isOverdue).length;
    const aPagar = payablesFiltered.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amountCents, 0);
    const total = aReceber + recebido;
    const pct = total > 0 ? Math.round((recebido / total) * 100) : 0;
    const despesasPagas = payablesFiltered.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amountCents, 0);
    const waGastos = entriesFiltered.filter(e => e.tipo === 'gasto').reduce((s, e) => s + e.valorCents, 0);
    const saldo = recebido - despesasPagas - waGastos;
    const tarefas = tasks.filter(t => !t.done).length;

    // Prazo de recebimento: dias médios de recebimento
    const paidCharges = chargesFiltered.filter(c => c.status === 'PAID' && c.paidAt);
    const dso = paidCharges.length > 0
      ? Math.round(paidCharges.reduce((s, c) => {
          const diff = new Date(c.paidAt!).getTime() - new Date(c.createdAt ?? c.dueDate).getTime();
          return s + diff / (1000 * 60 * 60 * 24);
        }, 0) / paidCharges.length)
      : 0;

    // Taxa de inadimplência
    const totalCharges = chargesFiltered.length;
    const inadimplencia = totalCharges > 0 ? Math.round((vencidas / totalCharges) * 100) : 0;

    return { aReceber, recebido, vencidas, aPagar, pct, tarefas, saldo, waEntradas, recebidoManual, despesasPagas, waGastos, dso, inadimplencia, total };
  }, [chargesFiltered, payablesFiltered, entriesFiltered, tasks]);

  const kpis = useMemo(() => {
    if (!dashboardKpis) return localKpis;
    const total = dashboardKpis.pendingReceivablesCents + dashboardKpis.totalIncomeCents;
    return {
      ...localKpis,
      aReceber: dashboardKpis.pendingReceivablesCents,
      recebido: dashboardKpis.totalIncomeCents,
      vencidas: dashboardKpis.overdueCharges,
      aPagar: dashboardKpis.pendingPayablesCents,
      pct: dashboardKpis.collectionRate,
      tarefas: dashboardKpis.openTasks,
      saldo: dashboardKpis.balanceCents,
      waEntradas: dashboardKpis.whatsappIncomeCents,
      recebidoManual: dashboardKpis.receivedCents,
      despesasPagas: dashboardKpis.paidExpensesCents,
      waGastos: dashboardKpis.whatsappExpenseCents,
      dso: dashboardKpis.dsoDays,
      inadimplencia: dashboardKpis.defaultRate,
      total,
    };
  }, [dashboardKpis, localKpis]);

  //  Chart: área (tendência mensal ou diária) 
  const chartData = useMemo(() => {
    if (dashboardKpis?.chart?.length) {
      return dashboardKpis.chart.map((point) => ({
        mes: point.label,
        receita: point.incomeCents / 100,
        despesa: point.expenseCents / 100,
      }));
    }

    const useDays = period === 'hoje' || period === '7d' || period === '30d';
    if (useDays) {
      const days = period === 'hoje' ? 1 : period === '7d' ? 7 : 30;
      const pts = Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        return {
          key: d.toISOString().slice(0, 10),
          label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          receita: 0,
          despesa: 0,
        };
      });
      for (const c of charges) {
        const key = (c.paidAt ?? c.dueDate).slice(0, 10);
        const pt = pts.find(p => p.key === key);
        if (pt && c.status !== 'CANCELED') pt.receita += c.amountCents / 100;
      }
      for (const p of payables) {
        const key = (p.paidAt ?? p.dueDate).slice(0, 10);
        const pt = pts.find(x => x.key === key);
        if (pt && p.status !== 'CANCELED') pt.despesa += p.amountCents / 100;
      }
      for (const e of financialEntries) {
        const key = (e.dataTransacao ?? e.createdAt).slice(0, 10);
        const pt = pts.find(x => x.key === key);
        if (!pt) continue;
        if (e.tipo === 'receita') pt.receita += e.valorCents / 100;
        else if (e.tipo === 'gasto') pt.despesa += e.valorCents / 100;
      }
      return pts.map(p => ({ mes: p.label, receita: p.receita, despesa: p.despesa }));
    }

    // mensal (trim / ano)
    const months = period === 'trim' ? 3 : 12;
    const now = new Date();
    const pts = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        mes: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        receita: 0,
        despesa: 0,
      };
    });
    for (const c of charges) {
      if (c.status === 'CANCELED') continue;
      const d = new Date(c.paidAt ?? c.dueDate);
      const pt = pts.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (pt) pt.receita += c.amountCents / 100;
    }
    for (const p of payables) {
      if (p.status === 'CANCELED') continue;
      const d = new Date(p.paidAt ?? p.dueDate);
      const pt = pts.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (pt) pt.despesa += p.amountCents / 100;
    }
    for (const e of financialEntries) {
      const d = new Date(e.dataTransacao ?? e.createdAt);
      const pt = pts.find(x => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (!pt) continue;
      if (e.tipo === 'receita') pt.receita += e.valorCents / 100;
      else if (e.tipo === 'gasto') pt.despesa += e.valorCents / 100;
    }
    return pts;
  }, [charges, dashboardKpis, payables, financialEntries, period]);

  //  Donut: composição de receita 
  const donutData = useMemo(() => {
    const manual = chargesFiltered.filter(c => c.status === 'PAID').reduce((s, c) => s + c.amountCents / 100, 0);
    const whatsapp = entriesFiltered.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valorCents / 100, 0);
    const pendente = chargesFiltered.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.amountCents / 100, 0);
    const data = [
      { name: 'Manual pago', value: manual },
      { name: 'WhatsApp', value: whatsapp },
      { name: 'Pendente', value: pendente },
    ].filter(d => d.value > 0);
    return data.length > 0 ? data : [{ name: 'Sem dados', value: 1 }];
  }, [chargesFiltered, entriesFiltered]);

  //  Recentes 
  const recentes = useMemo<RecentRow[]>(() => {
    const rows: RecentRow[] = [
      ...chargesFiltered.map(c => ({
        kind: 'charge' as const,
        id: c.id,
        nome: (c as { customer?: { name: string } }).customer?.name ?? '?',
        descricao: c.description,
        tipo: c.recurrence === 'MONTHLY' ? 'Mensal' : 'Avulso',
        data: c.dueDate,
        valorCents: c.amountCents,
        status: c.status,
        dueDate: c.dueDate,
      })),
      ...entriesFiltered.map(e => ({
        kind: 'wa' as const,
        id: e.id,
        nome: e.pagadorNome ?? e.recebedorNome ?? '?',
        descricao: e.descricao,
        tipo: e.tipo === 'receita' ? 'Entrada' : 'Gasto',
        data: e.dataTransacao ?? e.createdAt,
        valorCents: e.valorCents,
        confianca: e.confianca,
      })),
    ];
    return rows.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 10);
  }, [chargesFiltered, entriesFiltered]);

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const saldoPos = kpis.saldo >= 0;

  return (
    <div className="min-h-screen bg-gray-50">

      {/*  PAGE HEADER  */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex-shrink-0">
              <h1 className="text-base font-bold text-gray-900">Painel</h1>
              <p className="hidden text-xs text-gray-400 capitalize sm:block">{mesAtual}</p>
            </div>
            {/* Filtro de período - desktop */}
            <div className="hidden sm:block">
              <PeriodFilter value={period} onChange={setPeriod} />
            </div>
            <Link
              href="/dashboard/cobrancas"
              className="flex flex-shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-3 sm:px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova cobranca</span>
            </Link>
          </div>
          {/* Filtro de período - mobile */}
          <div className="pb-3 sm:hidden overflow-x-auto">
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">

        {/*  SALDO + INDICADORES TOPO  */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Saldo principal */}
          <div className="lg:col-span-2 rounded-2xl bg-white p-5 sm:p-6" style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50">
                  <CircleDollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Saldo estimado</p>
                  <p className="text-[10px] text-gray-300">{PERIOD_LABELS[period]}</p>
                </div>
              </div>
              <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${saldoPos ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {saldoPos ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {saldoPos ? 'Positivo' : 'Negativo'}
              </span>
            </div>
            <p className={`text-4xl sm:text-5xl font-bold tracking-tight ${saldoPos ? 'text-gray-900' : 'text-red-600'}`}>
              {brl(kpis.saldo)}
            </p>

            {/* Barra de progresso */}
            <div className="mt-5">
              <div className="mb-1.5 flex justify-between text-xs text-gray-400">
                <span>Quanto ja recebeu: <strong className="text-gray-700">{kpis.pct}%</strong></span>
                <span>{brl(kpis.recebido)} / {brl(kpis.total)}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${kpis.pct}%`,
                    background: kpis.pct >= 70 ? '#10b981' : kpis.pct >= 40 ? '#f59e0b' : '#ef4444',
                  }} />
              </div>
            </div>

            {/* Mini KPIs inline */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { label: 'Recebido', value: brl(kpis.recebido), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'A receber', value: brl(kpis.aReceber), color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'A pagar', value: brl(kpis.aPagar), color: 'text-red-600', bg: 'bg-red-50' },
              ].map(x => (
                <div key={x.label} className={`rounded-xl ${x.bg} px-3 py-2.5`}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{x.label}</p>
                  <p className={`mt-0.5 text-sm font-bold tabular-nums ${x.color}`}>{x.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Indicadores operacionais */}
          <div className="flex flex-col gap-4">
            {/* Prazo de recebimento */}
            <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                    <Clock className="h-4.5 w-4.5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Prazo de recebimento</p>
                    <p className="text-[10px] text-gray-300">Media de dias para receber</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 tabular-nums">{kpis.dso}<span className="text-sm font-normal text-gray-400 ml-1">dias</span></p>
                </div>
              </div>
            </div>

            {/* Atrasos */}
            <div className="rounded-2xl bg-white p-5" style={{ border: kpis.inadimplencia > 20 ? '1.5px solid #fca5a5' : '1px solid #e5e7eb' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpis.inadimplencia > 20 ? 'bg-red-50' : 'bg-orange-50'}`}>
                    <Percent className={`h-4.5 w-4.5 ${kpis.inadimplencia > 20 ? 'text-red-500' : 'text-orange-500'}`} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Atrasos</p>
                    <p className="text-[10px] text-gray-300">{kpis.vencidas} cobrancas vencidas</p>
                  </div>
                </div>
                <p className={`text-2xl font-bold tabular-nums ${kpis.inadimplencia > 20 ? 'text-red-600' : 'text-gray-900'}`}>
                  {kpis.inadimplencia}%
                </p>
              </div>
            </div>

            {/* Tarefas + Interessados */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/dashboard/tarefas" className="group rounded-2xl bg-white p-4 transition hover:shadow-md" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50">
                  <ListChecks className="h-4.5 w-4.5 text-violet-500" />
                </div>
                <p className="mt-3 text-2xl font-bold text-gray-900 tabular-nums">{kpis.tarefas}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Tarefas</p>
              </Link>
              <Link href="/dashboard/crm" className="group rounded-2xl bg-white p-4 transition hover:shadow-md" style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
                  <Target className="h-4.5 w-4.5 text-sky-500" />
                </div>
                <p className="mt-3 text-2xl font-bold text-gray-900 tabular-nums">{leads.length}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Interessados</p>
              </Link>
            </div>
          </div>
        </div>

        {/*  KPI CARDS  */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <KpiCard label="A receber" value={brl(kpis.aReceber)}
            sub={`${chargesFiltered.filter(c => c.status === 'PENDING').length} cobranças`}
            icon={Wallet} iconBg="#fef9c3" iconColor="#ca8a04"
            href="/dashboard/cobrancas" />
          <KpiCard label="Vencidas" value={String(kpis.vencidas)}
            sub="cobranças em atraso"
            icon={AlertTriangle} iconBg="#fee2e2" iconColor="#dc2626"
            delta={kpis.vencidas > 0 ? `${kpis.vencidas} atrasada${kpis.vencidas > 1 ? 's' : ''}` : '0 em atraso'}
            deltaUp={kpis.vencidas === 0}
            highlight={kpis.vencidas > 0}
            href="/dashboard/cobrancas" />
          <KpiCard label="Clientes" value={String(customers.length)}
            sub="cadastrados"
            icon={Users} iconBg="#ede9fe" iconColor="#7c3aed"
            href="/dashboard/clientes" />
          <KpiCard label="WhatsApp" value={brl(kpis.waEntradas)}
            sub={`${entriesFiltered.filter(e => e.tipo === 'receita').length} lancamentos`}
            icon={MessageCircle} iconBg="#dcfce7" iconColor="#16a34a" />
        </div>

        {alerts && (
          <div className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-3 lg:grid-cols-6" style={{ border: '1px solid #e5e7eb' }}>
            {[
              { label: 'Cobrancas atrasadas', value: alerts.overdueCharges.count, sub: brl(alerts.overdueCharges.totalCents) },
              { label: 'Contas vencidas', value: alerts.overduePayables.count, sub: brl(alerts.overduePayables.totalCents) },
              { label: 'Tarefas atrasadas', value: alerts.overdueTasks.count, sub: 'tarefas' },
              { label: 'Recibos pendentes', value: alerts.pendingFinancialEntries.count, sub: 'recibos' },
              { label: 'Estoque critico', value: alerts.lowStock.count, sub: 'produtos' },
              { label: 'Vence hoje', value: alerts.chargingDueToday.count, sub: brl(alerts.chargingDueToday.totalCents) },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-gray-50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{item.label}</p>
                <p className={`mt-1 text-xl font-bold ${item.value > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{item.value}</p>
                <p className="text-[11px] text-gray-400">{item.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/*  GRÁFICO ÁREA + DONUT  */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Area chart */}
          <div className="lg:col-span-2 rounded-2xl bg-white p-5 sm:p-6" style={{ border: '1px solid #e5e7eb' }}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Entradas e saidas</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  Entradas e saidas · {PERIOD_LABELS[period]}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />Entrada
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />Saida
                </span>
              </div>
            </div>
            <div className="h-52 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e53935" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#e53935" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: '#9ca3af' }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tick={{ fill: '#9ca3af' }} width={50}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="receita" stroke="#e53935" strokeWidth={2.5}
                    fill="url(#gR)" dot={false} activeDot={{ r: 5, fill: '#e53935', strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="despesa" stroke="#6366f1" strokeWidth={2.5}
                    fill="url(#gD)" dot={false} activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut: composição */}
          <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
            <h2 className="text-sm font-bold text-gray-900">De onde veio o dinheiro</h2>
            <p className="mt-0.5 mb-4 text-xs text-gray-400">Por origem · {PERIOD_LABELS[period]}</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                    paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => brl(Math.round(Number(v ?? 0) * 100))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-2">
              {donutData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-gray-600">{d.name}</span>
                  </div>
                  <span className="font-semibold text-gray-900">{brl(Math.round(d.value * 100))}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/*  BAR CHART + A!"ES RÁPIDAS  */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Bar chart: receita vs despesa por mês */}
          <div className="lg:col-span-2 rounded-2xl bg-white p-5 sm:p-6" style={{ border: '1px solid #e5e7eb' }}>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Comparativo do mes</h2>
                <p className="mt-0.5 text-xs text-gray-400">Entrada vs Saida em barras</p>
              </div>
              <BarChart2 className="h-4 w-4 text-gray-300" />
            </div>
            <div className="h-44 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: '#9ca3af' }} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tick={{ fill: '#9ca3af' }} width={50}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="receita" fill="#e53935" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="despesa" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Atalhos + resumo */}
          <div className="flex flex-col gap-4">
            {/* resumo operacional */}
            <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
              <h3 className="mb-3 text-sm font-bold text-gray-900">Resumo do periodo</h3>
              <div className="space-y-2">
                {[
                  { label: 'Cobrancas em aberto', val: chargesFiltered.filter(c => c.status === 'PENDING').length, color: '#f59e0b', bg: '#fffbeb' },
                  { label: 'Pagas', val: chargesFiltered.filter(c => c.status === 'PAID').length, color: '#10b981', bg: '#f0fdf4' },
                  { label: 'Saidas pendentes', val: payablesFiltered.filter(p => p.status === 'PENDING').length, color: '#ef4444', bg: '#fef2f2' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: item.bg }}>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs text-gray-600">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ações rápidas */}
            <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
              <h3 className="mb-3 text-sm font-bold text-gray-900">Atalhos</h3>
              <div className="space-y-1">
                {[
                  { label: 'Receber', href: '/dashboard/cobrancas', icon: Wallet, iconBg: '#fee2e2', iconColor: '#dc2626' },
                  { label: 'Clientes', href: '/dashboard/clientes', icon: Users, iconBg: '#ede9fe', iconColor: '#7c3aed' },
                  { label: 'Entradas e saidas', href: '/dashboard/financeiro/fluxo', icon: TrendingUp, iconBg: '#d1fae5', iconColor: '#059669' },
                  { label: 'Saidas', href: '/dashboard/financeiro/pagar', icon: Banknote, iconBg: '#e0f2fe', iconColor: '#0284c7' },
                ].map(a => (
                  <Link key={a.label} href={a.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all hover:bg-gray-50 group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" style={{ background: a.iconBg }}>
                      <a.icon className="h-4 w-4" style={{ color: a.iconColor }} />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{a.label}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/*  MOVIMENTA!"ES RECENTES  */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Movimentações recentes</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {chargesFiltered.length} cobranças · {entriesFiltered.length} via WhatsApp · {PERIOD_LABELS[period]}
              </p>
            </div>
            <Link href="/dashboard/cobrancas"
              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 transition-colors">
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile: cards */}
          <div className="divide-y divide-gray-50 sm:hidden">
            {recentes.slice(0, 5).map((row) => (
              <div key={row.id} className="flex items-center gap-3 px-4 py-3.5">
                <Avatar name={row.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{row.nome}</p>
                  <p className="truncate text-xs text-gray-400">{row.descricao}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${
                    row.kind === 'wa' && row.tipo === 'Gasto' ? 'text-red-600'
                    : row.kind === 'charge' && row.status === 'PAID' ? 'text-emerald-600'
                    : 'text-gray-700'
                  }`}>
                    {row.kind === 'wa' && row.tipo === 'Gasto' ? '-' : '+'}{brl(row.valorCents)}
                  </p>
                  <p className="text-[10px] text-gray-400">{fmtDate(row.data)}</p>
                </div>
              </div>
            ))}
            {recentes.length === 0 && (
              <div className="px-4 py-10 text-center">
                <CircleDollarSign className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-400">Nenhuma movimentação no período</p>
              </div>
            )}
          </div>

          {/* Desktop: tabela */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  {['Origem', 'Cliente / Pagador', 'Descrição', 'Tipo', 'Data', 'Valor', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentes.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-gray-50/60">
                    <td className="px-5 py-4">
                      {row.kind === 'wa'
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700"><MessageCircle className="h-3 w-3" />WhatsApp</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">Manual</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.nome} />
                        <span className="font-medium text-gray-900">{row.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="block max-w-[160px] truncate text-gray-500">{row.descricao}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">{row.tipo}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <Clock className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                        {fmtDate(row.data)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`font-bold tabular-nums ${
                        row.kind === 'wa' && row.tipo === 'Gasto' ? 'text-red-600'
                        : row.kind === 'charge' && row.status === 'PAID' ? 'text-emerald-600'
                        : 'text-gray-900'
                      }`}>
                        {row.kind === 'wa' && row.tipo === 'Gasto' ? '-' : '+'}{brl(row.valorCents)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {row.kind === 'charge'
                        ? <StatusBadge status={row.status} dueDate={row.dueDate} />
                        : <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{
                              background: row.confianca === 'alta' ? '#ecfdf5' : row.confianca === 'media' ? '#fffbeb' : '#fff1f2',
                              color: row.confianca === 'alta' ? '#059669' : row.confianca === 'media' ? '#d97706' : '#e11d48',
                            }}>
                            <span className="h-1.5 w-1.5 rounded-full"
                              style={{ background: row.confianca === 'alta' ? '#10b981' : row.confianca === 'media' ? '#f59e0b' : '#f43f5e' }} />
                            {row.confianca === 'alta' ? 'Confirmado' : row.confianca === 'media' ? 'Provável' : 'Revisar'}
                          </span>}
                    </td>
                  </tr>
                ))}
                {recentes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <CircleDollarSign className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                      <p className="text-sm text-gray-400">Nenhuma movimentação em {PERIOD_LABELS[period]}</p>
                      <Link href="/dashboard/cobrancas" className="mt-1 block text-xs font-semibold text-red-600 hover:text-red-700">
                        Criar primeira cobrança 
                      </Link>
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


