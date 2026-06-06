'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createCharge, deleteCharge, updateCharge, type Charge,
} from '@/store/dataSlice';
import {
  fetchFinancialEntries, updateFinancialEntry, deleteFinancialEntry,
  type FinancialEntry,
} from '@/store/financialEntriesSlice';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Pencil, Plus, Search, Trash2, Wallet,
  Filter, TrendingUp, TrendingDown, Clock,
  MessageCircle, X,
} from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────
const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
const inputToCents = (v: string) => Math.round(Number(v || '0') * 100);
const centsToInput = (c: number) => (c / 100).toFixed(2);
const isOverdue = (c: { status: string; dueDate: string }) =>
  c.status === 'PENDING' && new Date(c.dueDate).getTime() < Date.now();

// ─── badges ───────────────────────────────────────────────────────────────────
function OrigemBadge({ kind }: { kind: 'manual' | 'wa' }) {
  return kind === 'wa'
    ? <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700"><MessageCircle className="h-3 w-3" />WhatsApp</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">Manual</span>;
}

function StatusBadge({ charge }: { charge: Charge }) {
  if (charge.status === 'PAID')
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Pago</span>;
  if (charge.status === 'CANCELED')
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-gray-400" />Cancelada</span>;
  if (isOverdue(charge))
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Vencida</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Pendente</span>;
}

