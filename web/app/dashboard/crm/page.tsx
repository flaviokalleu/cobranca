'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createCustomer,
  fetchCustomers,
  updateCustomer,
  type Customer,
} from '@/store/dataSlice';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
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
import { Plus } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

const stageOf = (customer: Customer) => customer.stage ?? 'LEAD';

export default function CrmPage() {
  const dispatch = useAppDispatch();
  const { customers } = useAppSelector((state) => state.data);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [income, setIncome] = useState('0.00');

  useEffect(() => {
    void dispatch(fetchCustomers());
  }, [dispatch]);

  const customersByStage = useMemo(
    () =>
      STAGES.map((stage) => ({
        ...stage,
        cards: customers.filter((customer) => stageOf(customer) === stage.key),
      })),
    [customers],
  );

  async function onAdd(event: React.FormEvent) {
    event.preventDefault();
    const res = await dispatch(
      createCustomer({
        name,
        phone,
        whatsapp: whatsapp || undefined,
        email: email || undefined,
        city: city || undefined,
        incomeCents: income ? Math.round(Number(income) * 100) : undefined,
        stage: 'LEAD',
      }),
    );
    if (createCustomer.fulfilled.match(res)) {
      toast.success('Lead cadastrado em clientes');
      setName('');
      setPhone('');
      setWhatsapp('');
      setEmail('');
      setCity('');
      setIncome('0.00');
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onChangeStage(customer: Customer, stage: string) {
    const res = await dispatch(updateCustomer({ id: customer.id, stage }));
    if (!updateCustomer.fulfilled.match(res)) {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  return (
    <>
      <PageHeader
        title="Funil de vendas"
        description={`${customers.length} cliente(s) e lead(s)`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo lead
          </Button>
        }
      />
      <div className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {customersByStage.map((stage) => {
            const total = stage.cards.reduce(
              (sum, customer) => sum + (customer.incomeCents ?? 0),
              0,
            );
            return (
              <div key={stage.key} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{stage.cards.length}</span>
                </div>
                <div className="space-y-2 rounded-lg bg-muted/40 p-2">
                  {stage.cards.map((customer) => (
                    <div key={customer.id} className="rounded-lg border bg-card p-3 shadow-sm">
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {customer.whatsapp ?? customer.phone}
                      </p>
                      {customer.city && (
                        <p className="text-xs text-muted-foreground">{customer.city}</p>
                      )}
                      {customer.incomeCents != null && (
                        <p className="mt-1 text-sm font-semibold text-primary">
                          {brl(customer.incomeCents)}
                        </p>
                      )}
                      <Select
                        value={stageOf(customer)}
                        onValueChange={(nextStage) => void onChangeStage(customer, nextStage)}
                      >
                        <SelectTrigger className="mt-2 h-8 text-xs">
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
                  ))}
                  {stage.cards.length === 0 && (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      Vazio
                    </p>
                  )}
                  <p className="px-1 pt-1 text-right text-xs text-muted-foreground">
                    {brl(total)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo lead</DialogTitle>
            <DialogDescription>O lead sera cadastrado tambem em Clientes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onAdd} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Telefone</Label>
                <Input
                  placeholder="+5511999998888"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label>WhatsApp</Label>
                <Input
                  placeholder="+5511999998888"
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Cidade</Label>
                <Input value={city} onChange={(event) => setCity(event.target.value)} />
              </div>
            </div>
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
            <Button type="submit" className="w-full">
              Cadastrar lead
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
