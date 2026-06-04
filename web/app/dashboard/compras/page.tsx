'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createPurchase,
  deletePurchase,
  fetchPurchases,
  receivePurchase,
  type PurchaseOrder,
  updatePurchase,
} from '@/store/purchaseSlice';
import { fetchProducts, fetchSuppliers } from '@/store/catalogSlice';
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
const inputToCents = (value: string) => Math.round(Number(value || '0') * 100);

interface Line {
  productId: string;
  qty: number;
  unitCostCents: number;
}

export default function ComprasPage() {
  const dispatch = useAppDispatch();
  const { orders } = useAppSelector((s) => s.purchases);
  const { products, suppliers } = useAppSelector((s) => s.catalog);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [lineProduct, setLineProduct] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [lineCost, setLineCost] = useState('0.00');
  const [items, setItems] = useState<Line[]>([]);

  useEffect(() => {
    void dispatch(fetchPurchases());
    void dispatch(fetchProducts());
    void dispatch(fetchSuppliers());
  }, [dispatch]);

  useEffect(() => {
    if (!supplierId && suppliers[0]) setSupplierId(suppliers[0].id);
  }, [suppliers, supplierId]);
  useEffect(() => {
    if (!lineProduct && products[0]) setLineProduct(products[0].id);
  }, [products, lineProduct]);

  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );
  const supplierById = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.name])),
    [suppliers],
  );

  useEffect(() => {
    const product = productById[lineProduct];
    if (product) setLineCost((product.costCents / 100).toFixed(2));
  }, [lineProduct, productById]);

  const itemsTotal = items.reduce((sum, item) => sum + item.unitCostCents * item.qty, 0);

  function resetForm() {
    setEditingId(null);
    setSupplierId(suppliers[0]?.id ?? '');
    setLineProduct(products[0]?.id ?? '');
    setLineQty('1');
    setLineCost(products[0] ? (products[0].costCents / 100).toFixed(2) : '0.00');
    setItems([]);
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(order: PurchaseOrder) {
    setEditingId(order.id);
    setSupplierId(order.supplierId);
    setItems(
      order.items?.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        unitCostCents: item.unitCostCents,
      })) ?? [],
    );
    setLineProduct(products[0]?.id ?? '');
    setLineQty('1');
    setLineCost(products[0] ? (products[0].costCents / 100).toFixed(2) : '0.00');
    setOpen(true);
  }

  function addItem() {
    const qty = parseInt(lineQty, 10);
    const unitCostCents = inputToCents(lineCost);
    if (!lineProduct || !qty) return;
    setItems((prev) => [...prev, { productId: lineProduct, qty, unitCostCents }]);
    setLineQty('1');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error('Adicione ao menos um item.');
      return;
    }
    const res = editingId
      ? await dispatch(updatePurchase({ id: editingId, supplierId, items }))
      : await dispatch(createPurchase({ supplierId, items }));
    const ok = editingId
      ? updatePurchase.fulfilled.match(res)
      : createPurchase.fulfilled.match(res);
    if (ok) {
      toast.success(editingId ? 'Pedido atualizado' : 'Pedido de compra criado');
      resetForm();
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onReceive(id: string) {
    const res = await dispatch(receivePurchase(id));
    if (receivePurchase.fulfilled.match(res)) toast.success('Compra recebida');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function onDelete(order: PurchaseOrder) {
    if (!window.confirm(`Excluir pedido de compra #${order.number}?`)) return;
    const res = await dispatch(deletePurchase(order.id));
    if (deletePurchase.fulfilled.match(res)) toast.success('Pedido excluido');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  return (
    <>
      <PageHeader
        title="Pedidos de compra"
        description={`${orders.length} pedido(s)`}
        actions={
          <Button onClick={openCreate} disabled={products.length === 0 || suppliers.length === 0}>
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
                <TableHead>Fornecedor</TableHead>
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
                    <TableCell>{supplierById[o.supplierId] ?? '-'}</TableCell>
                    <TableCell>{brl(o.totalCents)}</TableCell>
                    <TableCell>
                      {o.status === 'RECEIVED' ? (
                        <Badge variant="success">Recebido</Badge>
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
                          title="Receber"
                          disabled={!draft}
                          onClick={() => void onReceive(o.id)}
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
            <DialogTitle>{editingId ? 'Editar pedido de compra' : 'Novo pedido de compra'}</DialogTitle>
            <DialogDescription>Ao receber, da entrada no estoque e gera conta a pagar.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Fornecedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
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
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="number"
                  min="1"
                  className="w-16"
                  value={lineQty}
                  onChange={(e) => setLineQty(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-24"
                  value={lineCost}
                  onChange={(e) => setLineCost(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={addItem}>
                  +
                </Button>
              </div>

              <ul className="mt-3 space-y-1">
                {items.map((it, idx) => {
                  const product = productById[it.productId];
                  return (
                    <li key={`${it.productId}-${idx}`} className="flex items-center justify-between text-sm">
                      <span>
                        {product?.name} x {it.qty} x {brl(it.unitCostCents)} ={' '}
                        {brl(it.unitCostCents * it.qty)}
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
