'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createCustomer, updateCustomer, deleteCustomer } from '@/store/dataSlice';
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
import { UserPlus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientesPage() {
  const dispatch = useAppDispatch();
  const { customers } = useAppSelector((s) => s.data);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [profession, setProfession] = useState('');
  const [income, setIncome] = useState('');

  function reset() {
    setName('');
    setDocNumber('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setCity('');
    setProfession('');
    setIncome('');
  }

  function openNew() {
    setEditId(null);
    reset();
    setOpen(true);
  }

  function openEdit(c: (typeof customers)[number]) {
    setEditId(c.id);
    setName(c.name ?? '');
    setDocNumber(c.document ?? '');
    setPhone(c.phone ?? '');
    setWhatsapp(c.whatsapp ?? '');
    setEmail(c.email ?? '');
    setCity(c.city ?? '');
    setProfession(c.profession ?? '');
    setIncome(c.incomeCents != null ? (c.incomeCents / 100).toFixed(2) : '');
    setOpen(true);
  }

  async function onDelete(c: (typeof customers)[number]) {
    if (!window.confirm(`Excluir o cliente "${c.name}"?`)) return;
    const res = await dispatch(deleteCustomer(c.id));
    if (deleteCustomer.fulfilled.match(res)) toast.success('Cliente excluído');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name,
      document: docNumber || undefined,
      phone,
      whatsapp: whatsapp || undefined,
      email: email || undefined,
      city: city || undefined,
      profession: profession || undefined,
      incomeCents: income ? Math.round(parseFloat(income) * 100) : undefined,
    };
    const res = editId
      ? await dispatch(updateCustomer({ id: editId, ...payload }))
      : await dispatch(createCustomer(payload));
    const ok = editId
      ? updateCustomer.fulfilled.match(res)
      : createCustomer.fulfilled.match(res);
    if (ok) {
      toast.success(editId ? 'Cliente atualizado' : 'Cliente cadastrado');
      reset();
      setEditId(null);
      setOpen(false);
    } else {
      const payloadErr = (res as { payload?: unknown }).payload;
      toast.error(typeof payloadErr === 'string' ? payloadErr : 'Erro');
    }
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${customers.length} cadastrado(s)`}
        actions={
          <Button onClick={openNew}>
            <UserPlus className="h-4 w-4" />
            Novo cliente
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
                <TableHead>Cidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.document ?? '-'}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                  <TableCell>{c.city ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => openEdit(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        className="text-destructive"
                        onClick={() => onDelete(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    Nenhum cliente ainda. Clique em “Novo cliente”.
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
            <DialogTitle>{editId ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
            <DialogDescription>
              {editId ? 'Atualize os dados do cliente.' : 'Cadastre quem vai receber as cobranças.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>CPF/CNPJ</Label>
                <Input value={docNumber} onChange={(e) => setDocNumber(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input
                  placeholder="+5511999998888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>WhatsApp</Label>
                <Input
                  placeholder="+5511999998888"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Cidade</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Profissao</Label>
                <Input value={profession} onChange={(e) => setProfession(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Renda (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Salvar cliente
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
