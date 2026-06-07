'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { DndContext, type DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
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
import { DataPagination } from '@/components/ui/data-pagination';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExternalLink, Plus } from 'lucide-react';

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
  const { customers, customersPagination } = useAppSelector((state) => state.data);
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [income, setIncome] = useState('0.00');

  useEffect(() => {
    void dispatch(fetchCustomers({ page }));
  }, [dispatch, page]);

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

  function onDragEnd(event: DragEndEvent) {
    const customer = event.active.data.current?.customer as Customer | undefined;
    const stage = event.over?.id?.toString();
    if (!customer || !stage || stage === stageOf(customer)) return;
    void onChangeStage(customer, stage);
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
      <div className="p-4 md:p-6">
        <DndContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            {customersByStage.map((stage) => (
              <StageColumn
                key={stage.key}
                stage={stage}
                onChangeStage={onChangeStage}
              />
            ))}
          </div>
        </DndContext>
        <DataPagination
          page={customersPagination.page}
          total={customersPagination.total}
          totalPages={customersPagination.totalPages}
          onPageChange={setPage}
        />
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

function StageColumn({
  stage,
  onChangeStage,
}: {
  stage: { key: string; label: string; cards: Customer[] };
  onChangeStage: (customer: Customer, stage: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  const total = stage.cards.reduce((sum, customer) => sum + (customer.incomeCents ?? 0), 0);
  return (
    <div className="w-64 shrink-0">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{stage.label}</span>
        <span className="text-xs text-muted-foreground">{stage.cards.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`min-h-28 space-y-2 rounded-lg bg-muted/40 p-2 ${isOver ? 'ring-2 ring-primary' : ''}`}
      >
        {stage.cards.map((customer) => (
          <LeadCard key={customer.id} customer={customer} onChangeStage={onChangeStage} />
        ))}
        {stage.cards.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">Vazio</p>
        )}
        <p className="px-1 pt-1 text-right text-xs text-muted-foreground">{brl(total)}</p>
      </div>
    </div>
  );
}

function LeadCard({
  customer,
  onChangeStage,
}: {
  customer: Customer;
  onChangeStage: (customer: Customer, stage: string) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: customer.id,
    data: { customer },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card p-3 shadow-sm ${isDragging ? 'z-20 opacity-80 shadow-lg' : ''}`}
      {...attributes}
    >
      <div className="cursor-grab active:cursor-grabbing" {...listeners}>
        <p className="font-medium">{customer.name}</p>
        <p className="text-xs text-muted-foreground">{customer.whatsapp ?? customer.phone}</p>
        {customer.city && <p className="text-xs text-muted-foreground">{customer.city}</p>}
        {customer.incomeCents != null && (
          <p className="mt-1 text-sm font-semibold text-primary">{brl(customer.incomeCents)}</p>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Select
          value={stageOf(customer)}
          onValueChange={(nextStage) => void onChangeStage(customer, nextStage)}
        >
          <SelectTrigger className="h-8 flex-1 text-xs">
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
        <Link href={`/dashboard/clientes/${customer.id}`} className="rounded-md border p-2 text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
