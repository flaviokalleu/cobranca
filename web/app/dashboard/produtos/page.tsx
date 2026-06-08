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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const centsToInput = (c: number) => (c / 100).toFixed(2);
const inputToCents = (v: string) => Math.round(Number(v || '0') * 100);

export default function ProdutosPage() {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((s) => s.catalog);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0.00');
  const [cost, setCost] = useState('0.00');
  const [unit, setUnit] = useState('un');
  const [search, setSearch] = useState('');

  useEffect(() => {
    void dispatch(fetchProducts());
  }, [dispatch]);

  function openNew() {
    setEditingId(null);
    setSku('');
    setName('');
    setDescription('');
    setPrice('0.00');
    setCost('0.00');
    setUnit('un');
    setOpen(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setSku(p.sku);
    setName(p.name);
    setDescription(p.description ?? '');
    setPrice(centsToInput(p.priceCents));
    setCost(centsToInput(p.costCents));
    setUnit(p.unit);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      sku,
      name,
      description: description || undefined,
      priceCents: inputToCents(price),
      costCents: inputToCents(cost),
      unit,
    };
    const res = editingId
      ? await dispatch(updateProduct({ id: editingId, ...payload }))
      : await dispatch(createProduct(payload));
    if ((editingId ? updateProduct : createProduct).fulfilled.match(res as never)) {
      toast.success(editingId ? 'Produto atualizado.' : 'Produto cadastrado.');
      setOpen(false);
    } else {
      toast.error('Erro ao salvar produto.');
    }
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir produto "${nome}"?`)) return;
    const res = await dispatch(deleteProduct(id));
    if (deleteProduct.fulfilled.match(res)) toast.success('Produto excluÃ­do.');
    else toast.error('Erro ao excluir.');
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()),
  );

  const stockBadge = (qty: number) => {
    if (qty <= 0) return <Badge variant="destructive">Sem estoque</Badge>;
    if (qty <= 5) return <Badge variant="warning">Baixo ({qty})</Badge>;
    return <Badge variant="success">{qty}</Badge>;
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <PageHeader
        title="Produtos"
        description={`${products.length} produtos na lista`}
      >
        <Button onClick={openNew} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Novo Produto
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por nome ou SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-lg">
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">PreÃ§o Venda</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-center">Estoque</TableHead>
              <TableHead className="w-24 text-right">AÃ§Ãµes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-gray-400">
                  <Package className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-sm text-gray-500">{p.sku}</TableCell>
                <TableCell className="font-medium">
                  {p.name}
                  {p.description && (
                    <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.description}</p>
                  )}
                </TableCell>
                <TableCell>{p.unit}</TableCell>
                <TableCell className="text-right">{brl(p.priceCents)}</TableCell>
                <TableCell className="text-right text-gray-500">{brl(p.costCents)}</TableCell>
                <TableCell className="text-center">{stockBadge(p.stockQty)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(p.id, p.name)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            <DialogDescription>Preencha os dados do produto.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>SKU *</Label>
                <Input value={sku} onChange={(e) => setSku(e.target.value)} required placeholder="PROD-001" />
              </div>
              <div className="grid gap-1.5">
                <Label>Unidade</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="un, kg, mÂ²..." />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label>DescriÃ§Ã£o</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>PreÃ§o de Venda (R$)</Label>
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
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingId ? 'Salvar' : 'Cadastrar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

