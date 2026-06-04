'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPayables, createPayable, payPayable } from '@/store/financeSlice';
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
import { Plus } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const isOverdue = (p: { status: string; dueDate: string }) =>
  p.status === 'PENDING' && new Date(p.dueDate).getTime() < Date.now();

export default function ContasPagarPage() {
  const dispatch = useAppDispatch();
  const { payables } = useAppSelector((s) => s.finance);
  const { suppliers } = useAppSelector((s) => s.catalog);

  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [dueDate, setDueDate] = useState('');
  const [supplierId, setSupplierId] = useState('none');

  useEffect(() => {
    void dispatch(fetchPayables());
    void dispatch(fetchSuppliers());
  }, [dispatch]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(
      createPayable({
        description,
        amountCents: Math.round(parseFloat(amount) * 100),
        dueDate,
        supplierId: supplierId === 'none' ? undefined : supplierId,
      }),
    );
    if (createPayable.fulfilled.match(res)) {
      toast.success('Conta a pagar criada');
      setDescription('');
      setAmount('0.00');
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

  return (
    <>
      <PageHeader
        title="Contas a pagar"
        description={`${payables.length} no total`}
        actions={
          <Button onClick={() => setOpen(true)}>
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
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payables.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.description}</TableCell>
                  <TableCell>{brl(p.amountCents)}</TableCell>
                  <TableCell>{fmtDate(p.dueDate)}</TableCell>
                  <TableCell>
                    {p.status === 'PAID' ? (
                      <Badge variant="success">Pago</Badge>
                    ) : isOverdue(p) ? (
                      <Badge variant="destructive">Vencida</Badge>
                    ) : (
                      <Badge variant="warning">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === 'PENDING' && (
                      <Button size="sm" onClick={() => onPay(p.id)}>
                        Pagar
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
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
            <DialogTitle>Nova conta a pagar</DialogTitle>
            <DialogDescription>Gera despesa no razão (partida dobrada).</DialogDescription>
          </DialogHeader>
          <form onSubmit={onAdd} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
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
            <div className="grid gap-1.5">
              <Label>Fornecedor (opcional)</Label>
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
            <Button type="submit" className="w-full">
              Salvar conta
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
