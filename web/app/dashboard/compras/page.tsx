'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createPurchase,
  deletePurchase,
  fetchPurchases,
  receivePurchase,
  type PurchaseOrder,
} from '@/store/purchaseSlice';
import { fetchProducts, fetchSuppliers } from '@/store/catalogSlice';
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
import { PackageCheck, Plus, Trash2 } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const centsToInput = (c: number) => (c / 100).toFixed(2);
const inputToCents = (v: string) => Math.round(Number(v || '0') * 100);
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

function StatusBadge({ status }: { status: string }) {
  if (status === 'RECEIVED') return <Badge variant="success">Recebido</Badge>;
  if (status === 'CANCELED') return <Badge variant="secondary">Cancelado</Badge>;
  return <Badge variant="warning">Pendente</Badge>;
}

interface ItemLine {
  productId: string;
  qty: number;
  unitCostCents: number;
}

export default function ComprasPage() {
  const dispatch = useAppDispatch();
  const { orders } = useAppSelector((s) => s.purchases);
  const { products, suppliers } = useAppSelector((s) => s.catalog);

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<ItemLine[]>([{ productId: '', qty: 1, unitCostCents: 0 }]);

  useEffect(() => {
    void dispatch(fetchPurchases());
    void dispatch(fetchProducts());
    void dispatch(fetchSuppliers());
  }, [dispatch]);

  function openNew() {
    setSupplierId(suppliers[0]?.id ?? '');
    setItems([{ productId: products[0]?.id ?? '', qty: 1, unitCostCents: products[0]?.costCents ?? 0 }]);
    setOpen(true);
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: products[0]?.id ?? '', qty: 1, unitCostCents: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof ItemLine, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === 'productId' ? value : inputToCents(String(value)),
            }
          : item,
      ),
    );
  }

  function handleProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, productId, unitCostCents: product?.costCents ?? 0 }
          : item,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items
      .filter((i) => i.productId && i.qty > 0)
      .map(({ productId, qty, unitCostCents }) => ({ productId, qty, unitCostCents }));
    if (!validItems.length) { toast.error('Adicione pelo menos um item.'); return; }
    const res = await dispatch(createPurchase({ supplierId: supplierId || undefined as never, items: validItems }));
    if (createPurchase.fulfilled.match(res)) {
      toast.success('Pedido de compra criado.');
      setOpen(false);
    } else {
      toast.error('Erro ao criar pedido de compra.');
    }
  }

  async function handleReceive(id: string) {
    if (!confirm('Marcar este pedido como recebido? O estoque será atualizado.')) return;
    const res = await dispatch(receivePurchase(id));
    if (receivePurchase.fulfilled.match(res)) toast.success('Pedido recebido! Estoque atualizado.');
    else toast.error('Erro ao receber pedido.');
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este pedido de compra?')) return;
    const res = await dispatch(deletePurchase(id));
    if (deletePurchase.fulfilled.match(res)) toast.success('Pedido excluído.');
    else toast.error('Erro ao excluir.');
  }

  function getSupplierName(id: string) {
    return suppliers.find((s) => s.id === id)?.name ?? 'Sem fornecedor';
  }

  const totalPendente = orders
    .filter((o) => o.status === 'PENDING')
    .reduce((s, o) => s + o.totalCents, 0);

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Pedidos de Compra"
        description={`${orders.length} pedido(s) | Pendente: ${brl(totalPendente)}`}
      >
        <Button onClick={openNew} size="sm" disabled={products.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Compra
        </Button>
      </PageHeader>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-gray-400">
                  <PackageCheck className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  Nenhum pedido de compra.
                </TableCell>
              </TableRow>
            )}
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-sm">#{o.number}</TableCell>
                <TableCell className="font-medium">{getSupplierName(o.supplierId)}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell className="text-right font-medium">{brl(o.totalCents)}</TableCell>
                <TableCell>{fmtDate(o.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {o.status === 'PENDING' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Marcar como recebido"
                        onClick={() => handleReceive(o.id)}
                      >
                        <PackageCheck className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(o.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Pedido de Compra</DialogTitle>
            <DialogDescription>Selecione o fornecedor e os produtos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Fornecedor</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Itens</Label>
              {items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Select
                    value={item.productId}
                    onValueChange={(v) => handleProductChange(i, v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => setItems((prev) =>
                      prev.map((it, idx) => idx === i ? { ...it, qty: Number(e.target.value) } : it)
                    )}
                    className="w-16"
                    placeholder="Qtd"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={centsToInput(item.unitCostCents)}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it, idx) =>
                          idx === i ? { ...it, unitCostCents: inputToCents(e.target.value) } : it,
                        ),
                      )
                    }
                    className="w-24"
                    placeholder="Custo"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(i)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar item
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Criar Pedido</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
