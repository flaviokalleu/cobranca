'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createPayable,
  deletePayable,
  fetchPayables,
  payPayable,
  type Payable,
  updatePayable,
} from '@/store/financeSlice';
import { fetchSuppliers } from '@/store/catalogSlice';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const isOverdue = (p: { status: string; dueDate: string }) =>
  p.status === 'PENDING' && new Date(p.dueDate).getTime() < Date.now();
const centsToInput = (cents: number) => (cents / 100).toFixed(2);
const inputToCents = (value: string) => Math.round(Number(value || '0') * 100);

export default function ContasPagarPage() {
  const dispatch = useAppDispatch();
  const { payables } = useAppSelector((s) => s.finance);
  const { suppliers } = useAppSelector((s) => s.catalog);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [dueDate, setDueDate] = useState('');
  const [supplierId, setSupplierId] = useState('none');
  const [category, setCategory] = useState('');

  useEffect(() => {
    void dispatch(fetchPayables());
    void dispatch(fetchSuppliers());
  }, [dispatch]);

  function resetForm() {
    setEditingId(null);
    setDescription('');
    setAmount('0.00');
    setDueDate('');
    setSupplierId('none');
    setCategory('');
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(payable: Payable) {
    setEditingId(payable.id);
    setDescription(payable.description);
    setAmount(centsToInput(payable.amountCents));
    setDueDate(payable.dueDate.slice(0, 10));
    setSupplierId(payable.supplierId ?? 'none');
    setCategory(payable.category ?? '');
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      description,
      amountCents: inputToCents(amount),
      dueDate,
      supplierId: supplierId === 'none' ? null : supplierId,
      category: category || null,
    };
    const res = editingId
      ? await dispatch(updatePayable({ id: editingId, ...payload }))
      : await dispatch(
          createPayable({
            ...payload,
            supplierId: payload.supplierId ?? undefined,
            category: payload.category ?? undefined,
          }),
        );
    const ok = editingId
      ? updatePayable.fulfilled.match(res)
      : createPayable.fulfilled.match(res);
    if (ok) {
      toast.success(editingId ? 'Conta atualizada' : 'Conta a pagar criada');
      resetForm();
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onPay(id: string) {
    const res = await dispatch(payPayable(id));
    if (payPayable.fulfilled.match(res)) toast.success('Conta paga');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function onDelete(payable: Payable) {
    if (!window.confirm(`Excluir conta "${payable.description}"?`)) return;
    const res = await dispatch(deletePayable(payable.id));
    if (deletePayable.fulfilled.match(res)) toast.success('Conta cancelada');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  return (
    <>
      <PageHeader
        title="Contas a pagar"
        description={`${payables.length} no total`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova conta
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descricao</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[136px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payables.map((p) => {
                const pending = p.status === 'PENDING';
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.description}</TableCell>
                    <TableCell>{brl(p.amountCents)}</TableCell>
                    <TableCell>{fmtDate(p.dueDate)}</TableCell>
                    <TableCell>
                      {p.status === 'PAID' ? (
                        <Badge variant="success">Pago</Badge>
                      ) : isOverdue(p) ? (
                        <Badge variant="destructive">Vencida</Badge>
                      ) : p.status === 'CANCELED' ? (
                        <Badge variant="secondary">Cancelada</Badge>
                      ) : (
                        <Badge variant="warning">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Pagar"
                          disabled={!pending}
                          onClick={() => void onPay(p.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={pending ? 'Editar' : 'Somente pendentes'}
                          disabled={!pending}
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={pending ? 'Excluir' : 'Somente pendentes'}
                          disabled={!pending}
                          onClick={() => void onDelete(p)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {payables.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
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
            <DialogTitle>{editingId ? 'Editar conta a pagar' : 'Nova conta a pagar'}</DialogTitle>
            <DialogDescription>Alteracoes de valor ajustam o razao automaticamente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Descricao</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
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
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Categoria</Label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {editingId ? 'Salvar alteracoes' : 'Salvar conta'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
