'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createCharge, deleteCharge, fetchCharges, fetchCustomers, fetchUpcomingCharges, updateCharge, type Charge,
} from '@/store/dataSlice';
import {
  fetchFinancialEntries, updateFinancialEntry, deleteFinancialEntry,
  type FinancialEntry,
} from '@/store/financialEntriesSlice';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DataPagination } from '@/components/ui/data-pagination';
import {
  Copy, CopyPlus, Pencil, Plus, Search, Trash2, Wallet,
  Filter, TrendingUp, TrendingDown, Clock,
  MessageCircle, X,
} from 'lucide-react';

// â”€â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';
const inputToCents = (v: string) => Math.round(Number(v || '0') * 100);
const centsToInput = (c: number) => (c / 100).toFixed(2);
const isOverdue = (c: { status: string; dueDate: string }) =>
  c.status === 'PENDING' && new Date(c.dueDate).getTime() < Date.now();
const addMonth = (iso: string) => {
  const date = new Date(iso);
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
};

// â”€â”€â”€ badges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />A receber</span>;
}

function WaBadge({ confianca }: { confianca: string }) {
  const map: Record<string, { dot: string; bg: string; text: string; label: string }> = {
    alta:  { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Confirmado' },
    media: { dot: 'bg-amber-400',   bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Provavel'   },
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

// â”€â”€â”€ types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
type Row = { kind: 'manual'; data: Charge } | { kind: 'wa'; data: FinancialEntry };

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function CobrancasPage() {
  const dispatch = useAppDispatch();
  const { customers, charges, upcomingCharges, chargesPagination } = useAppSelector((s) => s.data);
  const { entries: waEntries } = useAppSelector((s) => s.financialEntries);
  const [page, setPage] = useState(1);

  // filtros
  const [search, setSearch] = useState('');
  const [origemFilter, setOrigemFilter] = useState<'ALL' | 'manual' | 'wa'>('ALL');
  const [tipoFilter, setTipoFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showFilters, setShowFilters] = useState(false);

  // criar cobranca
  const [createOpen, setCreateOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('49.90');
  const [description, setDescription] = useState('Mensalidade');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [recurrence, setRecurrence] = useState('ONCE');
  const [nextDueAt, setNextDueAt] = useState('');
  const [interestMode, setInterestMode] = useState('NONE');
  const [interestRateBps, setInterestRateBps] = useState('0');
  const [interestGraceDays, setInterestGraceDays] = useState('0');

  // editar cobranca
  const [editChargeOpen, setEditChargeOpen] = useState(false);
  const [editCharge, setEditCharge] = useState<Charge | null>(null);
  const [editChargeDesc, setEditChargeDesc] = useState('');
  const [editChargeDue, setEditChargeDue] = useState('');
  const [editChargeCategory, setEditChargeCategory] = useState('');
  const [editChargeRecurrence, setEditChargeRecurrence] = useState('ONCE');
  const [editChargeNextDueAt, setEditChargeNextDueAt] = useState('');
  const [editChargeInterestMode, setEditChargeInterestMode] = useState('NONE');
  const [editChargeInterestRateBps, setEditChargeInterestRateBps] = useState('0');
  const [editChargeInterestGraceDays, setEditChargeInterestGraceDays] = useState('0');

  // editar WA
  const [editWaOpen, setEditWaOpen] = useState(false);
  const [editWa, setEditWa] = useState<FinancialEntry | null>(null);
  const [editWaDesc, setEditWaDesc] = useState('');
  const [editWaTipo, setEditWaTipo] = useState('receita');
  const [editWaValor, setEditWaValor] = useState('');
  const [editWaRecorrencia, setEditWaRecorrencia] = useState('AVULSO');
  const [editWaData, setEditWaData] = useState('');
  const [editWaPagador, setEditWaPagador] = useState('');
  const [editWaObservacao, setEditWaObservacao] = useState('');

  useEffect(() => {
    void dispatch(fetchCharges({ page }));
    void dispatch(fetchFinancialEntries());
    void dispatch(fetchUpcomingCharges());
    if (customers[0] && !customerId) setCustomerId(customers[0].id);
  }, [dispatch, customers, customerId, page]);

  useEffect(() => {
    void dispatch(fetchCustomers({ limit: 100 }));
  }, [dispatch]);

  // â”€â”€ summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const summary = useMemo(() => {
    const total    = charges.filter(c => c.status !== 'CANCELED').reduce((s, c) => s + c.amountCents, 0);
    const pagas    = charges.filter(c => c.status === 'PAID').reduce((s, c) => s + c.amountCents, 0);
    const pendente = charges.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.amountCents, 0);
    const vencidas = charges.filter(isOverdue).length;
    const waR      = waEntries.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valorCents, 0);
    const waG      = waEntries.filter(e => e.tipo === 'gasto').reduce((s, e) => s + e.valorCents, 0);
    const upcoming = upcomingCharges.reduce((s, c) => s + c.amountCents, 0);
    return { total, pagas, pendente, vencidas, waR, waG, upcoming };
  }, [charges, upcomingCharges, waEntries]);

  // â”€â”€ rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          !(e.pagadorNome ?? '').toLowerCase().includes(q) &&
          !(e.observacao ?? '').toLowerCase().includes(q)) return false;
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

  // â”€â”€ handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function onCreateCharge(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(createCharge({
      customerId,
      amountCents: inputToCents(amount),
      description,
      dueDate,
      category: category || undefined,
      recurrence,
      nextDueAt: recurrence === 'MONTHLY' && nextDueAt ? nextDueAt : undefined,
      interestMode,
      interestRateBps: Number(interestRateBps || 0),
      interestGraceDays: Number(interestGraceDays || 0),
    }));
    if (createCharge.fulfilled.match(res)) { toast.success('Cobranca criada'); setCreateOpen(false); resetCreate(); }
  }
  function resetCreate() {
    setAmount('49.90'); setDescription('Mensalidade'); setDueDate(''); setCategory('');
    setRecurrence('ONCE'); setNextDueAt(''); setInterestMode('NONE');
    setInterestRateBps('0'); setInterestGraceDays('0');
  }

  function openEditCharge(c: Charge) {
    setEditCharge(c); setEditChargeDesc(c.description);
    setEditChargeDue(c.dueDate.slice(0, 10)); setEditChargeCategory(c.category ?? '');
    setEditChargeRecurrence(c.recurrence ?? 'ONCE');
    setEditChargeNextDueAt(c.nextDueAt ? c.nextDueAt.slice(0, 10) : '');
    setEditChargeInterestMode(c.interestMode ?? 'NONE');
    setEditChargeInterestRateBps(String(c.interestRateBps ?? 0));
    setEditChargeInterestGraceDays(String(c.interestGraceDays ?? 0));
    setEditChargeOpen(true);
  }
  async function onEditCharge(e: React.FormEvent) {
    e.preventDefault();
    if (!editCharge) return;
    const res = await dispatch(updateCharge({
      id: editCharge.id,
      description: editChargeDesc,
      dueDate: editChargeDue || undefined,
      category: editChargeCategory || null,
      recurrence: editChargeRecurrence,
      nextDueAt: editChargeRecurrence === 'MONTHLY'
        ? (editChargeNextDueAt || undefined)
        : null,
      interestMode: editChargeInterestMode,
      interestRateBps: Number(editChargeInterestRateBps || 0),
      interestGraceDays: Number(editChargeInterestGraceDays || 0),
    }));
    if (updateCharge.fulfilled.match(res)) { toast.success('Cobranca atualizada'); setEditChargeOpen(false); }
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }
  async function onDeleteCharge(c: Charge) {
    if (!window.confirm(`Excluir "${c.description}"?`)) return;
    const res = await dispatch(deleteCharge(c.id));
    if (deleteCharge.fulfilled.match(res)) toast.success('Excluido');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function copyPublicPaymentLink(c: Charge) {
    if (!c.publicToken) {
      toast.error('Link publico ainda nao foi gerado para esta cobranca.');
      return;
    }
    await navigator.clipboard.writeText(`${window.location.origin}/pagar/${c.publicToken}`);
    toast.success('Link de pagamento copiado');
  }

  async function duplicateCharge(c: Charge) {
    const customerId = c.customer?.id;
    if (!customerId) {
      toast.error('Esta cobranca nao tem cliente vinculado para duplicar.');
      return;
    }
    const res = await dispatch(createCharge({
      customerId,
      amountCents: c.amountCents,
      description: `Copia - ${c.description}`,
      dueDate: c.recurrence === 'MONTHLY' ? addMonth(c.dueDate) : c.dueDate.slice(0, 10),
      category: c.category ?? undefined,
      recurrence: c.recurrence ?? 'ONCE',
      interestMode: c.interestMode ?? undefined,
      interestRateBps: c.interestRateBps ?? undefined,
      interestGraceDays: c.interestGraceDays ?? undefined,
    }));
    if (createCharge.fulfilled.match(res)) toast.success('Cobranca duplicada');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro ao duplicar');
  }

  function openEditWa(e: FinancialEntry) {
    setEditWa(e); setEditWaDesc(e.descricao); setEditWaTipo(e.tipo);
    setEditWaValor(centsToInput(e.valorCents)); setEditWaRecorrencia(e.recorrencia);
    setEditWaData(e.dataTransacao ? e.dataTransacao.slice(0, 10) : '');
    setEditWaPagador(e.pagadorNome ?? '');
    setEditWaObservacao(e.observacao ?? '');
    setEditWaOpen(true);
  }
  async function onEditWa(e: React.FormEvent) {
    e.preventDefault();
    if (!editWa) return;
    const res = await dispatch(updateFinancialEntry({
      id: editWa.id,
      descricao: editWaDesc,
      observacao: editWaObservacao.trim() || null,
      tipo: editWaTipo,
      valorCents: inputToCents(editWaValor),
      recorrencia: editWaRecorrencia,
      dataTransacao: editWaData || undefined,
      pagadorNome: editWaPagador || undefined,
    }));
    if (updateFinancialEntry.fulfilled.match(res)) { toast.success('Atualizado'); setEditWaOpen(false); }
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }
  async function onDeleteWa(e: FinancialEntry) {
    if (!window.confirm(`Excluir "${e.descricao}"?`)) return;
    const res = await dispatch(deleteFinancialEntry(e.id));
    if (deleteFinancialEntry.fulfilled.match(res)) toast.success('Excluido');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }
  const activeFilters = [origemFilter !== 'ALL', tipoFilter !== 'ALL', statusFilter !== 'ALL'].filter(Boolean).length;

  return (
    <>
      <div className="min-h-screen bg-gray-50">

        {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div>
              <h1 className="text-base font-bold text-gray-900">Receber dinheiro</h1>
              <p className="hidden text-xs text-gray-400 sm:block">
                {charges.length} cobrancas · {waEntries.length} via WhatsApp
              </p>
            </div>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova cobranca</span>
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">

          {/* â”€â”€ KPI CARDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            {[
              { label: 'Valor cobrado', value: brl(summary.total), sub: `${charges.length} cobrancas`, color: 'text-gray-900', bg: 'bg-gray-50', icon: Wallet, iconColor: 'text-gray-500' },
              { label: 'Recebido', value: brl(summary.pagas), sub: `${charges.filter(c => c.status === 'PAID').length} pagas`, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: TrendingUp, iconColor: 'text-emerald-500' },
              { label: 'A receber', value: brl(summary.pendente), sub: `${charges.filter(c => c.status === 'PENDING').length} cobrancas`, color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock, iconColor: 'text-amber-500' },
              { label: 'Vencidas', value: String(summary.vencidas), sub: 'em atraso', color: summary.vencidas > 0 ? 'text-red-600' : 'text-gray-900', bg: summary.vencidas > 0 ? 'bg-red-50' : 'bg-gray-50', icon: TrendingDown, iconColor: summary.vencidas > 0 ? 'text-red-500' : 'text-gray-400' },
              { label: 'Mensais proximas', value: brl(summary.upcoming), sub: `${upcomingCharges.length} em 30 dias`, color: 'text-indigo-700', bg: 'bg-indigo-50', icon: Clock, iconColor: 'text-indigo-500' },
              { label: 'Entrou no WhatsApp', value: brl(summary.waR), sub: `${waEntries.filter(e => e.tipo === 'receita').length} entradas`, color: 'text-green-700', bg: 'bg-green-50', icon: MessageCircle, iconColor: 'text-green-500' },
              { label: 'Saidas WA', value: brl(summary.waG), sub: `${waEntries.filter(e => e.tipo === 'gasto').length} saidas`, color: 'text-red-700', bg: 'bg-red-50', icon: TrendingDown, iconColor: 'text-red-500' },
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

          {/* â”€â”€ FILTROS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="rounded-2xl bg-white p-4" style={{ border: '1px solid #e5e7eb' }}>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
                  placeholder="Buscar cliente, descricao ou valor..."
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
                    <SelectItem value="ALL">Tudo</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="wa">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tipoFilter} onValueChange={setTipoFilter}>
                  <SelectTrigger className="h-8 w-32 rounded-lg border-gray-200 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Entrada ou saida</SelectItem>
                    <SelectItem value="receita">Entrada</SelectItem>
                    <SelectItem value="gasto">Saida</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-36 rounded-lg border-gray-200 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Qualquer status</SelectItem>
                    <SelectItem value="PENDING">A receber</SelectItem>
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

          {/* â”€â”€ MOBILE: cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="space-y-2 sm:hidden">
            {rows.map(row => {
              if (row.kind === 'manual') {
                const c = row.data;
                const nome = (c as { customer?: { name: string } }).customer?.name ?? '-';
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
                        {c.recurrence === 'MONTHLY' && c.nextDueAt && (
                          <p className="mt-1 text-[10px] font-medium text-indigo-600">
                            Proxima geracao: {fmtDate(c.nextDueAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-50 pt-3">
                      <IconBtn title="Copiar link de pagamento" onClick={() => void copyPublicPaymentLink(c)}>
                        <Copy className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn title="Duplicar cobranca" onClick={() => void duplicateCharge(c)}>
                        <CopyPlus className="h-3.5 w-3.5" />
                      </IconBtn>
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
              const pagador = e.pagadorNome ?? e.recebedorNome ?? '-';
              return (
                <div key={`wa-${e.id}`} className="rounded-2xl bg-white p-4" style={{ border: '1px solid #e5e7eb' }}>
                  <div className="flex items-start gap-3">
                    <Avatar name={pagador} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{pagador}</p>
                        <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${e.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {e.tipo === 'gasto' ? '-' : '+'}{brl(e.valorCents)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-500">{e.descricao}</p>
                      {e.observacao && (
                        <p className="mt-1 line-clamp-2 text-[11px] text-gray-400">{e.observacao}</p>
                      )}
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
                  Criar primeira cobranca
                </button>
              </div>
            )}
          </div>

          {/* â”€â”€ DESKTOP: tabela â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <div className="hidden overflow-hidden rounded-2xl bg-white sm:block" style={{ border: '1px solid #e5e7eb' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/60">
                    {['Origem', 'Cliente / Pagador', 'Descricao', 'Tipo', 'Vencimento', 'Valor', 'Status', ''].map((h, i) => (
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
                      const nome = (c as { customer?: { name: string } }).customer?.name ?? '-';
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
                            {c.recurrence === 'MONTHLY' && c.nextDueAt && (
                              <span className="mt-1 block text-[10px] font-medium text-indigo-600">
                                Proxima: {fmtDate(c.nextDueAt)}
                              </span>
                            )}
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
                              <IconBtn title="Copiar link de pagamento" onClick={() => void copyPublicPaymentLink(c)}>
                                <Copy className="h-3.5 w-3.5" />
                              </IconBtn>
                              <IconBtn title="Duplicar cobranca" onClick={() => void duplicateCharge(c)}>
                                <CopyPlus className="h-3.5 w-3.5" />
                              </IconBtn>
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
                    const pagador = e.pagadorNome ?? e.recebedorNome ?? '-';
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
                          {e.observacao && (
                            <span className="mt-0.5 block max-w-[220px] truncate text-[11px] text-gray-400">{e.observacao}</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${e.tipo === 'receita' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {e.tipo === 'receita' ? 'Entrada' : 'Saida'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">{fmtDate(e.dataTransacao)}</td>
                        <td className="px-5 py-4">
                          <span className={`font-bold tabular-nums ${e.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {e.tipo === 'gasto' ? '-' : '+'}{brl(e.valorCents)}
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
                          Criar primeira cobranca
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DataPagination
            page={chargesPagination.page}
            total={chargesPagination.total}
            totalPages={chargesPagination.totalPages}
            onPageChange={setPage}
          />

        </div>
      </div>

      {/* â”€â”€ DIALOG: Nova cobranca â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Nova cobranca</DialogTitle>
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
              <Label className="text-xs font-semibold text-gray-600">Descricao</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Categoria</Label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Opcional" className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Recorrencia</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONCE">Avulsa</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Juros</Label>
                <Select value={interestMode} onValueChange={setInterestMode}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sem juros</SelectItem>
                    <SelectItem value="DAILY">Diario</SelectItem>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Taxa bps</Label>
                <Input type="number" min="0" value={interestRateBps} onChange={e => setInterestRateBps(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Carencia</Label>
                <Input type="number" min="0" value={interestGraceDays} onChange={e => setInterestGraceDays(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
            </div>
            {recurrence === 'MONTHLY' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Proxima geracao</Label>
                <Input type="date" value={nextDueAt} onChange={e => setNextDueAt(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
            )}
            {customers.length === 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">Cadastre um cliente primeiro.</p>}
            <button type="submit" disabled={customers.length === 0}
              className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
              Criar cobranca
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ DIALOG: Editar cobranca â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={editChargeOpen} onOpenChange={setEditChargeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Editar cobranca</DialogTitle>
            <DialogDescription className="text-xs">Atualize os dados da cobranca manual.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onEditCharge} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Descricao</Label>
              <Input value={editChargeDesc} onChange={e => setEditChargeDesc(e.target.value)} required className="rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Vencimento</Label>
                <Input type="date" value={editChargeDue} onChange={e => setEditChargeDue(e.target.value)} required className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Recorrencia</Label>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Juros</Label>
                <Select value={editChargeInterestMode} onValueChange={setEditChargeInterestMode}>
                  <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Sem juros</SelectItem>
                    <SelectItem value="DAILY">Diario</SelectItem>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Taxa bps</Label>
                <Input type="number" min="0" value={editChargeInterestRateBps} onChange={e => setEditChargeInterestRateBps(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Carencia</Label>
                <Input type="number" min="0" value={editChargeInterestGraceDays} onChange={e => setEditChargeInterestGraceDays(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
            </div>
            {editChargeRecurrence === 'MONTHLY' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Proxima geracao</Label>
                <Input type="date" value={editChargeNextDueAt} onChange={e => setEditChargeNextDueAt(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
              </div>
            )}
            <button type="submit"
              className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800">
              Salvar alteracoes
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ DIALOG: Editar WA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={editWaOpen} onOpenChange={setEditWaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Editar lancamento WhatsApp</DialogTitle>
            <DialogDescription className="text-xs">Corrija os dados extraidos do comprovante.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onEditWa} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Descricao</Label>
              <Input value={editWaDesc} onChange={e => setEditWaDesc(e.target.value)} required className="rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Pagador / Remetente</Label>
              <Input value={editWaPagador} onChange={e => setEditWaPagador(e.target.value)} className="rounded-xl border-gray-200 bg-gray-50" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Observacao</Label>
              <textarea
                value={editWaObservacao}
                onChange={e => setEditWaObservacao(e.target.value)}
                rows={3}
                placeholder="Anote algo importante sobre este lancamento"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-300 focus:bg-white focus:ring-2 focus:ring-red-100"
              />
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
                    <SelectItem value="receita">Entrada</SelectItem>
                    <SelectItem value="gasto">Saida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Recorrencia</Label>
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
              Salvar alteracoes
            </button>
          </form>
        </DialogContent>
      </Dialog>

    </>
  );
}


