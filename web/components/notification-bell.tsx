'use client';

import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchNotifications,
  markNotificationRead,
  type NotificationItem,
} from '@/store/notificationsSlice';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

function statusLabel(status: string) {
  if (status === 'UNREAD') return 'Nao lida';
  if (status === 'READ') return 'Lida';
  if (status === 'QUEUED') return 'Na fila';
  if (status === 'SENT') return 'Enviada';
  if (status === 'FAILED') return 'Falhou';
  return status;
}

function notificationPreview(item: NotificationItem) {
  return item.message.length > 90 ? `${item.message.slice(0, 90)}...` : item.message;
}

export function NotificationBell() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((state) => state.notifications.items);

  useEffect(() => {
    void dispatch(fetchNotifications());
    const timer = window.setInterval(() => {
      void dispatch(fetchNotifications());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [dispatch]);

  const unread = useMemo(
    () => notifications.filter((item) => item.status === 'UNREAD').length,
    [notifications],
  );
  const recent = useMemo(() => notifications.slice(0, 5), [notifications]);

  async function onNotificationClick(item: NotificationItem) {
    if (item.status !== 'UNREAD') return;
    await dispatch(markNotificationRead(item.id));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Notificacoes">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificacoes</span>
          <span className="text-muted-foreground">{unread} novas</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto p-1">
          {recent.map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="items-start gap-3 py-2"
              onClick={() => void onNotificationClick(item)}
            >
              <span
                className={
                  item.status === 'UNREAD'
                    ? 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary'
                    : 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted'
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {notificationPreview(item)}
                </span>
                <span className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{fmtDate(item.createdAt)}</span>
                  <span>{statusLabel(item.status)}</span>
                </span>
              </span>
              {item.status === 'UNREAD' && <Check className="mt-1 h-4 w-4 shrink-0" />}
            </DropdownMenuItem>
          ))}
          {recent.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificacao.
            </div>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/notificacoes" className="justify-between">
            Ver todas
            <ExternalLink className="h-4 w-4" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