function WaBadge({ confianca }: { confianca: string }) {
  const map: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    alta:  { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Confirmado' },
    media: { dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Provável'   },
    baixa: { dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-600',     label: 'Revisar'    },
  };
  const s = map[confianca] ?? map.baixa;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
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

function IconBtn({ title, onClick, className = '', children }: {
  title: string; onClick: () => void; className?: string; children: React.ReactNode;
}) {
  return (
    <button title={title} onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 ${className}`}>
      {children}
    </button>
  );
}

// ─── types ────────────────────────────────────────────────────────────────────
type Row = { kind: 'manual'; data: Charge } | { kind: 'wa'; data: FinancialEntry };

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CobrancasPage() {
  const dispatch = useAppDispatch();
  const { customers, charges } = useAppSelector((s) => s.data);
  const { entries: waEntries } = useAppSelector((s) => s.financialEntries);

  // filtros
  const [search, setSearch] = useState('');
  const [origemFilter, setOrigemFilter] = useState<'ALL' | 'manual' | 'wa'>('ALL');
  const [tipoFilter, setTipoFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // criar cobrança
  const [createOpen, setCreateOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('49.90');
  const [description, setDescription] = useState('Mensalidade');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [recurrence, setRecurrence] = useState('ONCE');

  // editar cobrança
  const [editChargeOpen, setEditChargeOpen] = useState(false);
  const [editCharge, setEditCharge] = useState<Charge | null>(null);
  const [editChargeDesc, setEditChargeDesc] = useState('');
  const [editChargeDue, setEditChargeDue] = useState('');
  const [editChargeCategory, setEditChargeCategory] = useState('');
  const [editChargeRecurrence, setEditChargeRecurrence] = useState('ONCE');

  // editar WA
  const [editWaOpen, setEditWaOpen] = useState(false);
  const [editWa, setEditWa] = useState<FinancialEntry | null>(null);
  const [editWaDesc, setEditWaDesc] = useState('');
  const [editWaTipo, setEditWaTipo] = useState('receita');
  const [editWaValor, setEditWaValor] = useState('');
  const [editWaRecorrencia, setEditWaRecorrencia] = useState('AVULSO');
  const [editWaData, setEditWaData] = useState('');
  const [editWaPagador, setEditWaPagador] = useState('');

  useEffect(() => {
    void dispatch(fetchFinancialEntries());
    if (customers[0] && !customerId) setCustomerId(customers[0].id);
  }, [dispatch, customers, customerId]);

  // ── summary ───────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total    = charges.filter(c => c.status !== 'CANCELED').reduce((s, c) => s + c.amountCents, 0);
    const pagas    = charges.filter(c => c.status === 'PAID').reduce((s, c) => s + c.amountCents, 0);
    const pendente = charges.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.amountCents, 0);
    const vencidas = charges.filter(isOverdue).length;
    const waR      = waEntries.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valorCents, 0);
    const waG      = waEntries.filter(e => e.tipo === 'gasto').reduce((s, e) => s + e.valorCents, 0);
    return { total, pagas, pendente, vencidas, waR, waG };
  }, [charges, waEntries]);

  // ── rows ──────────────────────────────────────────────────────────────────
  const rows = useMemo<Row[]>(() => {
    const q = search.toLowerCase();
    const manual: Row[] = charges
      .filter(c => {
        if (origemFilter === 'wa') return false;
        if (q && !c.description.toLowerCase().includes(q) &&
          !(c.category ?? '').toLowerCase().includes(q) &&
          !(c as { customer?: { name: string } }).customer?.name.toLowerCase().includes(q)) return false;
        if (tipoFilter !== 'ALL' && tipoFilter !== 'receita') return false;
        if (statusFilter === 'OVERDUE') return isOverdue(c);
        if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
        return true;
      })
      .map(c => ({ kind: 'manual' as const, data: c }));

    const wa: Row[] = waEntries
      .filter(e => {
        if (origemFilter === 'manual') return false;
        if (q && !e.descricao.toLowerCase().includes(q) &&
          !(e.pagadorNome ?? '').toLowerCase().includes(q)) return false;
        if (tipoFilter !== 'ALL' && e.tipo !== tipoFilter) return false;
        if (statusFilter !== 'ALL' && statusFilter !== 'WA') return false;
        return true;
      })
      .map(e => ({ kind: 'wa' as const, data: e }));

    return [...manual, ...wa].sort((a, b) => {
      const da = a.kind === 'manual' ? a.data.dueDate : (a.data.dataTransacao ?? a.data.createdAt);
      const db = b.kind === 'manual' ? b.data.dueDate : (b.data.dataTransacao ?? b.data.createdAt);
      return new Date(db).getTime() - new Date(da).getTime();
    });
  }, [charges, waEntries, search, origemFilter, tipoFilter, statusFilter]);

  // ── handlers ──────────────────────────────────────────────────────────────
  async function onCreateCharge(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(createCharge({ customerId, amountCents: inputToCents(amount), description, dueDate, category: category || undefined, recurrence }));
    if (createCharge.fulfilled.match(res)) { toast.success('Cobrança criada'); setCreateOpen(false); resetCreate(); }
  }
  function resetCreate() { setAmount('49.90'); setDescription('Mensalidade'); setDueDate(''); setCategory(''); setRecurrence('ONCE'); }

  function openEditCharge(c: Charge) {
    setEditCharge(c); setEditChargeDesc(c.description);
    setEditChargeDue(c.dueDate.slice(0, 10)); setEditChargeCategory(c.category ?? '');
    setEditChargeRecurrence(c.recurrence ?? 'ONCE'); setEditChargeOpen(true);
  }
  async function onEditCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!editCharge) return;
    const res = await dispatch(updateCharge({ id: editCharge.id, description: editChargeDesc, dueDate: editChargeDue || undefined, category: editChargeCategory || null, recurrence: editChargeRecurrence }));
    if (updateCharge.fulfilled.match(res)) { toast.success('Cobrança atualizada'); setEditChargeOpen(false); }
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }
  async function onDeleteCharge(c: Charge) {
    if (!window.confirm(`Excluir "${c.description}"?`)) return;
    const res = await dispatch(deleteCharge(c.id));
    if (deleteCharge.fulfilled.match(res)) toast.success('Excluído');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  function openEditWa(e: FinancialEntry) {
    setEditWa(e); setEditWaDesc(e.descricao); setEditWaTipo(e.tipo);
    setEditWaValor(centsToInput(e.valorCents)); setEditWaRecorrencia(e.recorrencia);
    setEditWaData(e.dataTransacao ? e.dataTransacao.slice(0, 10) : '');
    setEditWaPagador(e.pagadorNome ?? ''); setEditWaOpen(true);
  }
  async function onEditWa(e: React.FormEvent) {
    e.preventDefault();
    if (!editWa) return;
    const res = await dispatch(updateFinancialEntry({ id: editWa.id, descricao: editWaDesc, tipo: editWaTipo, valorCents: inputToCents(editWaValor), recorrencia: editWaRecorrencia, dataTransacao: editWaData || undefined, pagadorNome: editWaPagador || undefined }));
    if (updateFinancialEntry.fulfilled.match(res)) { toast.success('Atualizado'); setEditWaOpen(false); }
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }
  async function onDeleteWa(e: FinancialEntry) {
    if (!window.confirm(`Excluir "${e.descricao}"?`)) return;
    const res = await dispatch(deleteFinancialEntry(e.id));
    if (deleteFinancialEntry.fulfilled.match(res)) toast.success('Excluído');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }
  const activeFilters = [origemFilter !== 'ALL', tipoFilter !== 'ALL', statusFilter !== 'ALL'].filter(Boolean).length;

  return (
    <>
      <div className="min-h-screen bg-gray-50">

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div>
              <h1 className="text-base font-bold text-gray-900">Receitas & Lançamentos</h1>
              <p className="hidden text-xs text-gray-400 sm:block">
                {charges.length} cobranças · {waEntries.length} via WhatsApp
              </p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova cobrança</span>
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">

          {/* ── KPI CARDS ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Total cobrado', value: brl(summary.total), sub: `${charges.length} cobranças`, color: 'text-gray-900', bg: 'bg-gray-50', icon: Wallet, iconColor: 'text-gray-500' },
              { label: 'Recebido', value: brl(summary.pagas), sub: `${charges.filter(c => c.status === 'PAID').length} pagas`, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: TrendingUp, iconColor: 'text-emerald-500' },
              { label: 'Pendente', value: brl(summary.pendente), sub: `${charges.filter(c => c.status === 'PENDING').length} cobranças`, color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock, iconColor: 'text-amber-500' },
              { label: 'Vencidas', value: String(summary.vencidas), sub: 'em atraso', color: summary.vencidas > 0 ? 'text-red-600' : 'text-gray-900', bg: summary.vencidas > 0 ? 'bg-red-50' : 'bg-gray-50', icon: TrendingDown, iconColor: summary.vencidas > 0 ? 'text-red-500' : 'text-gray-400' },
              { label: 'Receitas WA', value: brl(summary.waR), sub: `${waEntries.filter(e => e.tipo === 'receita').length} entradas`, color: 'text-green-700', bg: 'bg-green-50', icon: MessageCircle, iconColor: 'text-green-500' },
              { label: 'Gastos WA', value: brl(summary.waG), sub: `${waEntries.filter(e => e.tipo === 'gasto').length} saídas`, color: 'text-red-700', bg: 'bg-red-50', icon: TrendingDown, iconColor: 'text-red-500' },
            ].map(k => (
              <div key={k.label} className={`rounded-2xl ${k.bg} p-4`} style={{ border: '1px solid #e5e7eb' }}>
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{k.label}</p>
                  <k.icon className={`h-3.5 w-3.5 ${k.iconColor}`} />
                </div>
                <p className={`text-lg font-bold tabular-nums ${k.color}`}>{k.value}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── FILTROS ───────────────────────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-4" style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
                  placeholder="Buscar por descrição, pagador ou cliente..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Toggle filtros */}
              <button
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all ${showFilters || activeFilters > 0 ? 'border-red-200 bg-red-50 text-red-600' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
                {activeFilters > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    {activeFilters}
                  </span>
                )}
              </button>
            </div>

            {/* Filtros expandidos */}
            {showFilters && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-50 pt-3">
                <Select value={origemFilter} onValueChange={v => setOrigemFilter(v as 'ALL' | 'manual' | 'wa')}>
                  <SelectTrigger className="h-8 w-36 rounded-lg border-gray-200 text-xs"><SelectValue placeholder="Origem" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas origens</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="wa">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="h-8 w-32 rounded-lg border-gray-200 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos tipos</SelectItem>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="gasto">Gasto</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-36 rounded-lg border-gray-200 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos status</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="PAID">Pago</SelectItem>
                    <SelectItem value="OVERDUE">Vencida</SelectItem>
                  </SelectContent>
                </Select>
                {activeFilters > 0 && (
                  <button
                    onClick={() => { setOrigemFilter('ALL'); setTipoFilter('ALL'); setStatusFilter('ALL'); }}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                    <X className="h-3 w-3" />Limpar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* contador de resultados */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {rows.length} resultado{rows.length !== 1 ? 's' : ''}
              {search && <span> para "<strong className="text-gray-600">{search}</strong>"</span>}
            </p>
          </div>

          {/* ── MOBILE: cards ─────────────────────────────────────────────── */}
          <div className="space-y-2 sm:hidden">
            {rows.map(row => {
              if (row.kind === 'manual') {
                const c = row.data;
                const nome = (c as { customer?: { name: string } }).customer?.name ?? '—';
                return (
                  <div key={`m-${c.id}`} className="rounded-2xl bg-white p-4" style={{ border: '1px solid #e5e7eb' }}>
                    <div className="flex items-start gap-3">
                      <Avatar name={nome} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-gray-900">{nome}</p>
                          <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${c.status === 'PAID' ? 'text-emerald-600' : 'text-gray-900'}`}>
                            {brl(c.amountCents)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{c.description}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <OrigemBadge kind="manual" />
                          <StatusBadge charge={c} />
                          <span className="text-[10px] text-gray-400">{fmtDate(c.dueDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-50 pt-3">
                      <IconBtn title="Editar" onClick={() => openEditCharge(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn title="Excluir" onClick={() => void onDeleteCharge(c)} className="hover:bg-red-50 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconBtn>
                    </div>
                  </div>
                );
              }

              const e = row.data;
              const pagador = e.pagadorNome ?? e.recebedorNome ?? '—';
              return (
                <div key={`wa-${e.id}`} className="rounded-2xl bg-white p-4" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex items-start gap-3">
                    <Avatar name={pagador} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{pagador}</p>
                        <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${e.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {e.tipo === 'gasto' ? '−' : '+'}{brl(e.valorCents)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{e.descricao}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <OrigemBadge kind="wa" />
                        <WaBadge confianca={e.confianca} />
                        <span className="text-[10px] text-gray-400">{fmtDate(e.dataTransacao)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-50 pt-3">
                    <IconBtn title="Editar" onClick={() => openEditWa(e)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn title="Excluir" onClick={() => void onDeleteWa(e)} className="hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconBtn>
                  </div>
                </div>
              );
            })}

            {rows.length === 0 && (
              <div className="rounded-2xl bg-white py-16 text-center" style={{ border: '1px solid #e5e7eb' }}>
                <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                <p className="text-sm font-medium text-gray-400">Nenhum registro encontrado</p>
                <button onClick={() => setCreateOpen(true)}
                  className="mt-3 text-xs font-semibold text-red-600 hover:text-red-700">
                  Criar primeira cobrança →
                </button>
              </div>
            )}
          </div>

          {/* ── DESKTOP: tabela ───────────────────────────────────────────── */}
          <div className="hidden overflow-hidden rounded-2xl bg-white sm:block" style={{ border: '1px solid #e5e7eb' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    {['Origem', 'Cliente / Pagador', 'Descrição', 'Tipo', 'Vencimento', 'Valor', 'Status', ''].map((h, i) => (
                      <th key={h + i} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(row => {
                    if (row.kind === 'manual') {
                      const c = row.data;
                      const nome = (c as { customer?: { name: string } }).customer?.name ?? '—';
                      const overdue = isOverdue(c);
                      return (
                        <tr key={`c-${c.id}`} className={`transition-colors hover:bg-gray-50/60 ${overdue ? 'bg-red-50/30' : ''}`}>
                          <td className="px-5 py-4"><OrigemBadge kind="manual" /></td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={nome} />
                              <span className="truncate font-medium text-gray-900 max-w-[120px]">{nome}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="block max-w-[180px] truncate text-gray-600">{c.description}</span>
                            {c.category && <span className="text-[10px] text-gray-400">{c.category}</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${c.recurrence === 'MONTHLY' ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-600'}`}>
                              {c.recurrence === 'MONTHLY' ? 'Mensal' : 'Avulso'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-sm ${overdue ? 'font-semibold text-red-600' : 'text-gray-500'}`}>{fmtDate(c.dueDate)}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`font-bold tabular-nums ${c.status === 'PAID' ? 'text-emerald-600' : 'text-gray-900'}`}>
                              {brl(c.amountCents)}
                            </span>
                          </td>
                          <td className="px-5 py-4"><StatusBadge charge={c} /></td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-0.5">
                              <IconBtn title="Editar" onClick={() => openEditCharge(c)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </IconBtn>
                              <IconBtn title="Excluir" onClick={() => void onDeleteCharge(c)} className="hover:bg-red-50 hover:text-red-500">
                                <Trash2 className="h-3.5 w-3.5" />
                              </IconBtn>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const e = row.data;
                    const pagador = e.pagadorNome ?? e.recebedorNome ?? '—';
                    return (
                      <tr key={`wa-${e.id}`} className="transition-colors hover:bg-gray-50/60">
                        <td className="px-5 py-4"><OrigemBadge kind="wa" /></td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={pagador} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-gray-900 max-w-[120px]">{pagador}</p>
                              {e.lead && <p className="truncate text-[10px] text-sky-600">Lead: {e.lead.name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="block max-w-[180px] truncate text-gray-600">{e.descricao}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${e.tipo === 'receita' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {e.tipo === 'receita' ? 'Receita' : 'Gasto'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">{fmtDate(e.dataTransacao)}</td>
                        <td className="px-5 py-4">
                          <span className={`font-bold tabular-nums ${e.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {e.tipo === 'gasto' ? '−' : '+'}{brl(e.valorCents)}
                          </span>
                        </td>
                        <td className="px-5 py-4"><WaBadge confianca={e.confianca} /></td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-0.5">
                            <IconBtn title="Editar" onClick={() => openEditWa(e)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn title="Excluir" onClick={() => void onDeleteWa(e)} className="hover:bg-red-50 hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center">
                        <Wallet className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                        <p className="text-sm text-gray-400">Nenhum registro encontrado</p>
                        <button onClick={() => setCreateOpen(true)}
                          className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700">
                          Criar primeira cobrança →
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

      {/* ── DIALOG: Nova cobrança ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Nova cobrança</DialogTitle>
            <DialogDescription className="text-xs">Gera PIX e envia lembrete por WhatsApp.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreateCharge} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50 text-sm"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Valor (R$)</Label>
                <Input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Vencimento</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Descrição</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Categoria</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Opcional" className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Recorrência</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONCE">Avulsa</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {customers.length === 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">Cadastre um cliente primeiro.</p>}
            <button type="submit" disabled={customers.length === 0}
              className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
              Criar cobrança
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Editar cobrança ───────────────────────────────────────── */}
      <Dialog open={editChargeOpen} onOpenChange={setEditChargeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Editar cobrança</DialogTitle>
            <DialogDescription className="text-xs">Atualize os dados da cobrança manual.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onEditCharge} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Descrição</Label>
              <Input value={editChargeDesc} onChange={e => setEditChargeDesc(e.target.value)} required className="rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Vencimento</Label>
                <Input type="date" value={editChargeDue} onChange={e => setEditChargeDue(e.target.value)} required className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Recorrência</Label>
                <Select value={editChargeRecurrence} onValueChange={setEditChargeRecurrence}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONCE">Avulsa</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Categoria</Label>
              <Input value={editChargeCategory} onChange={e => setEditChargeCategory(e.target.value)} placeholder="Opcional" className="rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <button type="submit"
              className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800">
              Salvar alterações
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: Editar WA ─────────────────────────────────────────────── */}
      <Dialog open={editWaOpen} onOpenChange={setEditWaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Editar lançamento WhatsApp</DialogTitle>
            <DialogDescription className="text-xs">Corrija os dados extraídos do comprovante.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onEditWa} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Descrição</Label>
              <Input value={editWaDesc} onChange={e => setEditWaDesc(e.target.value)} required className="rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Pagador / Remetente</Label>
              <Input value={editWaPagador} onChange={e => setEditWaPagador(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Valor (R$)</Label>
                <Input type="number" step="0.01" min="0.01" value={editWaValor} onChange={e => setEditWaValor(e.target.value)} required className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Data</Label>
                <Input type="date" value={editWaData} onChange={e => setEditWaData(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Tipo</Label>
                <Select value={editWaTipo} onValueChange={setEditWaTipo}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="gasto">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Recorrência</Label>
                <Select value={editWaRecorrencia} onValueChange={setEditWaRecorrencia}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVULSO">Avulso</SelectItem>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <button type="submit"
              className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800">
              Salvar alterações
            </button>
          </form>
        </DialogContent>
      </Dialog>

    </>
  );
}
