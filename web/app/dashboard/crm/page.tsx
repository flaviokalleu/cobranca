'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchLeads, createLead, changeStage } from '@/store/crmSlice';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STAGES = [
  { key: 'NEW', label: 'Novo' },
  { key: 'CONTACTED', label: 'Contatado' },
  { key: 'PROPOSAL', label: 'Proposta' },
  { key: 'WON', label: 'Ganho' },
  { key: 'LOST', label: 'Perdido' },
];

export default function CrmPage() {
  const dispatch = useAppDispatch();
  const { leads } = useAppSelector((s) => s.crm);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [value, setValue] = useState('0.00');

  useEffect(() => {
    void dispatch(fetchLeads());
  }, [dispatch]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(
      createLead({
        name,
        contact: contact || undefined,
        estimatedCents: Math.round(parseFloat(value || '0') * 100),
      }),
    );
    if (createLead.fulfilled.match(res)) {
      toast.success('Lead adicionado');
      setName('');
      setContact('');
      setValue('0.00');
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  return (
    <>
      <PageHeader
        title="Funil de vendas (CRM)"
        description={`${leads.length} lead(s)`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo lead
          </Button>
        }
      />
      <div className="p-6">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map((stage) => {
            const cards = leads.filter((l) => l.stage === stage.key);
            const total = cards.reduce((s, c) => s + c.estimatedCents, 0);
            return (
              <div key={stage.key} className="w-64 shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold">{stage.label}</span>
                  <span className="text-xs text-muted-foreground">{cards.length}</span>
                </div>
                <div className="space-y-2 rounded-lg bg-muted/40 p-2">
                  {cards.map((l) => (
                    <div key={l.id} className="rounded-lg border bg-card p-3 shadow-sm">
                      <p className="font-medium">{l.name}</p>
                      {l.contact && (
                        <p className="text-xs text-muted-foreground">{l.contact}</p>
                      )}
                      <p className="mt-1 text-sm font-semibold text-primary">
                        {brl(l.estimatedCents)}
                      </p>
                      <Select
                        value={l.stage}
                        onValueChange={(stageKey) =>
                          dispatch(changeStage({ id: l.id, stage: stageKey }))
                        }
                      >
                        <SelectTrigger className="mt-2 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s.key} value={s.key}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {cards.length === 0 && (
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
            <DialogDescription>Entra no funil na coluna “Novo”.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onAdd} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Contato</Label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Valor estimado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Adicionar lead
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
