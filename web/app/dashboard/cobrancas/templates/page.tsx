'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CopyPlus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Template {
  id: string;
  name: string;
  description: string;
  amountCents: number;
  recurrence: string;
  daysUntilDue: number;
  category?: string | null;
}

interface Customer {
  id: string;
  name: string;
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ChargeTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [category, setCategory] = useState('');
  const [recurrence, setRecurrence] = useState('ONCE');
  const [daysUntilDue, setDaysUntilDue] = useState('30');
  const [customerId, setCustomerId] = useState('');

  async function load() {
    const [templatesRes, customersRes] = await Promise.all([
      api<Template[]>('GET', '/charge-templates'),
      api<{ data: Customer[] }>('GET', '/customers?limit=100'),
    ]);
    if (templatesRes.status < 400) setTemplates(templatesRes.data);
    if (customersRes.status < 400) {
      setCustomers(customersRes.data.data ?? []);
      if (!customerId && customersRes.data.data?.[0]) setCustomerId(customersRes.data.data[0].id);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const res = await api('POST', '/charge-templates', {
      name,
      description,
      amountCents: Math.round(Number(amount) * 100),
      category: category || undefined,
      recurrence,
      daysUntilDue: Number(daysUntilDue || 30),
    });
    if (res.status < 400) {
      toast.success('Template criado');
      setName('');
      setDescription('');
      setAmount('0.00');
      setCategory('');
      await load();
    } else {
      toast.error('Nao foi possivel criar template');
    }
  }

  async function apply(template: Template) {
    if (!customerId) return;
    const res = await api('POST', `/charge-templates/${template.id}/apply`, { customerId });
    if (res.status < 400) toast.success('Cobranca criada pelo template');
    else toast.error('Nao foi possivel aplicar template');
  }

  async function remove(template: Template) {
    const res = await api('DELETE', `/charge-templates/${template.id}`);
    if (res.status < 400) {
      toast.success('Template excluido');
      await load();
    } else {
      toast.error('Nao foi possivel excluir template');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-4 py-4 sm:px-6">
        <h1 className="text-base font-bold">Templates de cobranca</h1>
        <p className="text-xs text-muted-foreground">Padroes para criar cobrancas recorrentes ou avulsas.</p>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[360px_1fr]">
        <Card className="p-4">
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Descricao</Label>
              <Input value={description} onChange={(event) => setDescription(event.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Dias vencimento</Label>
                <Input type="number" min="0" value={daysUntilDue} onChange={(event) => setDaysUntilDue(event.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Recorrencia</Label>
                <select value={recurrence} onChange={(event) => setRecurrence(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="ONCE">Avulsa</option>
                  <option value="MONTHLY">Mensal</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input value={category} onChange={(event) => setCategory(event.target.value)} />
              </div>
            </div>
            <Button type="submit" className="w-full">Salvar template</Button>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b p-4">
            <Label>Cliente para aplicar</Label>
            <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="mt-1 h-10 w-full max-w-sm rounded-md border bg-background px-3 text-sm">
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
            </select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Recorrencia</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.description}</div>
                  </TableCell>
                  <TableCell>{brl(template.amountCents)}</TableCell>
                  <TableCell>{template.recurrence}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Aplicar" onClick={() => void apply(template)}>
                        <CopyPlus className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Excluir" onClick={() => void remove(template)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    Nenhum template criado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
