'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createCharge,
  payCharge,
  fetchPix,
  clearPix,
  updateCharge,
  deleteCharge,
} from '@/store/dataSlice';
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
import { Plus, Copy, Search, Pencil, Trash2 } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const isOverdue = (c: { status: string; dueDate: string }) =>
  c.status === 'PENDING' && new Date(c.dueDate).getTime() < Date.now();

export default function CobrancasPage() {
  const dispatch = useAppDispatch();
  const { customers, charges, pix } = useAppSelector((s) => s.data);

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [reais, setReais] = useState('49.90');
  const [desc, setDesc] = useState('Mensalidade');
  const [due, setDue] = useState('');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editDue, setEditDue] = useState('');

  useEffect(() => {
    if (!customerId && customers[0]) setCustomerId(customers[0].id);
  }, [customers, customerId]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return charges.filter((c) => {
      const matchQuery = c.description.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'OVERDUE'
            ? isOverdue(c)
            : c.status === statusFilter;
      return matchQuery && matchStatus;
    });
  }, [charges, query, statusFilter]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = Math.round(parseFloat(reais) * 100);
    const res = await dispatch(
      createCharge({ customerId, amountCents, description: desc, dueDate: due }),
    );
    if (createCharge.fulfilled.match(res)) {
      toast.success('Cobrança criada');
      setOpen(false);
    }
  }

  async function onPay(id: string) {
    const res = await dispatch(payCharge(id));
    if (payCharge.fulfilled.match(res)) toast.success('Pagamento registrado');
  }

  function openEdit(c: { id: string; description: string; dueDate: string }) {
    setEditId(c.id);
    setEditDesc(c.description);
    setEditDue(c.dueDate.slice(0, 10));
    setEditOpen(true);
  }

  async function onEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    const res = await dispatch(
      updateCharge({ id: editId, description: editDesc, dueDate: editDue || undefined }),
    );
    if (updateCharge.fulfilled.match(res)) {
      toast.success('Cobrança atualizada');
      setEditOpen(false);
    } else {
      const p = (res as { payload?: unknown }).payload;
      toast.error(typeof p === 'string' ? p : 'Erro');
    }
  }

  async function onDelete(c: { id: string; description: string }) {
    if (!window.confirm(`Excluir a cobrança "${c.description}"?`)) return;
    const res = await dispatch(deleteCharge(c.id));
    if (deleteCharge.fulfilled.match(res)) toast.success('Cobrança excluída');
    else {
      const p = (res as { payload?: unknown }).payload;
      toast.error(typeof p === 'string' ? p : 'Erro');
    }
  }

  return (
    <>
      <PageHeader
        title="Cobranças"
        description={`${charges.length} no total`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova cobrança
          </Button>
        }
      />

      <div className="p-6">
        {/* Barra de busca + filtro */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por descrição..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.description}</TableCell>
                  <TableCell>{brl(c.amountCents)}</TableCell>
                  <TableCell>{fmtDate(c.dueDate)}</TableCell>
                  <TableCell>
                    {c.status === 'PAID' ? (
                      <Badge variant="success">Pago</Badge>
                    ) : isOverdue(c) ? (
                      <Badge variant="destructive">Vencida</Badge>
                    ) : (
                      <Badge variant="warning">Pendente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => dispatch(fetchPix(c.id))}
                      >
                        PIX
                      </Button>
                      {c.status === 'PENDING' && (
                        <Button size="sm" onClick={() => onPay(c.id)}>
                          Dar baixa
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        className="text-destructive"
                        onClick={() => onDelete(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    {charges.length === 0
                      ? 'Nenhuma cobrança ainda. Clique em “Nova cobrança”.'
                      : 'Nenhuma cobrança encontrada com esse filtro.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Nova cobrança */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova cobrança</DialogTitle>
            <DialogDescription>Gera lançamento no caixa e lembrete com PIX.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onAdd} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
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
                  value={reais}
                  onChange={(e) => setReais(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Vencimento</Label>
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} required />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            {customers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Cadastre um cliente antes de criar uma cobrança.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={customers.length === 0}>
              Criar cobrança
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Editar cobrança */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cobrança</DialogTitle>
            <DialogDescription>Edite descrição e vencimento (o valor não muda).</DialogDescription>
          </DialogHeader>
          <form onSubmit={onEditSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label>Vencimento</Label>
              <Input type="date" value={editDue} onChange={(e) => setEditDue(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full">
              Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* PIX */}
      <Dialog open={!!pix} onOpenChange={(o) => { if (!o) dispatch(clearPix()); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>PIX copia-e-cola</DialogTitle>
            <DialogDescription>Envie este código ao cliente para pagamento.</DialogDescription>
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
            Copiar código
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
