'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  type CalendarEvent,
  updateEvent,
  updateEventStatus,
} from '@/store/calendarSlice';
import { fetchCustomers } from '@/store/dataSlice';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarPlus, CheckCircle2, Clock, Pencil, Trash2, XCircle } from 'lucide-react';

const typeLabel: Record<string, string> = {
  MEETING: 'Reuniao',
  VISIT: 'Visita',
  CHARGE: 'Cobranca',
  CONTRACT: 'Contrato',
  DUE_DATE: 'Vencimento',
  TASK: 'Tarefa',
};

const statusIcon = {
  SCHEDULED: Clock,
  DONE: CheckCircle2,
  CANCELED: XCircle,
};

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

function inRange(iso: string, view: string) {
  if (view === 'ALL') return true;
  const date = new Date(iso);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (view === 'DAY') end.setDate(start.getDate() + 1);
  if (view === 'WEEK') end.setDate(start.getDate() + 7);
  if (view === 'MONTH') end.setMonth(start.getMonth() + 1);
  return date >= start && date < end;
}

export default function CalendarioPage() {
  const dispatch = useAppDispatch();
  const events = useAppSelector((state) => state.calendar.events);
  const customers = useAppSelector((state) => state.data.customers);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [view, setView] = useState('WEEK');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('MEETING');
  const [status, setStatus] = useState('SCHEDULED');
  const [startsAt, setStartsAt] = useState('');
  const [customerId, setCustomerId] = useState('NONE');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    void dispatch(fetchEvents());
    void dispatch(fetchCustomers());
  }, [dispatch]);

  const filtered = useMemo(
    () => events.filter((event) => inRange(event.startsAt, view)),
    [events, view],
  );

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setType('MEETING');
    setStatus('SCHEDULED');
    setStartsAt('');
    setCustomerId('NONE');
    setNotes('');
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditingId(event.id);
    setTitle(event.title);
    setType(event.type);
    setStatus(event.status);
    setStartsAt(toLocalInput(event.startsAt));
    setCustomerId(event.customerId ?? 'NONE');
    setNotes(event.notes ?? '');
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      type,
      status,
      startsAt,
      customerId: customerId === 'NONE' ? null : customerId,
      notes: notes || null,
    };
    const res = editingId
      ? await dispatch(updateEvent({ id: editingId, ...payload }))
      : await dispatch(
          createEvent({
            title,
            type,
            startsAt,
            customerId: customerId === 'NONE' ? undefined : customerId,
            notes: notes || undefined,
          }),
        );
    const ok = editingId ? updateEvent.fulfilled.match(res) : createEvent.fulfilled.match(res);
    if (ok) {
      toast.success(editingId ? 'Evento atualizado' : 'Evento criado');
      resetForm();
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onDelete(event: CalendarEvent) {
    if (!window.confirm(`Excluir evento "${event.title}"?`)) return;
    const res = await dispatch(deleteEvent(event.id));
    if (deleteEvent.fulfilled.match(res)) toast.success('Evento excluido');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  return (
    <>
      <PageHeader
        title="Calendario"
        description={`${filtered.length} evento(s) no periodo`}
        actions={
          <Button onClick={openCreate}>
            <CalendarPlus className="h-4 w-4" />
            Novo evento
          </Button>
        }
      />

      <div className="space-y-4 p-6">
        <div className="flex flex-wrap gap-2">
          {[
            ['DAY', 'Dia'],
            ['WEEK', 'Semana'],
            ['MONTH', 'Mes'],
            ['ALL', 'Todos'],
          ].map(([key, label]) => (
            <Button
              key={key}
              variant={view === key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="grid gap-3">
          {filtered.map((event) => {
            const Icon = statusIcon[event.status as keyof typeof statusIcon] ?? Clock;
            return (
              <Card key={event.id}>
                <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant={event.status === 'DONE' ? 'success' : 'secondary'}>
                        <Icon className="mr-1 h-3 w-3" />
                        {event.status}
                      </Badge>
                      <Badge variant="outline">{typeLabel[event.type] ?? event.type}</Badge>
                    </div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{fmtDateTime(event.startsAt)}</p>
                    {event.notes && (
                      <p className="mt-1 text-sm text-muted-foreground">{event.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Select
                      value={event.status}
                      onValueChange={(nextStatus) =>
                        void dispatch(updateEventStatus({ id: event.id, status: nextStatus }))
                      }
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SCHEDULED">Agendado</SelectItem>
                        <SelectItem value="DONE">Concluido</SelectItem>
                        <SelectItem value="CANCELED">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(event)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Excluir"
                      onClick={() => void onDelete(event)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum evento neste periodo.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar evento' : 'Novo evento'}</DialogTitle>
            <DialogDescription>Agenda operacional do ERP.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Titulo</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabel).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Agendado</SelectItem>
                    <SelectItem value="DONE">Concluido</SelectItem>
                    <SelectItem value="CANCELED">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Data e hora</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Sem cliente</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Observacoes</Label>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <Button type="submit">
              {editingId ? 'Salvar alteracoes' : 'Salvar evento'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
