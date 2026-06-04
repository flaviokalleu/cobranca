'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createTask,
  deleteTask,
  fetchTasks,
  type Task,
  toggleTask,
  updateTask,
} from '@/store/tasksSlice';
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
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

const prio: Record<string, { label: string; variant: 'secondary' | 'warning' | 'destructive' }> = {
  LOW: { label: 'Baixa', variant: 'secondary' },
  MED: { label: 'Media', variant: 'warning' },
  HIGH: { label: 'Alta', variant: 'destructive' },
};

export default function TarefasPage() {
  const dispatch = useAppDispatch();
  const { tasks } = useAppSelector((s) => s.tasks);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('MED');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    void dispatch(fetchTasks());
  }, [dispatch]);

  const pending = tasks.filter((t) => !t.done).length;

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDueDate('');
    setPriority('MED');
    setNotes('');
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(task: Task) {
    setEditingId(task.id);
    setTitle(task.title);
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
    setPriority(task.priority);
    setNotes(task.notes ?? '');
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      dueDate: dueDate || undefined,
      priority,
      notes: notes || undefined,
    };
    const res = editingId
      ? await dispatch(updateTask({ id: editingId, ...payload }))
      : await dispatch(createTask(payload));
    const ok = editingId
      ? updateTask.fulfilled.match(res)
      : createTask.fulfilled.match(res);
    if (ok) {
      toast.success(editingId ? 'Tarefa atualizada' : 'Tarefa adicionada');
      resetForm();
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onDelete(task: Task) {
    if (!window.confirm(`Excluir tarefa "${task.title}"?`)) return;
    const res = await dispatch(deleteTask(task.id));
    if (deleteTask.fulfilled.match(res)) {
      toast.success('Tarefa excluida');
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
          <Button onClick={openCreate}>
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
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => void dispatch(toggleTask(t.id))}
                  className="h-4 w-4 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      t.done
                        ? 'truncate text-muted-foreground line-through'
                        : 'truncate font-medium'
                    }
                  >
                    {t.title}
                  </p>
                  {t.notes && (
                    <p className="truncate text-xs text-muted-foreground">{t.notes}</p>
                  )}
                </div>
                {t.dueDate && (
                  <span className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {fmtDate(t.dueDate)}
                  </span>
                )}
                <Badge variant={p.variant}>{p.label}</Badge>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Excluir"
                    onClick={() => void onDelete(t)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              Nenhuma tarefa ainda.
            </p>
          )}
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
            <DialogDescription>Itens do checklist, com prazo e prioridade.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Titulo</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label>Notas</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Vencimento</Label>
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
                    <SelectItem value="MED">Media</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full">
              {editingId ? 'Salvar alteracoes' : 'Adicionar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
