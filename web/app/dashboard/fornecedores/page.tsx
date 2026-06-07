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
import { Pencil, Plus, Trash2, Truck } from 'lucide-react';

export default function FornecedoresPage() {
  const dispatch = useAppDispatch();
  const { suppliers } = useAppSelector((s) => s.catalog);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    void dispatch(fetchSuppliers());
  }, [dispatch]);

  function openNew() {
    setEditingId(null);
    setName('');
    setDocument('');
    setPhone('');
    setEmail('');
    setOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditingId(s.id);
    setName(s.name);
    setDocument(s.document ?? '');
    setPhone(s.phone ?? '');
    setEmail(s.email ?? '');
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name, document: document || undefined, phone: phone || undefined, email: email || undefined };
    const action = editingId
      ? dispatch(updateSupplier({ id: editingId, ...payload }))
      : dispatch(createSupplier(payload));
    const res = await action;
    if ((editingId ? updateSupplier : createSupplier).fulfilled.match(res as never)) {
      toast.success(editingId ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.');
      setOpen(false);
    } else {
      toast.error('Erro ao salvar fornecedor.');
    }
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir fornecedor "${nome}"?`)) return;
    const res = await dispatch(deleteSupplier(id));
    if (deleteSupplier.fulfilled.match(res)) toast.success('Fornecedor excluído.');
    else toast.error('Erro ao excluir.');
  }

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.document ?? '').includes(search) ||
    (s.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
      <PageHeader
        title="Fornecedores"
        description={`${suppliers.length} fornecedor(es) cadastrado(s)`}
      >
        <Button onClick={openNew} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por nome, CNPJ/CPF ou e-mail..."
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
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ / CPF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-gray-400">
                  <Truck className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  Nenhum fornecedor encontrado.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.document ?? '—'}</TableCell>
                <TableCell>{s.phone ?? '—'}</TableCell>
                <TableCell>{s.email ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(s.id, s.name)}
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
            <DialogTitle>{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            <DialogDescription>Preencha os dados do fornecedor.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label>CNPJ / CPF</Label>
              <Input
                value={document}
                onChange={(e) => setDocument(e.target.value)}
                placeholder="00.000.000/0001-00"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 9 0000-0000" />
              </div>
              <div className="grid gap-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
