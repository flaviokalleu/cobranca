'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  confirmSale,
  createSale,
  deleteSale,
  fetchSales,
  type SalesOrder,
  updateSale,
} from '@/store/salesSlice';
import { fetchProducts } from '@/store/catalogSlice';
import { fetchCustomers } from '@/store/dataSlice';
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
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Line {
  productId: string;
  qty: number;
}

export default function VendasPage() {
  const dispatch = useAppDispatch();
  const { orders } = useAppSelector((s) => s.sales);
  const { products } = useAppSelector((s) => s.catalog);
  const { customers } = useAppSelector((s) => s.data);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [lineProduct, setLineProduct] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [items, setItems] = useState<Line[]>([]);

  useEffect(() => {
    void dispatch(fetchSales());
    void dispatch(fetchProducts());
    void dispatch(fetchCustomers());
  }, [dispatch]);

  useEffect(() => {
    if (!customerId && customers[0]) setCustomerId(customers[0].id);
  }, [customers, customerId]);
  useEffect(() => {
    if (!lineProduct && products[0]) setLineProduct(products[0].id);
  }, [products, lineProduct]);

  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );
  const customerById = useMemo(
    () => Object.fromEntries(customers.map((c) => [c.id, c.name])),
    [customers],
  );
  const itemsTotal = items.reduce(
    (sum, item) => sum + (productById[item.productId]?.priceCents ?? 0) * item.qty,
    0,
  );

  function resetForm() {
    setEditingId(null);
    setCustomerId(customers[0]?.id ?? '');
    setLineProduct(products[0]?.id ?? '');
    setLineQty('1');
    setItems([]);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(order: SalesOrder) {
    setEditingId(order.id);
    setCustomerId(order.customerId);
    setItems(order.items?.map((item) => ({ productId: item.productId, qty: item.qty })) ?? []);
    setLineProduct(products[0]?.id ?? '');
    setLineQty('1');
    setOpen(true);
  }

  function addItem() {
    const qty = parseInt(lineQty, 10);
    if (!lineProduct || !qty) return;
    setItems((prev) => [...prev, { productId: lineProduct, qty }]);
    setLineQty('1');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Adicione ao menos um item.');
      return;
    }
    const res = editingId
      ? await dispatch(updateSale({ id: editingId, customerId, items }))
      : await dispatch(createSale({ customerId, items }));
    const ok = editingId ? updateSale.fulfilled.match(res) : createSale.fulfilled.match(res);
    if (ok) {
      toast.success(editingId ? 'Pedido atualizado' : 'Pedido criado');
      resetForm();
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onConfirm(id: string) {
    const res = await dispatch(confirmSale(id));
    if (confirmSale.fulfilled.match(res)) toast.success('Pedido confirmado');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function onDelete(order: SalesOrder) {
    if (!window.confirm(`Excluir pedido #${order.number}?`)) return;
    const res = await dispatch(deleteSale(order.id));
    if (deleteSale.fulfilled.match(res)) toast.success('Pedido excluido');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  return (
    <>
      <PageHeader
        title="Pedidos de venda"
        description={`${orders.length} pedido(s)`}
        actions={
          <Button onClick={openCreate} disabled={products.length === 0 || customers.length === 0}>
            <Plus className="h-4 w-4" />
            Novo pedido
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[136px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const draft = o.status === 'DRAFT';
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">#{o.number}</TableCell>
                    <TableCell>{customerById[o.customerId] ?? '-'}</TableCell>
                    <TableCell>{brl(o.totalCents)}</TableCell>
                    <TableCell>
                      {o.status === 'CONFIRMED' ? (
                        <Badge variant="success">Confirmado</Badge>
                      ) : o.status === 'CANCELED' ? (
                        <Badge variant="destructive">Cancelado</Badge>
                      ) : (
                        <Badge variant="warning">Rascunho</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Confirmar"
                          disabled={!draft}
                          onClick={() => void onConfirm(o.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={draft ? 'Editar' : 'Somente rascunhos'}
                          disabled={!draft}
                          onClick={() => openEdit(o)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={draft ? 'Excluir' : 'Somente rascunhos'}
                          disabled={!draft}
                          onClick={() => void onDelete(o)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    Nenhum pedido ainda.
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
            <DialogTitle>{editingId ? 'Editar pedido de venda' : 'Novo pedido de venda'}</DialogTitle>
            <DialogDescription>Ao confirmar, baixa o estoque e gera uma cobranca.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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

            <div className="rounded-lg border p-3">
              <Label className="mb-2 block">Itens</Label>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select value={lineProduct} onValueChange={setLineProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} - {brl(p.priceCents)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  min="1"
                  className="w-20"
                  value={lineQty}
                  onChange={(e) => setLineQty(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={addItem}>
                  Adicionar
                </Button>
              </div>

              <ul className="mt-3 space-y-1">
                {items.map((it, idx) => {
                  const product = productById[it.productId];
                  return (
                    <li key={`${it.productId}-${idx}`} className="flex items-center justify-between text-sm">
                      <span>
                        {product?.name} x {it.qty} = {brl((product?.priceCents ?? 0) * it.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
                {items.length === 0 && (
                  <li className="text-sm text-muted-foreground">Nenhum item adicionado.</li>
                )}
              </ul>
              <div className="mt-3 flex justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{brl(itemsTotal)}</span>
              </div>
            </div>

            <Button type="submit" className="w-full">
              {editingId ? 'Salvar alteracoes' : 'Criar pedido'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
