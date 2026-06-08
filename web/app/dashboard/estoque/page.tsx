'use client';

import { useEffect, useState } from 'react';
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
import { ArrowDownCircle, ArrowUpCircle, Package, Pencil, Plus, Trash2 } from 'lucide-react';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });

export default function EstoquePage() {
  const dispatch = useAppDispatch();
  const { movements, products } = useAppSelector((s) => s.catalog);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    void dispatch(fetchMovements());
    void dispatch(fetchProducts());
  }, [dispatch]);

  function getProductName(id: string) {
    return products.find((p) => p.id === id)?.name ?? id;
  }

  function openNew() {
    setEditingId(null);
    setProductId(products[0]?.id ?? '');
    setQty('1');
    setReason('');
    setOpen(true);
  }

  function openEdit(m: StockMovement) {
    setEditingId(m.id);
    setProductId(m.productId);
    setQty(String(m.qty));
    setReason(m.reason);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = editingId
      ? await dispatch(updateStockMovement({ id: editingId, qty: Number(qty), reason }))
      : await dispatch(adjustStock({ productId, qty: Number(qty), reason }));
    if ((editingId ? updateStockMovement : adjustStock).fulfilled.match(res as never)) {
      toast.success(editingId ? 'MovimentaÃ§Ã£o atualizada.' : 'Ajuste de estoque registrado.');
      setOpen(false);
    } else {
      toast.error('Erro ao salvar.');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta movimentaÃ§Ã£o?')) return;
    const res = await dispatch(deleteStockMovement(id));
    if (deleteStockMovement.fulfilled.match(res)) toast.success('MovimentaÃ§Ã£o excluÃ­da.');
    else toast.error('Erro ao excluir.');
  }

  const filtered = movements.filter((m) =>
    getProductName(m.productId).toLowerCase().includes(search.toLowerCase()) ||
    m.reason.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <PageHeader
        title="Estoque"
        description={`${products.length} produtos | ${movements.length} movimentaÃ§Ã£o(Ãµes)`}
      >
        <Button onClick={openNew} size="sm" disabled={products.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Ajuste de Estoque
        </Button>
      </PageHeader>

      {/* Saldo atual */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.slice(0, 8).map((p) => (
          <Card key={p.id} className="p-4">
            <p className="truncate text-sm font-medium text-gray-700">{p.name}</p>
            <p className="mt-1 text-2xl font-bold">
              {p.stockQty}
              <span className="ml-1 text-sm font-normal text-gray-400">{p.unit}</span>
            </p>
            {p.stockQty <= 0 && (
              <p className="mt-1 text-xs text-destructive">Sem estoque</p>
            )}
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por produto ou motivo..."
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
              <TableHead>Tipo</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>ReferÃªncia</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-24 text-right">AÃ§Ãµes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-gray-400">
                  <Package className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  Nenhuma movimentaÃ§Ã£o encontrada.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  {m.qty >= 0 ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <ArrowUpCircle className="h-4 w-4" /> Entrada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500">
                      <ArrowDownCircle className="h-4 w-4" /> SaÃ­da
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-medium">{getProductName(m.productId)}</TableCell>
                <TableCell className="text-right font-mono">
                  {m.qty > 0 ? `+${m.qty}` : m.qty}
                </TableCell>
                <TableCell>{m.reason}</TableCell>
                <TableCell className="text-xs text-gray-400">
                  {m.refType ? `${m.refType}: ${m.refId?.slice(0, 8)}` : 'â€”'}
                </TableCell>
                <TableCell>{fmtDate(m.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(m.id)}
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
            <DialogTitle>{editingId ? 'Editar MovimentaÃ§Ã£o' : 'Ajuste de Estoque'}</DialogTitle>
            <DialogDescription>
              Use valores positivos para entrada e negativos para saÃ­da.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {!editingId && (
              <div className="grid gap-1.5">
                <Label>Produto *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (estoque: {p.stockQty})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="+10 entrada / -5 saÃ­da"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Motivo *</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Compra, venda, perda, ajuste..."
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingId ? 'Salvar' : 'Registrar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

