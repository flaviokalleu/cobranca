'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSummary } from '@/store/financeSlice';
import { api } from '@/lib/api';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';

interface DreData {
  revenue: { totalCents: number; breakdown: Array<{ account: string; amountCents: number }> };
  expenses: { totalCents: number; breakdown: Array<{ account: string; amountCents: number }> };
  grossProfitCents: number;
  operatingProfitCents: number;
  netProfitCents: number;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const pct = (part: number, total: number) =>
  total === 0 ? '0,0%' : `${((part / total) * 100).toFixed(1).replace('.', ',')}%`;

const pctNum = (part: number, total: number) =>
  total === 0 ? 0 : Math.min(100, Math.max(0, (part / total) * 100));

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function lastOfMonth() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
}

function DreRow({
  label,
  value,
  isSubtraction = false,
  isResult = false,
  isTotal = false,
}: {
  label: string;
  value: number;
  isSubtraction?: boolean;
  isResult?: boolean;
  isTotal?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-5 py-3 ${
        isResult
          ? 'rounded-xl bg-gray-900 text-white'
          : isTotal
            ? 'border-t border-gray-100 bg-gray-50/50'
            : 'border-t border-gray-50'
      }`}
    >
      <span
        className={`text-sm ${
          isResult ? 'font-bold text-white' : isTotal ? 'font-semibold text-gray-700' : 'font-medium text-gray-700'
        }`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums font-bold text-sm ${
          isResult
            ? value >= 0 ? 'text-emerald-400' : 'text-red-400'
            : isSubtraction
              ? 'text-red-600'
              : 'text-emerald-600'
        }`}
      >
        {isSubtraction && value !== 0 ? `(${brl(Math.abs(value))})` : brl(value)}
      </span>
    </div>
  );
}

