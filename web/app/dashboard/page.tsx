'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPayables } from '@/store/financeSlice';
import { fetchLeads } from '@/store/crmSlice';
import { fetchTasks } from '@/store/tasksSlice';
import { fetchFinancialEntries } from '@/store/financialEntriesSlice';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  Wallet, BadgeDollarSign, Banknote, AlertTriangle,
  Users, Target, ListChecks, Plus, ArrowRight,
  CircleDollarSign, Clock, MessageCircle,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────
const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const isOverdue = (c: { status: string; dueDate: string }) =>
  c.status === 'PENDING' && new Date(c.dueDate).getTime() < Date.now();

// ─── sub-components ─────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, color, delta, up,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  delta?: string;
  up?: boolean;
}) {
  return (
    <div
      className="relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-white p-5"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}
    >
      {/* accent stripe */}
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-2xl" style={{ background: color }} />

      <div className="flex items-start justify-between pl-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9ca3af' }}>{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs" style={{ color: '#9ca3af' }}>{sub}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}15` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>

      {delta && (
        <div className="flex items-center gap-1 pl-2">
          {up
            ? <ArrowUpRight className="h-3.5 w-3.5" style={{ color: '#10b981' }} />
            : <ArrowDownRight className="h-3.5 w-3.5" style={{ color: '#f43f5e' }} />}
          <span className="text-xs font-semibold" style={{ color: up ? '#10b981' : '#f43f5e' }}>{delta}</span>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, dueDate }: { status: string; dueDate: string }) {
  if (status === 'PAID')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: '#ecfdf5', color: '#059669' }}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Pago
      </span>
    );
  if (isOverdue({ status, dueDate }))
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: '#fff1f2', color: '#e11d48' }}>
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Vencida
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: '#fffbeb', color: '#d97706' }}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Pendente
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#e11d48', '#8b5cf6'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ background: color }}>
      {initials || '?'}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-white p-3 text-xs shadow-lg" style={{ borderColor: '#f0f0f0' }}>
      <p className="mb-2 font-semibold text-gray-700">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full"
            style={{ background: p.name === 'receita' ? '#4f46e5' : '#f43f5e' }} />
          <span style={{ color: '#6b7280' }}>{p.name === 'receita' ? 'Receita' : 'Despesa'}</span>
          <span className="ml-auto font-semibold text-gray-900">{brl(Math.round(p.value * 100))}</span>
        </p>
      ))}
    </div>
  );
};

// ─── types ───────────────────────────────────────────────────────────────────
type RecentRow =
  | { kind: 'charge'; id: string; nome: string; descricao: string; tipo: string; data: string; valorCents: number; status: string; dueDate: string }
  | { kind: 'wa'; id: string; nome: string; descricao: string; tipo: string; data: string; valorCents: number; confianca: string };

// ─── page ────────────────────────────────────────────────────────────────────
export default function PainelPage() {
  const dispatch = useAppDispatch();
  const { customers, charges } = useAppSelector((s) => s.data);
  const { payables } = useAppSelector((s) => s.finance);
  const { leads } = useAppSelector((s) => s.crm);
  const { tasks } = useAppSelector((s) => s.tasks);
  const { entries: financialEntries } = useAppSelector((s) => s.financialEntries);

  useEffect(() => {
    void dispatch(fetchPayables());
    void dispatch(fetchLeads());
    void dispatch(fetchTasks());
    void dispatch(fetchFinancialEntries());
  }, [dispatch]);

  const kpis = useMemo(() => {
    const pending = charges.filter((c) => c.status === 'PENDING');
    const aReceber = pending.reduce((s, c) => s + c.amountCents, 0);
    const recebidoManual = charges.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amountCents, 0);
    const waReceitas = financialEntries.filter((e) => e.tipo === 'receita').reduce((s, e) => s + e.valorCents, 0);
    const recebido = recebidoManual + waReceitas;
    const vencidas = pending.filter(isOverdue).length;
    const aPagar = payables.filter((p) => p.status === 'PENDING').reduce((s, p) => s + p.amountCents, 0);
    const tarefas = tasks.filter((t) => !t.done).length;
    const total = aReceber + recebido;
    const pct = total > 0 ? Math.round((recebido / total) * 100) : 0;
    const despesasPagas = payables.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amountCents, 0);
    const waGastos = financialEntries.filter((e) => e.tipo === 'gasto').reduce((s, e) => s + e.valorCents, 0);
    const saldo = recebido - despesasPagas - waGastos;
    const waCount = financialEntries.filter((e) => e.tipo === 'receita').length;
    return { aReceber, recebido, vencidas, aPagar, pct, tarefas, saldo, waReceitas, waCount };
  }, [charges, payables, tasks, financialEntries]);

  const chartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
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
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.receita += c.amountCents / 100;
    }
    for (const p of payables) {
      if (p.status === 'CANCELED') continue;
      const d = new Date(p.paidAt ?? p.dueDate);
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (m) m.despesa += p.amountCents / 100;
    }
    for (const e of financialEntries) {
      const d = new Date(e.dataTransacao ?? e.createdAt);
      const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (!m) continue;
      if (e.tipo === 'receita') m.receita += e.valorCents / 100;
      else if (e.tipo === 'gasto') m.despesa += e.valorCents / 100;
    }
    return months;
  }, [charges, payables, financialEntries]);

  const recentes = useMemo<RecentRow[]>(() => {
    const rows: RecentRow[] = [
      ...charges.map((c) => ({
        kind: 'charge' as const,
        id: c.id,
        nome: (c as { customer?: { name: string } }).customer?.name ?? '—',
        descricao: c.description,
        tipo: c.recurrence === 'MONTHLY' ? 'Mensal' : 'Avulso',
        data: c.dueDate,
        valorCents: c.amountCents,
        status: c.status,
        dueDate: c.dueDate,
      })),
      ...financialEntries.map((e) => ({
        kind: 'wa' as const,
        id: e.id,
        nome: e.pagadorNome ?? e.recebedorNome ?? '—',
        descricao: e.descricao,
        tipo: e.tipo === 'receita' ? 'Receita' : 'Gasto',
        data: e.dataTransacao ?? e.createdAt,
        valorCents: e.valorCents,
        confianca: e.confianca,
      })),
    ];
    return rows.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 8);
  }, [charges, financialEntries]);

  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen" style={{ background: '#f4f6f9' }}>

      {/* ── HERO DARK CARD ─────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden px-6 py-8"
        style={{
          background: 'linear-gradient(135deg, #0f1117 0%, #1a1f35 40%, #0f2044 100%)',
        }}
      >
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #4f46e5, transparent 70%)' }} />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #06b6d4, transparent 70%)' }} />

        <div className="relative mx-auto max-w-7xl">
          {/* top row */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Visão geral · {mesAtual}
              </p>
              <h1 className="mt-1 text-xl font-bold text-white">Dashboard Financeiro</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/cobrancas"
                className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium transition-all hover:bg-white/10"
                style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}
              >
                <ArrowRight className="h-4 w-4" />
                Cobranças
              </Link>
              <Link
                href="/dashboard/cobrancas"
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
              >
                <Plus className="h-4 w-4" />
                Nova receita
              </Link>
            </div>
          </div>

          {/* hero metrics grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {/* saldo — destaque */}
            <div
              className="col-span-2 rounded-2xl p-5 lg:col-span-1"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <CircleDollarSign className="h-4 w-4" style={{ color: '#a5b4fc' }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Saldo estimado
                </span>
              </div>
              <p className="text-3xl font-bold text-white">{brl(kpis.saldo)}</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${kpis.pct}%`, background: 'linear-gradient(90deg,#4f46e5,#818cf8)' }} />
              </div>
              <p className="mt-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {kpis.pct}% do total recebido
              </p>
            </div>

            {[
              { label: 'A receber', value: brl(kpis.aReceber), icon: Wallet, color: '#818cf8', sub: `${charges.filter(c => c.status === 'PENDING').length} cobranças` },
              { label: 'Recebido', value: brl(kpis.recebido), icon: TrendingUp, color: '#34d399', sub: 'manual + WhatsApp' },
              { label: 'A pagar', value: brl(kpis.aPagar), icon: Banknote, color: '#fb7185', sub: `${payables.filter(p => p.status === 'PENDING').length} contas` },
              { label: 'WhatsApp', value: brl(kpis.waReceitas), icon: MessageCircle, color: '#4ade80', sub: `${kpis.waCount} lançamento${kpis.waCount !== 1 ? 's' : ''}` },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl p-5"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {item.label}
                  </span>
                  <item.icon className="h-4 w-4" style={{ color: item.color }} />
                </div>
                <p className="text-2xl font-bold text-white">{item.value}</p>
                <p className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl space-y-6 p-6">

        {/* KPI cards row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Vencidas" value={String(kpis.vencidas)} sub="em atraso"
            icon={AlertTriangle} color="#f59e0b"
            delta={kpis.vencidas > 0 ? `${kpis.vencidas} atrasada${kpis.vencidas > 1 ? 's' : ''}` : undefined}
            up={false} />
          <KpiCard label="Clientes" value={String(customers.length)} sub="cadastrados"
            icon={Users} color="#4f46e5" />
          <KpiCard label="Leads" value={String(leads.length)} sub="no funil"
            icon={Target} color="#8b5cf6"
            delta={leads.length > 0 ? `${leads.length} ativos` : undefined} up />
          <KpiCard label="Tarefas" value={String(kpis.tarefas)} sub="pendentes"
            icon={ListChecks} color="#0ea5e9"
            delta={kpis.tarefas > 0 ? `${kpis.tarefas} aberta${kpis.tarefas > 1 ? 's' : ''}` : undefined}
            up={false} />
        </div>

        {/* chart + sidebar */}
        <div className="grid gap-6 lg:grid-cols-3">

          {/* ── AREA CHART ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 rounded-2xl bg-white p-6"
            style={{ border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Fluxo Financeiro</h2>
                <p className="text-xs mt-0.5" style={{ color: '#9ca3af' }}>Receitas e despesas — últimos 7 meses</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium" style={{ color: '#6b7280' }}>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#4f46e5' }} />
                  Receita
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#f43f5e' }} />
                  Despesa
                </span>
              </div>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11}
                    tick={{ fill: '#9ca3af' }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11}
                    tick={{ fill: '#9ca3af' }} width={48} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="receita" stroke="#4f46e5" strokeWidth={2.5}
                    fill="url(#gR)" dot={false} activeDot={{ r: 5, fill: '#4f46e5', strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="despesa" stroke="#f43f5e" strokeWidth={2.5}
                    fill="url(#gD)" dot={false} activeDot={{ r: 5, fill: '#f43f5e', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── SIDEBAR ────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* taxas */}
            <div className="rounded-2xl bg-white p-5"
              style={{ border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Taxa de recebimento</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: '#9ca3af' }}>Cobranças pagas</span>
                <span className="text-sm font-bold text-gray-900">{kpis.pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: '#f3f4f6' }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${kpis.pct}%`,
                    background: kpis.pct >= 70
                      ? 'linear-gradient(90deg,#10b981,#34d399)'
                      : kpis.pct >= 40
                        ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                        : 'linear-gradient(90deg,#f43f5e,#fb7185)',
                  }} />
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { label: 'Cobranças ativas', val: charges.filter(c => c.status === 'PENDING').length, color: '#4f46e5' },
                  { label: 'Pagas no total', val: charges.filter(c => c.status === 'PAID').length, color: '#10b981' },
                  { label: 'Despesas pendentes', val: payables.filter(p => p.status === 'PENDING').length, color: '#f43f5e' },
                  { label: 'Leads no funil', val: leads.length, color: '#8b5cf6' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs" style={{ color: '#6b7280' }}>{item.label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ações rápidas */}
            <div className="rounded-2xl bg-white p-5"
              style={{ border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <h3 className="text-sm font-bold text-gray-900 mb-3">Ações rápidas</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Nova cobrança', href: '/dashboard/cobrancas', color: '#4f46e5', bg: '#ede9fe' },
                  { label: 'Novo cliente', href: '/dashboard/clientes', color: '#0ea5e9', bg: '#e0f2fe' },
                  { label: 'Fluxo de caixa', href: '/dashboard/financeiro/fluxo', color: '#10b981', bg: '#d1fae5' },
                  { label: 'Ver leads', href: '/dashboard/crm', color: '#8b5cf6', bg: '#ede9fe' },
                ].map(a => (
                  <Link key={a.label} href={a.href}
                    className="flex items-center justify-center rounded-xl px-3 py-2.5 text-xs font-semibold transition-all hover:opacity-80 active:scale-95"
                    style={{ background: a.bg, color: a.color }}>
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── RECENT TRANSACTIONS ──────────────────────────────────────── */}
        <div className="rounded-2xl bg-white overflow-hidden"
          style={{ border: '1px solid #f0f0f0', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #f8f8f8' }}>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Movimentações recentes</h2>
              <p className="mt-0.5 text-xs" style={{ color: '#9ca3af' }}>
                {charges.length} cobranças · {financialEntries.length} via WhatsApp
              </p>
            </div>
            <Link href="/dashboard/cobrancas"
              className="flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-70"
              style={{ color: '#4f46e5' }}>
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #f8f8f8' }}>
                  {['Origem', 'Pagador / Cliente', 'Descrição', 'Tipo', 'Data', 'Valor', 'Status'].map(h => (
                    <th key={h}
                      className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: '#9ca3af' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentes.map((row, i) => (
                  <tr key={row.id}
                    className="transition-colors hover:bg-slate-50/60"
                    style={{ borderBottom: i < recentes.length - 1 ? '1px solid #f8f8f8' : 'none' }}>

                    {/* origem */}
                    <td className="px-6 py-3.5">
                      {row.kind === 'wa'
                        ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: '#dcfce7', color: '#16a34a' }}>
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{ background: '#ede9fe', color: '#7c3aed' }}>
                            Manual
                          </span>
                        )}
                    </td>

                    {/* nome */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.nome} />
                        <span className="text-sm font-medium text-gray-900">{row.nome}</span>
                      </div>
                    </td>

                    {/* descrição */}
                    <td className="px-6 py-3.5">
                      <span className="max-w-[200px] truncate text-sm text-gray-700 block">{row.descricao}</span>
                    </td>

                    {/* tipo */}
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                        style={{ background: '#f3f4f6', color: '#374151' }}>
                        {row.tipo}
                      </span>
                    </td>

                    {/* data */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" style={{ color: '#9ca3af' }} />
                        <span className="text-sm" style={{ color: '#6b7280' }}>{fmtDate(row.data)}</span>
                      </div>
                    </td>

                    {/* valor */}
                    <td className="px-6 py-3.5">
                      <span className="text-sm font-bold"
                        style={{
                          color: row.kind === 'wa' && row.tipo === 'Gasto'
                            ? '#e11d48'
                            : row.kind === 'charge' && row.status === 'PAID'
                              ? '#059669'
                              : '#111827',
                        }}>
                        {row.kind === 'wa' && row.tipo === 'Gasto' ? '−' : '+'}{brl(row.valorCents)}
                      </span>
                    </td>

                    {/* status */}
                    <td className="px-6 py-3.5">
                      {row.kind === 'charge'
                        ? <StatusPill status={row.status} dueDate={row.dueDate} />
                        : (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{
                              background: row.confianca === 'alta' ? '#ecfdf5' : row.confianca === 'media' ? '#fffbeb' : '#fff1f2',
                              color: row.confianca === 'alta' ? '#059669' : row.confianca === 'media' ? '#d97706' : '#e11d48',
                            }}>
                            <span className="h-1.5 w-1.5 rounded-full"
                              style={{
                                background: row.confianca === 'alta' ? '#10b981' : row.confianca === 'media' ? '#f59e0b' : '#f43f5e',
                              }} />
                            {row.confianca === 'alta' ? 'Confirmado' : row.confianca === 'media' ? 'Provável' : 'Revisar'}
                          </span>
                        )}
                    </td>
                  </tr>
                ))}
                {recentes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-14 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full"
                          style={{ background: '#f3f4f6' }}>
                          <BadgeDollarSign className="h-6 w-6" style={{ color: '#9ca3af' }} />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Nenhuma movimentação ainda</p>
                        <Link href="/dashboard/cobrancas"
                          className="text-xs font-semibold"
                          style={{ color: '#4f46e5' }}>
                          Criar primeira cobrança →
                        </Link>
                      </div>
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
