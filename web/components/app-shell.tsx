'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { cn } from '@/lib/utils';
import {
  Wallet,
  LayoutDashboard,
  Receipt,
  Users,
  LogOut,
} from 'lucide-react';

const nav = [
  { id: 'painel', label: 'Painel', icon: LayoutDashboard },
  { id: 'cobrancas', label: 'Cobranças', icon: Receipt },
  { id: 'clientes', label: 'Clientes', icon: Users },
];

interface AppShellProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function AppShell({ title, actions, children }: AppShellProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { role, tenantId } = useAppSelector((s) => s.auth);
  const [active, setActive] = useState('painel');

  const initials = (tenantId ?? 'C').slice(0, 2).toUpperCase();

  function onLogout() {
    dispatch(logout());
    router.push('/');
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b px-6 text-lg font-semibold">
          <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white">
            <Wallet className="h-4 w-4" />
          </div>
          Cobrança
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActive(item.id)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active === item.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{tenantId}</p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
            <button
              onClick={onLogout}
              title="Sair"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card/80 px-6 backdrop-blur">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