export default function DrePage() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);
  const summary = useAppSelector((s) => s.finance.summary);

  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(lastOfMonth());
  const [dre, setDre] = useState<DreData | null>(null);

  useEffect(() => {
    if (role === 'ADMIN') {
      void dispatch(fetchSummary({ from, to }));
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      void api<DreData>('GET', `/finance/dre?${params.toString()}`).then((res) => {
        if (res.status < 400) setDre(res.data);
      });
    }
  }, [role, dispatch, from, to]);

  if (role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <h1 className="text-base font-bold text-gray-900">DRE</h1>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 rounded-2xl bg-white p-6" style={{ border: '1px solid #e5e7eb' }}>
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm text-gray-600">Acesso restrito a administradores.</p>
          </div>
        </div>
      </div>
    );
  }

  const d = summary ?? {
    revenueCents: 0,
    expenseCents: 0,
    resultCents: 0,
    cashCents: 0,
    aReceberCents: 0,
    aPagarCents: 0,
  };

  const margem = pctNum(d.resultCents, d.revenueCents);
  const margemStr = pct(Math.abs(d.resultCents), d.revenueCents === 0 ? 1 : d.revenueCents);
  const despRatio = pctNum(d.expenseCents, d.revenueCents);
  const posicaoLiquida = d.cashCents + d.aReceberCents - d.aPagarCents;
  const isLucro = d.resultCents >= 0;
  const chartData = [
    { name: 'Receita', valor: dre?.revenue.totalCents ?? d.revenueCents },
    { name: 'Despesa', valor: dre?.expenses.totalCents ?? d.expenseCents },
    { name: 'Resultado', valor: dre?.netProfitCents ?? d.resultCents },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div>
            <h1 className="text-base font-bold text-gray-900">DRE</h1>
            <p className="hidden text-xs text-gray-400 sm:block">Demonstracao do Resultado</p>
          </div>
          <button
            onClick={() => void dispatch(fetchSummary({ from, to }))}
            className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
            style={{ border: '1px solid #e5e7eb' }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">

        {/* Filtro de periodo */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-5 py-4" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <CalendarDays className="h-4 w-4 text-gray-400" />
            Periodo
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-gray-400">De</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-gray-400">Ate</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            {[
              { label: 'Este mes', f: firstOfMonth(), t: lastOfMonth() },
              { label: 'Sem filtro', f: '', t: '' },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => { setFrom(opt.f); setTo(opt.t); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  from === opt.f && to === opt.t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI rápidos */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Receita', value: brl(d.revenueCents), icon: TrendingUp, bg: 'bg-emerald-50', iconColor: 'text-emerald-500', textColor: 'text-emerald-700' },
            { label: 'Despesa', value: brl(d.expenseCents), icon: TrendingDown, bg: 'bg-red-50', iconColor: 'text-red-500', textColor: 'text-red-600' },
            { label: 'Resultado', value: brl(d.resultCents), icon: Scale, bg: isLucro ? 'bg-blue-50' : 'bg-orange-50', iconColor: isLucro ? 'text-blue-500' : 'text-orange-500', textColor: isLucro ? 'text-blue-700' : 'text-orange-700' },
            { label: 'Em caixa', value: brl(d.cashCents), icon: Wallet, bg: 'bg-violet-50', iconColor: 'text-violet-500', textColor: 'text-violet-700' },
          ].map((k) => (
            <div key={k.label} className={`rounded-2xl ${k.bg} p-4`} style={{ border: '1px solid #e5e7eb' }}>
              <div className="mb-2 flex items-start justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{k.label}</p>
                <k.icon className={`h-3.5 w-3.5 ${k.iconColor}`} />
              </div>
              <p className={`text-lg font-bold tabular-nums ${k.textColor}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* DRE vertical */}
        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e7eb' }}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Demonstracao do Resultado</h2>
          </div>
          <div className="divide-y-0">
            <DreRow label="(+) Receita Bruta" value={d.revenueCents} />
            <DreRow label="(−) Despesas Operacionais" value={d.expenseCents} isSubtraction />
            <DreRow label={isLucro ? '= Lucro Operacional' : '= Prejuizo Operacional'} value={d.resultCents} isResult />
          </div>

          <div className="space-y-4 px-5 py-5 border-t border-gray-100 bg-gray-50/30">
            <div className="flex items-center gap-3 rounded-xl p-3" style={{
              background: isLucro ? '#f0fdf4' : '#fff7ed',
              border: `1px solid ${isLucro ? '#bbf7d0' : '#fed7aa'}`,
            }}>
              {isLucro
                ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                : <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />}
              <div>
                <p className={`text-xs font-bold ${isLucro ? 'text-emerald-700' : 'text-orange-700'}`}>
                  {isLucro ? 'Empresa lucrativa' : 'Empresa com prejuizo'}
                </p>
                <p className={`text-xs ${isLucro ? 'text-emerald-600' : 'text-orange-600'}`}>
                  Margem de {isLucro ? 'lucro' : 'prejuizo'}: {margemStr} da receita
                </p>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Comprometimento de receita</p>
                <p className="text-xs font-bold text-gray-600">{pct(d.expenseCents, d.revenueCents)} em despesas</p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full transition-all ${despRatio > 90 ? 'bg-red-500' : despRatio > 70 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${despRatio}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                <span>0%</span>
                <span className={despRatio > 90 ? 'font-bold text-red-500' : despRatio > 70 ? 'font-bold text-amber-500' : 'font-bold text-emerald-500'}>{despRatio.toFixed(0)}%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Margem {isLucro ? 'liquida' : 'de prejuizo'}</p>
                <p className={`text-xs font-bold ${isLucro ? 'text-emerald-600' : 'text-red-600'}`}>{margemStr}</p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full rounded-full transition-all ${isLucro ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${margem}%` }} />
              </div>
            </div>
          </div>
        </div>

        {dre && (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e7eb' }}>
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">DRE por conta</h2>
              </div>
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Receitas</p>
                  {dre.revenue.breakdown.map((row) => (
                    <DreRow key={row.account} label={row.account} value={row.amountCents} />
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Despesas</p>
                  {dre.expenses.breakdown.map((row) => (
                    <DreRow key={row.account} label={row.account} value={row.amountCents} isSubtraction />
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-900">Comparativo</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => brl(Number(value))} />
                    <Bar dataKey="valor" fill="#dc2626" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Posicao financeira */}
        <div className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid #e5e7eb' }}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Posicao Financeira</h2>
          </div>
          <div className="grid grid-cols-1 divide-y divide-gray-50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              { label: 'Em caixa', value: d.cashCents, icon: Wallet, desc: 'Disponivel agora', color: 'text-violet-600', bg: '#f5f3ff', iconColor: '#7c3aed' },
              { label: 'A receber', value: d.aReceberCents, icon: ArrowDownCircle, desc: 'Cobrancas pendentes', color: 'text-blue-600', bg: '#eff6ff', iconColor: '#2563eb' },
              { label: 'A pagar', value: d.aPagarCents, icon: ArrowUpCircle, desc: 'Contas em aberto', color: 'text-rose-600', bg: '#fff1f2', iconColor: '#e11d48' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: item.bg }}>
                  <item.icon className="h-5 w-5" style={{ color: item.iconColor }} />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{item.label}</p>
                  <p className={`text-lg font-bold tabular-nums ${item.color}`}>{brl(item.value)}</p>
                  <p className="text-[11px] text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100" style={{ background: '#f8fafc' }}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Posicao Liquida Projetada</p>
              <p className="mt-0.5 text-xs text-gray-400">Caixa + A receber − A pagar</p>
            </div>
            <p className={`text-xl font-bold tabular-nums ${posicaoLiquida >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {brl(posicaoLiquida)}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
