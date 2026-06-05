'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPayables } from '@/store/financeSlice';
import { fetchLeads } from '@/store/crmSlice';
import { fetchTasks } from '@/store/tasksSlice';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import {
  Wallet, BadgeDollarSign, AlertTriangle, Users,
  Banknote, Plus, ArrowRight, Target, ListChecks,
  TrendingUp, FileText,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const isOverdue = (c: { status: string; dueDate: string }) =>
  c.status === 'PENDING' && new Date(c.dueDate).getTime() < Date.now();

function StatusPill({ status, dueDate }: { status: string; dueDate: string }) {
  if (status === 'PAID')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{ background: '#f0fdf4', color: '#16a34a' }}>
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Pago
      </span>
    );
  if (isOverdue({ status, dueDate }))
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{ background: '#fff1f2', color: '#e53935' }}>
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        Vencida
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: '#fffbeb', color: '#d97706' }}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Pendente
    </span>
  );
}

export default function PainelPage() {
  const dispatch = useAppDispatch();
  const { customers, charges } = useAppSelector((s) => s.data);
  const { payables } = useAppSelector((s) => s.finance);
  const { leads } = useAppSelector((s) => s.crm);
  const { tasks } = useAppSelector((s) => s.tasks);

  useEffect(() => {
    void dispatch(fetchPayables());
    void dispatch(fetchLeads());
    void dispatch(fetchTasks());
  }, [dispatch]);

  const kpis = useMemo(() => {
    const pending = charges.filter((c) => c.status === 'PENDING');
    const aReceber = pending.reduce((s, c) => s + c.amountCents, 0);
    const recebido = charges.filter((c) => c.status === 'PAID').reduce((s, c) => s + c.amountCents, 0);
    const vencidas = pending.filter(isOverdue).length;
    const aPagar = payables.filter((p) => p.status === 'PENDING').reduce((s, p) => s + p.amountCents, 0);
    const tarefas = tasks.filter((t) => !t.done).length;
    const total = aReceber + recebido;
    const pct = total > 0 ? Math.round((recebido / total) * 100) : 0;
    return { aReceber, recebido, vencidas, aPagar, pct, tarefas };
  }, [charges, payables, tasks]);

  const chartData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        mes: d.toLocaleDateString('pt-BR', { month: 'short' }),
        receita: 0,
        despesa: 0,
      };
    });
    for (const c of charges) {
      if (c.status === 'PAID' && c.paidAt) {
        const d = new Date(c.paidAt);
        const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
        if (m) m.receita += c.amountCents / 100;
      }
    }
    for (const p of payables) {
      if (p.status === 'PAID' && p.paidAt) {
        const d = new Date(p.paidAt);
        const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
        if (m) m.despesa += p.amountCents / 100;
      }
    }
    return months;
  }, [charges, payables]);

  const recentes = charges.slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#f8f9fb' }}>
      <PageHeader
        title="Dashboard"
        breadcrumb="Dashboard"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/cobrancas"
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ borderColor: '#e5e7eb', color: '#374151' }}
            >
              <FileText className="h-4 w-4" />
              Relatório
            </Link>
            <Link
              href="/dashboard/cobrancas"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-all hover:-translate-y-px"
              style={{ background: 'linear-gradient(135deg,#e53935,#c62828)', boxShadow: '0 2px 8px rgba(229,57,53,0.3)' }}
            >
              <Plus className="h-4 w-4" />
              Nova receita
            </Link>
          </div>
        }
      />

      <div className="flex-1 space-y-6 p-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard label="A receber" value={brl(kpis.aReceber)} icon={Wallet} accent="indigo"
            trend={{ value: `${kpis.pct}% recebido`, up: kpis.pct > 50 }} />
          <StatCard label="Recebido" value={brl(kpis.recebido)} icon={BadgeDollarSign} accent="green" />
          <StatCard label="A pagar" value={brl(kpis.aPagar)} icon={Banknote} accent="red" />
          <StatCard label="Vencidas" value={String(kpis.vencidas)} hint="em atraso" icon={AlertTriangle} accent="orange" />
          <StatCard label="Clientes" value={String(customers.length)} icon={Users} accent="slate" />
          <StatCard label="Leads" value={String(leads.length)} icon={Target} accent="indigo" />
          <StatCard label="Tarefas" value={String(kpis.tarefas)} hint="pendentes" icon={ListChecks} accent="slate" />
        </div>

        {/* Chart + Progress */}
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Área chart */}
          <div className="lg:col-span-2 rounded-2xl bg-white p-6"
            style={{ border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Fluxo financeiro</h2>
                <p className="text-xs" style={{ color: '#9ca3af' }}>Receitas e despesas — últimos 7 meses</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium" style={{ color: '#6b7280' }}>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#4f46e5' }} />
                  Receita
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#e53935' }} />
                  Despesa
                </span>
              </div>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDespesa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e53935" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#e53935" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={11} tick={{ fill: '#9ca3af' }} />
                  <YAxis tickLine={false} axisLine={false} fontSize={11} tick={{ fill: '#9ca3af' }} width={48} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    formatter={(v: number, name: string) => [brl(Math.round(v * 100)), name === 'receita' ? 'Receita' : 'Despesa']}
                  />
                  <Area type="monotone" dataKey="receita" stroke="#4f46e5" strokeWidth={2} fill="url(#gReceita)" dot={false} activeDot={{ r: 4, fill: '#4f46e5' }} />
                  <Area type="monotone" dataKey="despesa" stroke="#e53935" strokeWidth={2} fill="url(#gDespesa)" dot={false} activeDot={{ r: 4, fill: '#e53935' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resumo + barra de progresso */}
          <div className="flex flex-col gap-4">
            {/* Saldo disponível */}
            <div className="rounded-2xl p-5 text-white"
              style={{ background: 'linear-gradient(135deg,#1b2a4a 0%,#0d1b2e 100%)', boxShadow: '0 4px 20px rgba(15,23,41,0.25)' }}>
              <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>SALDO ESTIMADO</p>
              <p className="mt-2 text-3xl font-bold">{brl(kpis.recebido - kpis.aPagar)}</p>
              <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <TrendingUp className="h-3.5 w-3.5" style={{ color: '#4ade80' }} />
                <span style={{ color: '#4ade80' }}>Receita menos despesas pagas</span>
              </div>
              {/* mini progress */}
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full" style={{ width: `${kpis.pct}%`, background: 'linear-gradient(90deg,#4f46e5,#818cf8)' }} />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <span>Recebido</span>
                <span>{kpis.pct}%</span>
              </div>
            </div>

            {/* Metas rápidas */}
            <div className="flex-1 rounded-2xl bg-white p-5"
              style={{ border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h3 className="mb-4 text-sm font-bold text-gray-900">Resumo rápido</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Cobranças ativas', value: charges.filter(c => c.status === 'PENDING').length, color: '#4f46e5' },
                  { label: 'Pagas este mês', value: charges.filter(c => c.status === 'PAID').length, color: '#16a34a' },
                  { label: 'Despesas pendentes', value: payables.filter(p => p.status === 'PENDING').length, color: '#e53935' },
                  { label: 'Leads no funil', value: leads.length, color: '#ea580c' },
                ].map(item => (
                  <li key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-xs" style={{ color: '#6b7280' }}>{item.label}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{item.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Transações recentes */}
        <div className="rounded-2xl bg-white"
          style={{ border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid #f8f8f8' }}>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Receitas recentes</h2>
              <p className="text-xs" style={{ color: '#9ca3af' }}>{charges.length} no total</p>
            </div>
            <Link href="/dashboard/cobrancas"
              className="flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-70"
              style={{ color: '#e53935' }}>
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #f8f8f8' }}>
                  {['Descrição', 'Cliente', 'Tipo', 'Valor', 'Vencimento', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: '#9ca3af' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentes.map((c, i) => (
                  <tr key={c.id}
                    className="transition-colors hover:bg-gray-50/60"
                    style={{ borderBottom: i < recentes.length - 1 ? '1px solid #f8f8f8' : 'none' }}>
                    <td className="px-6 py-3.5">
                      <span className="text-sm font-semibold text-gray-900">{c.description}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm" style={{ color: '#6b7280' }}>
                        {(c as { customer?: { name: string } }).customer?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: '#f3f4f6', color: '#374151' }}>
                        {c.recurrence === 'MONTHLY' ? 'Mensal' : 'Avulso'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm font-bold text-gray-900">{brl(c.amountCents)}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm" style={{ color: '#6b7280' }}>{fmtDate(c.dueDate)}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusPill status={c.status} dueDate={c.dueDate} />
                    </td>
                  </tr>
                ))}
                {recentes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: '#9ca3af' }}>
                      Nenhuma receita ainda. Clique em "Nova receita" para começar.
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
