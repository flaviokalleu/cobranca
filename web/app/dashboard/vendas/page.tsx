'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  confirmSale,
  createSale,
  deleteSale,
  fetchSales,
  type SalesOrder,
} from '@/store/salesSlice';
import { fetchProducts, fetchSuppliers } from '@/store/catalogSlice';
import { fetchCustomers } from '@/store/dataSlice';
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
import { Check, Plus, ShoppingCart, Trash2 } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

function StatusBadge({ status }: { status: string }) {
  if (status === 'CONFIRMED') return <Badge variant="success">Confirmado</Badge>;
  if (status === 'CANCELED') return <Badge variant="secondary">Cancelado</Badge>;
  return <Badge variant="warning">Rascunho</Badge>;
}

interface ItemLine {
  productId: string;
  qty: number;
}

export default function VendasPage() {
  const dispatch = useAppDispatch();
  const { orders } = useAppSelector((s) => s.sales);
  const { products } = useAppSelector((s) => s.catalog);
  const { customers } = useAppSelector((s) => s.data);

  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<ItemLine[]>([{ productId: '', qty: 1 }]);

  useEffect(() => {
    void dispatch(fetchSales());
    void dispatch(fetchProducts());
    void dispatch(fetchCustomers());
  }, [dispatch]);

  function openNew() {
    setCustomerId(customers[0]?.id ?? '');
    setItems([{ productId: products[0]?.id ?? '', qty: 1 }]);
    setOpen(true);
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: products[0]?.id ?? '', qty: 1 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof ItemLine, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: field === 'qty' ? Number(value) : value } : item,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = items.filter((i) => i.productId && i.qty > 0);
    if (!validItems.length) { toast.error('Adicione pelo menos um item.'); return; }
    const res = await dispatch(createSale({ customerId, items: validItems }));
    if (createSale.fulfilled.match(res)) {
      toast.success('Pedido criado.');
      setOpen(false);
    } else {
      toast.error('Erro ao criar pedido.');
    }
  }

  async function handleConfirm(id: string) {
    const res = await dispatch(confirmSale(id));
    if (confirmSale.fulfilled.match(res)) toast.success('Pedido confirmado!');
    else toast.error('Erro ao confirmar pedido.');
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este pedido?')) return;
    const res = await dispatch(deleteSale(id));
    if (deleteSale.fulfilled.match(res)) toast.success('Pedido excluÃ­do.');
    else toast.error('Erro ao excluir.');
  }

  function getCustomerName(id: string) {
    return customers.find((c) => c.id === id)?.name ?? 'â€”';
  }

  const totalVendas = orders
    .filter((o) => o.status === 'CONFIRMED')
    .reduce((s, o) => s + o.totalCents, 0);

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <PageHeader
        title="Vendas"
        description={`${orders.length} pedidos | Confirmados: ${brl(totalVendas)}`}
      >
        <Button onClick={openNew} size="sm" disabled={products.length === 0 || customers.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Pedido
        </Button>
      </PageHeader>

      <div className="overflow-x-auto rounded-lg">
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NÂº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-32 text-right">AÃ§Ãµes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-gray-400">
                  <ShoppingCart className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  Nenhum pedido de venda.
                </TableCell>
              </TableRow>
            )}
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-sm">#{o.number}</TableCell>
                <TableCell className="font-medium">{getCustomerName(o.customerId)}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell className="text-right font-medium">{brl(o.totalCents)}</TableCell>
                <TableCell>{fmtDate(o.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {o.status === 'DRAFT' && (
                      <Button variant="ghost" size="icon" title="Confirmar pedido" onClick={() => handleConfirm(o.id)}>
                        <Check className="h-4 w-4 text-green-600" />
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
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Pedido de Venda</DialogTitle>
            <DialogDescription>Selecione o cliente e os produtos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Cliente *</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
                    onValueChange={(v) => updateItem(i, 'productId', v)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Produto..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} â€” {brl(p.priceCents)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => updateItem(i, 'qty', e.target.value)}
                    className="w-20"
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

