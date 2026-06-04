'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  adjustStock,
  deleteStockMovement,
  fetchMovements,
  fetchProducts,
  type StockMovement,
  updateStockMovement,
} from '@/store/catalogSlice';
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
import { ArrowLeftRight, Pencil, Trash2 } from 'lucide-react';

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR');
const signedQty = (m: StockMovement) => (m.type === 'OUT' ? -m.qty : m.qty);

export default function EstoquePage() {
  const dispatch = useAppDispatch();
  const { movements, products } = useAppSelector((s) => s.catalog);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('Ajuste manual');

  useEffect(() => {
    void dispatch(fetchMovements());
    void dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    if (!productId && products[0]) setProductId(products[0].id);
  }, [products, productId]);

  const nameById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p.name])),
    [products],
  );

  function openCreate() {
    setEditingId(null);
    setProductId(products[0]?.id ?? '');
    setQty('1');
    setReason('Ajuste manual');
    setOpen(true);
  }

  function openEdit(movement: StockMovement) {
    setEditingId(movement.id);
    setProductId(movement.productId);
    setQty(String(signedQty(movement)));
    setReason(movement.reason);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(qty, 10);
    if (!n) {
      toast.error('Informe uma quantidade diferente de zero.');
      return;
    }
    const res = editingId
      ? await dispatch(updateStockMovement({ id: editingId, qty: n, reason }))
      : await dispatch(adjustStock({ productId, qty: n, reason }));
    const ok = editingId
      ? updateStockMovement.fulfilled.match(res)
      : adjustStock.fulfilled.match(res);
    if (ok) {
      toast.success(editingId ? 'Movimentacao atualizada' : 'Estoque ajustado');
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onDelete(movement: StockMovement) {
    if (!window.confirm('Excluir movimentacao de estoque?')) return;
    const res = await dispatch(deleteStockMovement(movement.id));
    if (deleteStockMovement.fulfilled.match(res)) {
      toast.success('Movimentacao excluida');
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  return (
    <>
      <PageHeader
        title="Movimentacoes de estoque"
        description={`${movements.length} registro(s)`}
        actions={
          <Button onClick={openCreate} disabled={products.length === 0}>
            <ArrowLeftRight className="h-4 w-4" />
            Ajustar estoque
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="w-[96px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((m) => {
                const manual = m.refType === 'ADJUST';
                return (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {fmtDateTime(m.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {nameById[m.productId] ?? m.productId}
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.type === 'OUT' ? 'destructive' : 'success'}>
                        {m.type === 'OUT' ? 'Saida' : 'Entrada'}
                      </Badge>
                    </TableCell>
                    <TableCell>{signedQty(m)}</TableCell>
                    <TableCell className="text-muted-foreground">{m.reason}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={manual ? 'Editar' : 'Edite a origem'}
                          disabled={!manual}
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={manual ? 'Excluir' : 'Exclua pela origem'}
                          disabled={!manual}
                          onClick={() => void onDelete(m)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {movements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    Nenhuma movimentacao ainda.
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
            <DialogTitle>
              {editingId ? 'Editar movimentacao' : 'Ajustar estoque'}
            </DialogTitle>
            <DialogDescription>Use positivo para entrada e negativo para saida.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Produto</Label>
              <Select value={productId} onValueChange={setProductId} disabled={!!editingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.stockQty} {p.unit})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Quantidade (+/-)</Label>
                <Input
                  type="number"
                  step="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Motivo</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {editingId ? 'Salvar alteracoes' : 'Aplicar ajuste'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
