'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearPix, createCharge, deleteCharge, fetchPix,
  payCharge, sendChargeWhatsappReminder, updateCharge, type Charge,
} from '@/store/dataSlice';
import {
  fetchFinancialEntries, updateFinancialEntry, deleteFinancialEntry,
  type FinancialEntry,
} from '@/store/financialEntriesSlice';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Copy, MessageCircle, Pencil, Plus, Search, Trash2, Wallet, CheckCircle2,
} from 'lucide-react';

// ─── helpers ─────────────────────────────────────────────────────────────────
const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
const inputToCents = (v: string) => Math.round(Number(v || '0') * 100);
const centsToInput = (c: number) => (c / 100).toFixed(2);
const isOverdue = (c: { status: string; dueDate: string }) =>
  c.status === 'PENDING' && new Date(c.dueDate).getTime() < Date.now();

// ─── sub-components ──────────────────────────────────────────────────────────
function OrigemBadge({ kind }: { kind: 'manual' | 'wa' }) {
  return kind === 'wa'
    ? (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ background: '#dcfce7', color: '#16a34a' }}>
        <MessageCircle className="h-3 w-3" /> WhatsApp
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ background: '#ede9fe', color: '#7c3aed' }}>
        Manual
      </span>
    );
}

function ChargeStatus({ charge }: { charge: Charge }) {
  if (charge.status === 'PAID') return <Badge variant="success">Pago</Badge>;
  if (isOverdue(charge)) return <Badge variant="destructive">Vencida</Badge>;
  if (charge.status === 'CANCELED') return <Badge variant="secondary">Cancelada</Badge>;
  return <Badge variant="warning">Pendente</Badge>;
}

