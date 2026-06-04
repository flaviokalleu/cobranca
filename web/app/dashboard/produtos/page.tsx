'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  type Product,
  updateProduct,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const centsToInput = (cents: number) => (cents / 100).toFixed(2);
const inputToCents = (value: string) => Math.round(Number(value || '0') * 100);

export default function ProdutosPage() {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((s) => s.catalog);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0.00');
  const [cost, setCost] = useState('0.00');
  const [unit, setUnit] = useState('UN');

  useEffect(() => {
    void dispatch(fetchProducts());
  }, [dispatch]);

  function resetForm() {
    setEditingId(null);
    setSku('');
    setName('');
    setPrice('0.00');
    setCost('0.00');
    setUnit('UN');
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setSku(product.sku);
    setName(product.name);
    setPrice(centsToInput(product.priceCents));
    setCost(centsToInput(product.costCents));
    setUnit(product.unit);
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      sku,
      name,
      priceCents: inputToCents(price),
      costCents: inputToCents(cost),
      unit,
    };
    const res = editingId
      ? await dispatch(updateProduct({ id: editingId, ...payload }))
      : await dispatch(createProduct(payload));
    const ok = editingId
      ? updateProduct.fulfilled.match(res)
      : createProduct.fulfilled.match(res);
    if (ok) {
      toast.success(editingId ? 'Produto atualizado' : 'Produto salvo');
      resetForm();
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onDelete(product: Product) {
    if (!window.confirm(`Excluir produto "${product.name}"?`)) return;
    const res = await dispatch(deleteProduct(product.id));
    if (deleteProduct.fulfilled.match(res)) {
      toast.success('Produto excluido');
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  return (
    <>
      <PageHeader
        title="Produtos"
        description={`${products.length} cadastrado(s)`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo produto
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Preco</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead className="w-[96px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{brl(p.priceCents)}</TableCell>
                  <TableCell className="text-muted-foreground">{brl(p.costCents)}</TableCell>
                  <TableCell>
                    <Badge variant={p.stockQty > 0 ? 'secondary' : 'destructive'}>
                      {p.stockQty} {p.unit}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={() => void onDelete(p)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    Nenhum produto ainda.
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
            <DialogTitle>{editingId ? 'Editar produto' : 'Novo produto'}</DialogTitle>
            <DialogDescription>O saldo de estoque e ajustado em Movimentacoes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>SKU</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} required />
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>Preco (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Custo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Unidade</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {editingId ? 'Salvar alteracoes' : 'Salvar produto'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
