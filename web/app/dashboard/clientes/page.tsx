'use client';

import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createCustomer } from '@/store/dataSlice';
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
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientesPage() {
  const dispatch = useAppDispatch();
  const { customers } = useAppSelector((s) => s.data);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(createCustomer({ name, phone }));
    if (createCustomer.fulfilled.match(res)) {
      toast.success('Cliente cadastrado');
      setName('');
      setPhone('');
      setOpen(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${customers.length} cadastrado(s)`}
        actions={
          <Button onClick={() => setOpen(true)}>
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
                <TableHead>Telefone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.phone}</TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="py-12 text-center text-muted-foreground">
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
            <DialogTitle>Novo cliente</DialogTitle>
            <DialogDescription>Cadastre quem vai receber as cobranças.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onAdd} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
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
            <Button type="submit" className="w-full">
              Salvar cliente
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
