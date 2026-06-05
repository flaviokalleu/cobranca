'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createCustomer,
  deleteCustomer,
  fetchCustomers,
  updateCustomer,
  type Customer,
} from '@/store/dataSlice';
import { api } from '@/lib/api';
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
import { Pencil, Trash2, UserPlus } from 'lucide-react';

const STAGES = [
  { key: 'LEAD', label: 'Lead' },
  { key: 'FIRST_CONTACT', label: 'Primeiro contato' },
  { key: 'DOCUMENTATION', label: 'Documentacao' },
  { key: 'ANALYSIS', label: 'Analise' },
  { key: 'APPROVED', label: 'Aprovado' },
  { key: 'CONTRACT', label: 'Contrato' },
  { key: 'CUSTOMER', label: 'Cliente' },
  { key: 'LOST', label: 'Perdido' },
] as const;

const stageLabel = (stage?: string | null) =>
  STAGES.find((item) => item.key === stage)?.label ?? 'Lead';

export default function ClientesPage() {
  const dispatch = useAppDispatch();
  const { customers } = useAppSelector((state) => state.data);

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
  const [stage, setStage] = useState('LEAD');

  useEffect(() => {
    // sincroniza leads sem customer e então recarrega a lista
    api('POST', '/leads/sync-customers')
      .then(() => dispatch(fetchCustomers()))
      .catch(() => dispatch(fetchCustomers()));
  }, [dispatch]);

  function reset() {
    setName('');
    setDocNumber('');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setCity('');
    setProfession('');
    setIncome('');
    setStage('LEAD');
  }

  function openNew() {
    setEditId(null);
    reset();
    setOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditId(customer.id);
    setName(customer.name ?? '');
    setDocNumber(customer.document ?? '');
    setPhone(customer.phone ?? '');
    setWhatsapp(customer.whatsapp ?? '');
    setEmail(customer.email ?? '');
    setCity(customer.city ?? '');
    setProfession(customer.profession ?? '');
    setIncome(customer.incomeCents != null ? (customer.incomeCents / 100).toFixed(2) : '');
    setStage(customer.stage ?? 'LEAD');
    setOpen(true);
  }

  async function onDelete(customer: Customer) {
    if (!window.confirm(`Excluir o cliente "${customer.name}"?`)) return;
    const res = await dispatch(deleteCustomer(customer.id));
    if (deleteCustomer.fulfilled.match(res)) toast.success('Cliente excluido');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      name,
      document: docNumber || undefined,
      phone,
      whatsapp: whatsapp || undefined,
      email: email || undefined,
      city: city || undefined,
      profession: profession || undefined,
      incomeCents: income ? Math.round(Number(income) * 100) : undefined,
      stage,
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
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
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
                <TableHead>Estagio</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{stageLabel(customer.stage)}</Badge>
                  </TableCell>
                  <TableCell>{customer.document ?? '-'}</TableCell>
                  <TableCell>{customer.whatsapp ?? customer.phone}</TableCell>
                  <TableCell>{customer.city ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => openEdit(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        className="text-destructive"
                        onClick={() => void onDelete(customer)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                    Nenhum cliente ainda. Clique em "Novo cliente".
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
              {editId ? 'Atualize os dados do cliente.' : 'Cadastre o lead ou cliente.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>CPF/CNPJ</Label>
                <Input value={docNumber} onChange={(event) => setDocNumber(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input
                  placeholder="+5511999998888"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
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
                  onChange={(event) => setWhatsapp(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Cidade</Label>
                <Input value={city} onChange={(event) => setCity(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Profissao</Label>
                <Input value={profession} onChange={(event) => setProfession(event.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Renda (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={income}
                  onChange={(event) => setIncome(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Estagio</Label>
                <Select value={stage} onValueChange={setStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
