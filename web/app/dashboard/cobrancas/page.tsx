'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  clearPix,
  createCharge,
  deleteCharge,
  fetchPix,
  payCharge,
  sendChargeWhatsappReminder,
  updateCharge,
  type Charge,
} from '@/store/dataSlice';
import { fetchFinancialEntries } from '@/store/financialEntriesSlice';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, MessageCircle, Pencil, Plus, Search, Trash2 } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const inputToCents = (value: string) => Math.round(Number(value || '0') * 100);
const isOverdue = (charge: { status: string; dueDate: string }) =>
  charge.status === 'PENDING' && new Date(charge.dueDate).getTime() < Date.now();
const recurrenceLabel = (recurrence?: string | null) =>
  recurrence === 'MONTHLY' ? 'Mensal' : 'Avulsa';

function StatusBadge({ charge }: { charge: Charge }) {
  if (charge.status === 'PAID') return <Badge variant="success">Pago</Badge>;
  if (isOverdue(charge)) return <Badge variant="destructive">Vencida</Badge>;
  if (charge.status === 'CANCELED') return <Badge variant="secondary">Cancelada</Badge>;
  return <Badge variant="warning">Pendente</Badge>;
}

export default function CobrancasPage() {
  const dispatch = useAppDispatch();
  const { customers, charges, pix } = useAppSelector((state) => state.data);
  const { entries: whatsappEntries } = useAppSelector((state) => state.financialEntries);
  const whatsappReceitas = whatsappEntries.filter((e) => e.tipo === 'receita');

  const [tab, setTab] = useState<'manual' | 'whatsapp'>('manual');
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('49.90');
  const [description, setDescription] = useState('Mensalidade');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [recurrence, setRecurrence] = useState('ONCE');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editRecurrence, setEditRecurrence] = useState('ONCE');

  useEffect(() => {
    void dispatch(fetchFinancialEntries());
  }, [dispatch]);

  useEffect(() => {
    if (!customerId && customers[0]) setCustomerId(customers[0].id);
  }, [customers, customerId]);

  const filtered = useMemo(() => {
    const text = query.toLowerCase();
    return charges.filter((charge) => {
      const matchQuery =
        charge.description.toLowerCase().includes(text) ||
        (charge.category ?? '').toLowerCase().includes(text);
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'OVERDUE'
            ? isOverdue(charge)
            : charge.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [charges, query, statusFilter]);

  function resetCreateForm() {
    setAmount('49.90');
    setDescription('Mensalidade');
    setDueDate('');
    setCategory('');
    setRecurrence('ONCE');
  }

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    const res = await dispatch(
      createCharge({
        customerId,
        amountCents: inputToCents(amount),
        description,
        dueDate,
        category: category || undefined,
        recurrence,
      }),
    );
    if (createCharge.fulfilled.match(res)) {
      toast.success('Receita criada');
      resetCreateForm();
      setOpen(false);
    }
  }

  async function onPay(id: string) {
    const res = await dispatch(payCharge(id));
    if (payCharge.fulfilled.match(res)) toast.success('Pagamento registrado');
  }

  async function onSendReminder(charge: Charge) {
    const res = await dispatch(sendChargeWhatsappReminder(charge.id));
    if (sendChargeWhatsappReminder.fulfilled.match(res)) {
      toast.success('Lembrete enviado para a fila do WhatsApp');
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  function openEdit(charge: Charge) {
    setEditId(charge.id);
    setEditDescription(charge.description);
    setEditDueDate(charge.dueDate.slice(0, 10));
    setEditCategory(charge.category ?? '');
    setEditRecurrence(charge.recurrence ?? 'ONCE');
    setEditOpen(true);
  }

  async function onEditSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!editId) return;
    const res = await dispatch(
      updateCharge({
        id: editId,
        description: editDescription,
        dueDate: editDueDate || undefined,
        category: editCategory || null,
        recurrence: editRecurrence,
      }),
    );
    if (updateCharge.fulfilled.match(res)) {
      toast.success('Receita atualizada');
      setEditOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onDelete(charge: Charge) {
    if (!window.confirm(`Excluir a receita "${charge.description}"?`)) return;
    const res = await dispatch(deleteCharge(charge.id));
    if (deleteCharge.fulfilled.match(res)) toast.success('Receita excluida');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  return (
    <>
      <PageHeader
        title="Receita"
        description={`${charges.length + whatsappReceitas.length} no total`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova receita
          </Button>
        }
      />

      <div className="p-6">
        {/* Abas */}
        <div className="mb-4 flex gap-1 rounded-xl border bg-muted/40 p-1" style={{ width: 'fit-content' }}>
          {(['manual', 'whatsapp'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
              style={tab === t
                ? { background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', color: '#111' }
                : { color: '#6b7280' }}
            >
              {t === 'manual' ? `Manual (${charges.length})` : `WhatsApp (${whatsappReceitas.length})`}
            </button>
          ))}
        </div>

        {/* Tabela WhatsApp */}
        {tab === 'whatsapp' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pagador</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Confianca</TableHead>
                  <TableHead>Lead</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whatsappReceitas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.pagadorNome ?? '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{e.descricao}</TableCell>
                    <TableCell>
                      <Badge variant={e.recorrencia === 'MENSAL' ? 'default' : 'secondary'}>
                        {e.recorrencia === 'MENSAL' ? 'Mensal' : 'Avulso'}
                      </Badge>
                    </TableCell>
                    <TableCell>{(e.valorCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                    <TableCell>{e.dataTransacao ? new Date(e.dataTransacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}</TableCell>
                    <TableCell>
                      <Badge variant={e.confianca === 'alta' ? 'success' : e.confianca === 'media' ? 'warning' : 'destructive'}>
                        {e.confianca}
                      </Badge>
                    </TableCell>
                    <TableCell>{e.lead?.name ?? '-'}</TableCell>
                  </TableRow>
                ))}
                {whatsappReceitas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      Nenhuma receita via WhatsApp ainda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Tabela Manual — só exibe quando aba = manual */}
        {tab === 'manual' && <><div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por descricao ou categoria..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="PENDING">Pendentes</SelectItem>
              <SelectItem value="OVERDUE">Vencidas</SelectItem>
              <SelectItem value="PAID">Pagas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pagador</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((charge) => (
                <TableRow key={charge.id}>
                  <TableCell className="font-medium">{charge.customer?.name ?? '-'}</TableCell>
                  <TableCell>{charge.description}</TableCell>
                  <TableCell>{charge.category ?? '-'}</TableCell>
                  <TableCell>{recurrenceLabel(charge.recurrence)}</TableCell>
                  <TableCell>{brl(charge.amountCents)}</TableCell>
                  <TableCell>{fmtDate(charge.dueDate)}</TableCell>
                  <TableCell>
                    <StatusBadge charge={charge} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dispatch(fetchPix(charge.id))}
                      >
                        PIX
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Enviar lembrete no WhatsApp"
                        onClick={() => void onSendReminder(charge)}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      {charge.status === 'PENDING' && (
                        <Button size="sm" onClick={() => void onPay(charge.id)}>
                          Dar baixa
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => openEdit(charge)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        className="text-destructive"
                        onClick={() => void onDelete(charge)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                    {charges.length === 0
                      ? 'Nenhuma receita ainda. Clique em "Nova receita".'
                      : 'Nenhuma receita encontrada com esse filtro.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
        </>}

      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova receita</DialogTitle>
            <DialogDescription>Entrada do fluxo de caixa com PIX e lembrete.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onAdd} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Descricao</Label>
              <Input value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Input value={category} onChange={(event) => setCategory(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONCE">Avulsa</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {customers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Cadastre um cliente antes de criar uma cobranca.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={customers.length === 0}>
              Criar cobranca
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar receita</DialogTitle>
            <DialogDescription>Atualize os dados exibidos no fluxo de caixa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onEditSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Descricao</Label>
              <Input
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Vencimento</Label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(event) => setEditDueDate(event.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Input
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select value={editRecurrence} onValueChange={setEditRecurrence}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ONCE">Avulsa</SelectItem>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!pix}
        onOpenChange={(dialogOpen) => {
          if (!dialogOpen) dispatch(clearPix());
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PIX copia-e-cola</DialogTitle>
            <DialogDescription>Envie este codigo ao cliente para pagamento.</DialogDescription>
          </DialogHeader>
          <textarea
            readOnly
            value={pix?.code ?? ''}
            className="h-28 w-full rounded-md border bg-muted/40 p-2 font-mono text-xs"
          />
          <Button
            variant="secondary"
            onClick={() => {
              navigator.clipboard?.writeText(pix?.code ?? '');
              toast.success('PIX copiado');
            }}
          >
            <Copy className="h-4 w-4" />
            Copiar codigo
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
