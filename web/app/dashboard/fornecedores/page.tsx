'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  type Supplier,
  updateSupplier,
} from '@/store/catalogSlice';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function FornecedoresPage() {
  const dispatch = useAppDispatch();
  const { suppliers } = useAppSelector((s) => s.catalog);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [doc, setDoc] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    void dispatch(fetchSuppliers());
  }, [dispatch]);

  function resetForm() {
    setEditingId(null);
    setName('');
    setDoc('');
    setPhone('');
    setEmail('');
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setName(supplier.name);
    setDoc(supplier.document ?? '');
    setPhone(supplier.phone ?? '');
    setEmail(supplier.email ?? '');
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      document: doc || undefined,
      phone: phone || undefined,
      email: email || undefined,
    };
    const res = editingId
      ? await dispatch(updateSupplier({ id: editingId, ...payload }))
      : await dispatch(createSupplier(payload));
    const ok = editingId
      ? updateSupplier.fulfilled.match(res)
      : createSupplier.fulfilled.match(res);
    if (ok) {
      toast.success(editingId ? 'Fornecedor atualizado' : 'Fornecedor salvo');
      resetForm();
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onDelete(supplier: Supplier) {
    if (!window.confirm(`Excluir fornecedor "${supplier.name}"?`)) return;
    const res = await dispatch(deleteSupplier(supplier.id));
    if (deleteSupplier.fulfilled.match(res)) {
      toast.success('Fornecedor excluido');
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  return (
    <>
      <PageHeader
        title="Fornecedores"
        description={`${suppliers.length} cadastrado(s)`}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Novo fornecedor
          </Button>
        }
      />
      <div className="p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead className="w-[96px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.document ?? '-'}</TableCell>
                  <TableCell>{s.phone ?? '-'}</TableCell>
                  <TableCell>{s.email ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={() => void onDelete(s)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    Nenhum fornecedor ainda.
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
            <DialogTitle>{editingId ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>
            <DialogDescription>Quem fornece produtos/servicos a empresa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label>Documento (CNPJ/CPF)</Label>
              <Input value={doc} onChange={(e) => setDoc(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>E-mail</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full">
              {editingId ? 'Salvar alteracoes' : 'Salvar fornecedor'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
