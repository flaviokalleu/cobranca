'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createNotification,
  deleteNotification,
  fetchNotifications,
  markNotificationRead,
  type NotificationItem,
  updateNotification,
} from '@/store/notificationsSlice';
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
import { BellPlus, Check, Pencil, Trash2 } from 'lucide-react';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

const badgeVariant = (status: string) => {
  if (status === 'READ' || status === 'SENT') return 'success' as const;
  if (status === 'FAILED') return 'destructive' as const;
  if (status === 'QUEUED') return 'warning' as const;
  return 'secondary' as const;
};

export default function NotificacoesPage() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.notifications.items);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [channel, setChannel] = useState('SYSTEM');
  const [status, setStatus] = useState('UNREAD');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  const unread = useMemo(
    () => notifications.filter((item) => item.status === 'UNREAD').length,
    [notifications],
  );

  function resetForm() {
    setEditingId(null);
    setChannel('SYSTEM');
    setStatus('UNREAD');
    setTitle('');
    setMessage('');
    setRecipientEmail('');
    setScheduledAt('');
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(notification: NotificationItem) {
    setEditingId(notification.id);
    setChannel(notification.channel);
    setStatus(notification.status);
    setTitle(notification.title);
    setMessage(notification.message);
    setRecipientEmail(notification.recipientEmail ?? '');
    setScheduledAt(toLocalInput(notification.scheduledAt));
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      channel,
      title,
      message,
      recipientEmail: recipientEmail.trim() || null,
      status,
      scheduledAt: scheduledAt || null,
    };
    const res = editingId
      ? await dispatch(updateNotification({ id: editingId, ...payload }))
      : await dispatch(
          createNotification({
            channel,
            title,
            message,
            recipientEmail: recipientEmail.trim() || null,
            scheduledAt: scheduledAt || undefined,
          }),
        );
    const ok = editingId
      ? updateNotification.fulfilled.match(res)
      : createNotification.fulfilled.match(res);
    if (ok) {
      toast.success(editingId ? 'Notificacao atualizada' : 'Notificacao criada');
      resetForm();
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onDelete(notification: NotificationItem) {
    if (!window.confirm(`Excluir notificacao "${notification.title}"?`)) return;
    const res = await dispatch(deleteNotification(notification.id));
    if (deleteNotification.fulfilled.match(res)) toast.success('Notificacao excluida');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  return (
    <>
      <PageHeader
        title="Notificacoes"
        description={`${unread} nao lida(s)`}
        actions={
          <Button onClick={openCreate}>
            <BellPlus className="h-4 w-4" />
            Nova notificacao
          </Button>
        }
      />

      <div className="grid gap-3 p-6">
        {notifications.map((notification) => (
          <Card key={notification.id}>
            <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={badgeVariant(notification.status)}>{notification.status}</Badge>
                  <Badge variant="outline">{notification.channel}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(notification.createdAt)}
                  </span>
                </div>
                <p className="font-medium">{notification.title}</p>
                <p className="text-sm text-muted-foreground">{notification.message}</p>
                {notification.recipientEmail && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Destino: {notification.recipientEmail}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Marcar lida"
                  disabled={notification.status !== 'UNREAD'}
                  onClick={() => void dispatch(markNotificationRead(notification.id))}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Editar"
                  onClick={() => openEdit(notification)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Excluir"
                  onClick={() => void onDelete(notification)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {notifications.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma notificacao ainda.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar notificacao' : 'Nova notificacao'}</DialogTitle>
            <DialogDescription>Crie um alerta operacional ou envie para fila externa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Canal</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SYSTEM">Sistema</SelectItem>
                    <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                    <SelectItem value="EMAIL">E-mail</SelectItem>
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
                    <SelectItem value="UNREAD">Nao lida</SelectItem>
                    <SelectItem value="READ">Lida</SelectItem>
                    <SelectItem value="QUEUED">Na fila</SelectItem>
                    <SelectItem value="SENT">Enviada</SelectItem>
                    <SelectItem value="FAILED">Falhou</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Titulo</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label>Mensagem</Label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                required
                className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {channel === 'EMAIL' && (
              <div className="grid gap-1.5">
                <Label>E-mail de destino</Label>
                <Input
                  type="email"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <Label>Agendamento</Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </div>
            <Button type="submit">
              {editingId ? 'Salvar alteracoes' : 'Salvar notificacao'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
