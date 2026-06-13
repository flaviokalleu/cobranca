'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSuppliers } from '@/store/catalogSlice';
import {
  createPayable,
  deletePayable,
  fetchPayables,
  payPayable,
  type Payable,
  updatePayable,
} from '@/store/financeSlice';
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
import { Check, Pencil, Plus, Trash2, Settings2 } from 'lucide-react';
import { fetchCategories } from '@/store/categoriesSlice';
import { CategoryManager } from '@/components/category-manager';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const centsToInput = (cents: number) => (cents / 100).toFixed(2);
const inputToCents = (value: string) => Math.round(Number(value || '0') * 100);
const recurrenceLabel = (recurrence?: string | null) =>
  recurrence === 'MONTHLY' ? 'Mensal' : 'Avulsa';
const isOverdue = (payable: { status: string; dueDate: string }) =>
  payable.status === 'PENDING' && new Date(payable.dueDate).getTime() < Date.now();

function StatusBadge({ payable }: { payable: Payable }) {
  if (payable.status === 'PAID') return <Badge variant="success">Pago</Badge>;
  if (isOverdue(payable)) return <Badge variant="destructive">Vencida</Badge>;
  if (payable.status === 'CANCELED') return <Badge variant="secondary">Cancelada</Badge>;
  return <Badge variant="warning">Pendente</Badge>;
}

export default function ContasPagarPage() {
  const dispatch = useAppDispatch();
  const { payables } = useAppSelector((state) => state.finance);
  const { suppliers } = useAppSelector((state) => state.catalog);
  const { items: allCategories, seeded } = useAppSelector((s) => s.categories);
  const expenseCategories = allCategories.filter((c) => c.type === 'EXPENSE');

  const [open, setOpen] = useState(false);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState('PENDING');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [dueDate, setDueDate] = useState('');
  const [supplierId, setSupplierId] = useState('none');
  const [category, setCategory] = useState('');
  const [recurrence, setRecurrence] = useState('ONCE');

  useEffect(() => {
    void dispatch(fetchPayables());
    void dispatch(fetchSuppliers());
  }, [dispatch]);

  useEffect(() => {
    if (!seeded) void dispatch(fetchCategories());
  }, [dispatch, seeded]);

  const lockedFinancialFields = editingId !== null && editingStatus !== 'PENDING';

  function resetForm() {
    setEditingId(null);
    setEditingStatus('PENDING');
    setDescription('');
    setAmount('0.00');
    setDueDate('');
    setSupplierId('none');
    setCategory('');
    setRecurrence('ONCE');
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(payable: Payable) {
    setEditingId(payable.id);
    setEditingStatus(payable.status);
    setDescription(payable.description);
    setAmount(centsToInput(payable.amountCents));
    setDueDate(payable.dueDate.slice(0, 10));
    setSupplierId(payable.supplierId ?? 'none');
    setCategory(payable.category ?? '');
    setRecurrence(payable.recurrence ?? 'ONCE');
    setOpen(true);
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const supplier = supplierId === 'none' ? null : supplierId;
    const basePayload = {
      description,
      supplierId: supplier,
      category: category || null,
      recurrence,
    };

    const res = editingId
      ? await dispatch(
          updatePayable(
            lockedFinancialFields
              ? { id: editingId, ...basePayload }
              : {
                  id: editingId,
                  ...basePayload,
                  amountCents: inputToCents(amount),
                  dueDate,
                },
          ),
        )
      : await dispatch(
          createPayable({
            description,
            amountCents: inputToCents(amount),
            dueDate,
            supplierId: supplier ?? undefined,
            category: category || undefined,
            recurrence,
          }),
        );
    const ok = editingId
      ? updatePayable.fulfilled.match(res)
      : createPayable.fulfilled.match(res);
    if (ok) {
      toast.success(editingId ? 'Despesa atualizada' : 'Despesa criada');
      resetForm();
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onPay(id: string) {
    const res = await dispatch(payPayable(id));
    if (payPayable.fulfilled.match(res)) toast.success('Despesa paga');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function onDelete(payable: Payable) {
    if (!window.confirm(`Excluir despesa "${payable.description}"?`)) return;
    const res = await dispatch(deletePayable(payable.id));
    if (deletePayable.fulfilled.match(res)) toast.success('Despesa excluida');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  return (
    <>
      <PageHeader
        title="Despesas"
        description={`${payables.length} ao todo`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova despesa
          </Button>
        }
      />
      <div className="p-4 md:p-6">
        {/* Mobile: cards */}
        <div className="space-y-3 md:hidden">
          {payables.map((payable) => (
            <div key={payable.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{payable.description}</p>
                  {payable.category && (
                    <p className="flex items-center gap-1 text-xs text-gray-400">
                      <span className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ background: expenseCategories.find(c => c.name === payable.category)?.color ?? '#9ca3af' }} />
                      {payable.category}
                    </p>
                  )}
                </div>
                <StatusBadge payable={payable} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">{brl(payable.amountCents)}</span>
                <span className="text-xs text-gray-400">Vence: {fmtDate(payable.dueDate)}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">{recurrenceLabel(payable.recurrence)}</p>
              <div className="mt-3 flex gap-2 border-t pt-3">
                <Button variant="outline" size="sm" className="flex-1" disabled={payable.status !== 'PENDING'} onClick={() => void onPay(payable.id)}>
                  <Check className="mr-1 h-3.5 w-3.5" /> Pagar
                </Button>
                <Button variant="outline" size="sm" onClick={() => openEdit(payable)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => void onDelete(payable)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {payables.length === 0 && (
            <div className="rounded-xl border bg-white py-12 text-center text-sm text-muted-foreground">
              Nenhuma conta a pagar.
            </div>
          )}
        </div>

        {/* Desktop: tabela */}
        <Card className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
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
              {payables.map((payable) => (
                <TableRow key={payable.id}>
                  <TableCell className="font-medium">{payable.description}</TableCell>
                  <TableCell>
                    {payable.category ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ background: expenseCategories.find(c => c.name === payable.category)?.color ?? '#9ca3af' }} />
                        {payable.category}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{recurrenceLabel(payable.recurrence)}</TableCell>
                  <TableCell>{brl(payable.amountCents)}</TableCell>
                  <TableCell>{fmtDate(payable.dueDate)}</TableCell>
                  <TableCell><StatusBadge payable={payable} /></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Pagar" disabled={payable.status !== 'PENDING'} onClick={() => void onPay(payable.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(payable)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Excluir" className="text-destructive" onClick={() => void onDelete(payable)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {payables.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    Nenhuma conta a pagar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar despesa' : 'Nova despesa'}</DialogTitle>
            <DialogDescription>Saida do fluxo de caixa com categoria e recorrencia.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Descricao</Label>
              <Input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  disabled={lockedFinancialFields}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={dueDate}
                  disabled={lockedFinancialFields}
                  onChange={(event) => setDueDate(event.target.value)}
                  required={!lockedFinancialFields}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Fornecedor</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem fornecedor</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label>Categoria</Label>
                  <button type="button" onClick={() => setCatManagerOpen(true)}
                    className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-700">
                    <Settings2 className="h-3 w-3" />Gerenciar
                  </button>
                </div>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem categoria</SelectItem>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            <Button type="submit" className="w-full">
              {editingId ? 'Salvar alteracoes' : 'Salvar conta'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <CategoryManager open={catManagerOpen} onClose={() => setCatManagerOpen(false)} type="EXPENSE" />
    </>
  );
}

