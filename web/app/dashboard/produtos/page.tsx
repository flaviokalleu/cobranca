'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProducts, createProduct } from '@/store/catalogSlice';
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
import { Plus } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProdutosPage() {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((s) => s.catalog);

  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0.00');
  const [cost, setCost] = useState('0.00');
  const [unit, setUnit] = useState('UN');

  useEffect(() => {
    void dispatch(fetchProducts());
  }, [dispatch]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(
      createProduct({
        sku,
        name,
        priceCents: Math.round(parseFloat(price) * 100),
        costCents: Math.round(parseFloat(cost) * 100),
        unit,
      }),
    );
    if (createProduct.fulfilled.match(res)) {
      toast.success('Produto salvo');
      setSku('');
      setName('');
      setPrice('0.00');
      setCost('0.00');
      setOpen(false);
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
          <Button onClick={() => setOpen(true)}>
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
                <TableHead>Preço</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Estoque</TableHead>
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
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
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
            <DialogTitle>Novo produto</DialogTitle>
            <DialogDescription>O estoque começa em 0 — ajuste em Movimentações.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onAdd} className="grid gap-4">
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
                <Label>Preço (R$)</Label>
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
              Salvar produto
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
