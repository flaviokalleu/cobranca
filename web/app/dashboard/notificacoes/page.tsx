'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createNotification,
  fetchNotifications,
  markNotificationRead,
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
import { BellPlus, Check } from 'lucide-react';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

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
  const [channel, setChannel] = useState('SYSTEM');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  const unread = useMemo(
    () => notifications.filter((item) => item.status === 'UNREAD').length,
    [notifications],
  );

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(createNotification({ channel, title, message }));
    if (createNotification.fulfilled.match(res)) {
      toast.success('Notificacao criada');
      setTitle('');
      setMessage('');
      setChannel('SYSTEM');
      setOpen(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Notificacoes"
        description={`${unread} nao lida(s)`}
        actions={
          <Button onClick={() => setOpen(true)}>
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
              </div>
              {notification.status === 'UNREAD' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => dispatch(markNotificationRead(notification.id))}
                >
                  <Check className="h-4 w-4" />
                  Lida
                </Button>
              )}
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
            <DialogTitle>Nova notificacao</DialogTitle>
            <DialogDescription>Crie um alerta operacional ou envie para fila externa.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="grid gap-4">
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
            <Button type="submit">Salvar notificacao</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
