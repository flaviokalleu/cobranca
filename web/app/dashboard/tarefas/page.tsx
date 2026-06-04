'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchTasks, createTask, toggleTask } from '@/store/tasksSlice';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { Plus, CalendarClock } from 'lucide-react';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

const prio: Record<string, { label: string; variant: 'secondary' | 'warning' | 'destructive' }> = {
  LOW: { label: 'Baixa', variant: 'secondary' },
  MED: { label: 'Média', variant: 'warning' },
  HIGH: { label: 'Alta', variant: 'destructive' },
};

export default function TarefasPage() {
  const dispatch = useAppDispatch();
  const { tasks } = useAppSelector((s) => s.tasks);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('MED');

  useEffect(() => {
    void dispatch(fetchTasks());
  }, [dispatch]);

  const pending = tasks.filter((t) => !t.done).length;

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(
      createTask({ title, dueDate: dueDate || undefined, priority }),
    );
    if (createTask.fulfilled.match(res)) {
      toast.success('Tarefa adicionada');
      setTitle('');
      setDueDate('');
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  return (
    <>
      <PageHeader
        title="Checklist"
        description={`${pending} pendente(s) de ${tasks.length}`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Button>
        }
      />
      <div className="p-6">
        <Card className="divide-y">
          {tasks.map((t) => {
            const p = prio[t.priority] ?? prio.MED;
            return (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => dispatch(toggleTask(t.id))}
                  className="h-4 w-4 accent-primary"
                />
                <span
                  className={
                    t.done
                      ? 'flex-1 text-muted-foreground line-through'
                      : 'flex-1 font-medium'
                  }
                >
                  {t.title}
                </span>
                {t.dueDate && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {fmtDate(t.dueDate)}
                  </span>
                )}
                <Badge variant={p.variant}>{p.label}</Badge>
              </label>
            );
          })}
          {tasks.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              Nenhuma tarefa ainda. Clique em “Nova tarefa”.
            </p>
          )}
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
            <DialogDescription>Itens do checklist, com prazo e prioridade.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onAdd} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Vencimento (opcional)</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Prioridade</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Baixa</SelectItem>
                    <SelectItem value="MED">Média</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">
              Adicionar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