function WaStatus({ confianca }: { confianca: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    alta:  { label: 'Confirmado', bg: '#ecfdf5', color: '#059669' },
    media: { label: 'Provável',   bg: '#fffbeb', color: '#d97706' },
    baixa: { label: 'Revisar',    bg: '#fff1f2', color: '#e11d48' },
  };
  const s = map[confianca] ?? map.baixa;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white p-4"
      style={{ border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', borderLeft: `4px solid ${color}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#9ca3af' }}>{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[11px]" style={{ color: '#9ca3af' }}>{sub}</p>}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function CobrancasPage() {
  const dispatch = useAppDispatch();
  const { customers, charges, pix } = useAppSelector((s) => s.data);
  const { entries: waEntries } = useAppSelector((s) => s.financialEntries);

  // ── filters
  const [search, setSearch] = useState('');
  const [origemFilter, setOrigemFilter] = useState<'ALL' | 'manual' | 'wa'>('ALL');
  const [tipoFilter, setTipoFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // ── create charge dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('49.90');
  const [description, setDescription] = useState('Mensalidade');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [recurrence, setRecurrence] = useState('ONCE');

  // ── edit charge dialog
  const [editChargeOpen, setEditChargeOpen] = useState(false);
  const [editCharge, setEditCharge] = useState<Charge | null>(null);
  const [editChargeDesc, setEditChargeDesc] = useState('');
  const [editChargeDue, setEditChargeDue] = useState('');
  const [editChargeCategory, setEditChargeCategory] = useState('');
  const [editChargeRecurrence, setEditChargeRecurrence] = useState('ONCE');

  // ── edit WA entry dialog
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

  // ── unified row type
  type Row =
    | { kind: 'manual'; data: Charge }
    | { kind: 'wa'; data: FinancialEntry };

  const rows = useMemo<Row[]>(() => {
    const q = search.toLowerCase();

    const manualRows: Row[] = charges
      .filter((c) => {
        if (origemFilter === 'wa') return false;
        if (q && !c.description.toLowerCase().includes(q) &&
          !(c.category ?? '').toLowerCase().includes(q) &&
          !(c as { customer?: { name: string } }).customer?.name.toLowerCase().includes(q)) return false;
        if (tipoFilter !== 'ALL' && tipoFilter !== 'receita') return false;
        if (statusFilter === 'OVERDUE') return isOverdue(c);
        if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
        return true;
      })
      .map((c) => ({ kind: 'manual' as const, data: c }));

    const waRows: Row[] = waEntries
      .filter((e) => {
        if (origemFilter === 'manual') return false;
        if (q && !e.descricao.toLowerCase().includes(q) &&
          !(e.pagadorNome ?? '').toLowerCase().includes(q)) return false;
        if (tipoFilter !== 'ALL' && e.tipo !== tipoFilter) return false;
        if (statusFilter !== 'ALL' && statusFilter !== 'WA') return false;
        return true;
      })
      .map((e) => ({ kind: 'wa' as const, data: e }));

    return [...manualRows, ...waRows].sort((a, b) => {
      const da = a.kind === 'manual' ? a.data.dueDate : (a.data.dataTransacao ?? a.data.createdAt);
      const db2 = b.kind === 'manual' ? b.data.dueDate : (b.data.dataTransacao ?? b.data.createdAt);
      return new Date(db2).getTime() - new Date(da).getTime();
    });
  }, [charges, waEntries, search, origemFilter, tipoFilter, statusFilter]);

  // ── summary
  const summary = useMemo(() => {
    const receitaManual = charges.filter(c => c.status !== 'CANCELED').reduce((s, c) => s + c.amountCents, 0);
    const receitaWa = waEntries.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valorCents, 0);
    const gastoWa = waEntries.filter(e => e.tipo === 'gasto').reduce((s, e) => s + e.valorCents, 0);
    const pagas = charges.filter(c => c.status === 'PAID').reduce((s, c) => s + c.amountCents, 0);
    return { receitaManual, receitaWa, gastoWa, pagas };
  }, [charges, waEntries]);

  // ── create charge
  async function onCreateCharge(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(createCharge({ customerId, amountCents: inputToCents(amount), description, dueDate, category: category || undefined, recurrence }));
    if (createCharge.fulfilled.match(res)) { toast.success('Receita criada'); setCreateOpen(false); resetCreate(); }
  }
  function resetCreate() { setAmount('49.90'); setDescription('Mensalidade'); setDueDate(''); setCategory(''); setRecurrence('ONCE'); }

  // ── edit charge
  function openEditCharge(c: Charge) {
    setEditCharge(c);
    setEditChargeDesc(c.description);
    setEditChargeDue(c.dueDate.slice(0, 10));
    setEditChargeCategory(c.category ?? '');
    setEditChargeRecurrence(c.recurrence ?? 'ONCE');
    setEditChargeOpen(true);
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
    if (deleteCharge.fulfilled.match(res)) toast.success('Cobrança excluída');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  // ── edit WA entry
  function openEditWa(e: FinancialEntry) {
    setEditWa(e);
    setEditWaDesc(e.descricao);
    setEditWaTipo(e.tipo);
    setEditWaValor(centsToInput(e.valorCents));
    setEditWaRecorrencia(e.recorrencia);
    setEditWaData(e.dataTransacao ? e.dataTransacao.slice(0, 10) : '');
    setEditWaPagador(e.pagadorNome ?? '');
    setEditWaOpen(true);
  }
  async function onEditWa(e: React.FormEvent) {
    e.preventDefault();
    if (!editWa) return;
    const res = await dispatch(updateFinancialEntry({
      id: editWa.id,
      descricao: editWaDesc,
      tipo: editWaTipo,
      valorCents: inputToCents(editWaValor),
      recorrencia: editWaRecorrencia,
      dataTransacao: editWaData || undefined,
      pagadorNome: editWaPagador || undefined,
    }));
    if (updateFinancialEntry.fulfilled.match(res)) { toast.success('Lançamento atualizado'); setEditWaOpen(false); }
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }
  async function onDeleteWa(e: FinancialEntry) {
    if (!window.confirm(`Excluir lançamento "${e.descricao}"?`)) return;
    const res = await dispatch(deleteFinancialEntry(e.id));
    if (deleteFinancialEntry.fulfilled.match(res)) toast.success('Lançamento excluído');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function onPay(id: string) {
    const res = await dispatch(payCharge(id));
    if (payCharge.fulfilled.match(res)) toast.success('Pagamento registrado');
  }
  async function onReminder(c: Charge) {
    const res = await dispatch(sendChargeWhatsappReminder(c.id));
    if (sendChargeWhatsappReminder.fulfilled.match(res)) toast.success('Lembrete enviado');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  return (
    <>
      <PageHeader
        title="Receitas & Lançamentos"
        description={`${charges.length} cobranças manuais · ${waEntries.length} via WhatsApp`}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova cobrança
          </Button>
        }
      />

      <div className="space-y-5 p-6">

        {/* ── SUMMARY CARDS ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Cobranças (total)" value={brl(summary.receitaManual)}
            sub={`${charges.length} registros`} color="#4f46e5" />
          <SummaryCard label="Cobranças pagas" value={brl(summary.pagas)}
            sub={`${charges.filter(c => c.status === 'PAID').length} pagas`} color="#10b981" />
          <SummaryCard label="Receitas WhatsApp" value={brl(summary.receitaWa)}
            sub={`${waEntries.filter(e => e.tipo === 'receita').length} entradas`} color="#22c55e" />
          <SummaryCard label="Gastos WhatsApp" value={brl(summary.gastoWa)}
            sub={`${waEntries.filter(e => e.tipo === 'gasto').length} saídas`} color="#f43f5e" />
        </div>

        {/* ── FILTERS ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por descrição, pagador ou cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={origemFilter} onValueChange={(v) => setOrigemFilter(v as 'ALL' | 'manual' | 'wa')}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas origens</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="wa">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos tipos</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="gasto">Gasto</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos status</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="PAID">Pago</SelectItem>
              <SelectItem value="OVERDUE">Vencida</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── TABLE ─────────────────────────────────────────────────────── */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col className="w-[110px]" />  {/* origem */}
                <col className="w-[160px]" />  {/* pagador */}
                <col />                         {/* descrição — flex */}
                <col className="w-[90px]" />   {/* tipo */}
                <col className="w-[96px]" />   {/* data */}
                <col className="w-[110px]" />  {/* valor */}
                <col className="w-[110px]" />  {/* status */}
                <col className="w-[130px]" />  {/* ações */}
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Origem</th>
                  <th className="px-4 py-3">Pagador</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row) => {
                  if (row.kind === 'manual') {
                    const c = row.data;
                    const nome = (c as { customer?: { name: string } }).customer?.name ?? '—';
                    return (
                      <tr key={`c-${c.id}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3"><OrigemBadge kind="manual" /></td>
                        <td className="px-4 py-3">
                          <p className="truncate font-medium text-gray-900" title={nome}>{nome}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="truncate text-gray-700" title={c.description}>{c.description}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={c.recurrence === 'MONTHLY' ? { background: '#ede9fe', color: '#7c3aed' } : { background: '#f3f4f6', color: '#374151' }}>
                            {c.recurrence === 'MONTHLY' ? 'Mensal' : 'Avulso'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(c.dueDate)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right font-bold"
                          style={{ color: c.status === 'PAID' ? '#059669' : '#111827' }}>
                          {brl(c.amountCents)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><ChargeStatus charge={c} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => dispatch(fetchPix(c.id))}>PIX</Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Lembrete" onClick={() => void onReminder(c)}>
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                            {c.status === 'PENDING' && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Dar baixa" onClick={() => void onPay(c.id)}>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCharge(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => void onDeleteCharge(c)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // WhatsApp entry
                  const e = row.data;
                  const pagador = e.pagadorNome ?? e.recebedorNome ?? '—';
                  return (
                    <tr key={`wa-${e.id}`} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3"><OrigemBadge kind="wa" /></td>
                      <td className="px-4 py-3">
                        <p className="truncate font-medium text-gray-900" title={pagador}>{pagador}</p>
                        {e.lead && (
                          <p className="truncate text-[11px]" style={{ color: '#0284c7' }} title={e.lead.name}>
                            Lead: {e.lead.name}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="truncate text-gray-700" title={e.descricao}>{e.descricao}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={e.tipo === 'receita'
                            ? { background: '#dcfce7', color: '#16a34a' }
                            : { background: '#fff1f2', color: '#e11d48' }}>
                          {e.tipo === 'receita' ? 'Receita' : 'Gasto'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{fmtDate(e.dataTransacao)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold"
                        style={{ color: e.tipo === 'receita' ? '#059669' : '#e11d48' }}>
                        {e.tipo === 'gasto' ? '−' : '+'}{brl(e.valorCents)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><WaStatus confianca={e.confianca} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditWa(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => void onDeleteWa(e)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                          <Wallet className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ── CREATE CHARGE DIALOG ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova cobrança manual</DialogTitle>
            <DialogDescription>Gera PIX e envia lembrete por WhatsApp.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreateCharge} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Recorrência</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONCE">Avulsa</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {customers.length === 0 && <p className="text-sm text-muted-foreground">Cadastre um cliente primeiro.</p>}
            <Button type="submit" className="w-full" disabled={customers.length === 0}>Criar cobrança</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT CHARGE DIALOG ───────────────────────────────────────────── */}
      <Dialog open={editChargeOpen} onOpenChange={setEditChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cobrança</DialogTitle>
            <DialogDescription>Atualize os dados da cobrança manual.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onEditCharge} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Input value={editChargeDesc} onChange={(e) => setEditChargeDesc(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={editChargeDue} onChange={(e) => setEditChargeDue(e.target.value)} required />
              </div>
              <div className="grid gap-1.5">
                <Label>Recorrência</Label>
                <Select value={editChargeRecurrence} onValueChange={setEditChargeRecurrence}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONCE">Avulsa</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Categoria</Label>
              <Input value={editChargeCategory} onChange={(e) => setEditChargeCategory(e.target.value)} />
            </div>
            <Button type="submit" className="w-full">Salvar alterações</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── EDIT WA ENTRY DIALOG ─────────────────────────────────────────── */}
      <Dialog open={editWaOpen} onOpenChange={setEditWaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar lançamento WhatsApp</DialogTitle>
            <DialogDescription>Corrija os dados extraídos do comprovante.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onEditWa} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Input value={editWaDesc} onChange={(e) => setEditWaDesc(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label>Pagador / Remetente</Label>
              <Input value={editWaPagador} onChange={(e) => setEditWaPagador(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" min="0.01" value={editWaValor} onChange={(e) => setEditWaValor(e.target.value)} required />
              </div>
              <div className="grid gap-1.5">
                <Label>Data da transação</Label>
                <Input type="date" value={editWaData} onChange={(e) => setEditWaData(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select value={editWaTipo} onValueChange={setEditWaTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="gasto">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Recorrência</Label>
                <Select value={editWaRecorrencia} onValueChange={setEditWaRecorrencia}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVULSO">Avulso</SelectItem>
                    <SelectItem value="MENSAL">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">Salvar alterações</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── PIX DIALOG ───────────────────────────────────────────────────── */}
      <Dialog open={!!pix} onOpenChange={(o) => { if (!o) dispatch(clearPix()); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PIX copia-e-cola</DialogTitle>
            <DialogDescription>Envie este código ao cliente para pagamento.</DialogDescription>
          </DialogHeader>
          <textarea readOnly value={pix?.code ?? ''}
            className="h-28 w-full rounded-md border bg-muted/40 p-2 font-mono text-xs" />
          <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(pix?.code ?? ''); toast.success('PIX copiado'); }}>
            <Copy className="h-4 w-4" />
            Copiar código
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
