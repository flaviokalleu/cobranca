'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { cn } from '@/lib/utils';
import { Wallet, LogOut } from 'lucide-react';
import { navSections } from './nav';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { role, tenantId } = useAppSelector((s) => s.auth);

  const initials = (tenantId ?? 'C').slice(0, 2).toUpperCase();

  function onLogout() {
    dispatch(logout());
    router.push('/');
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b px-6 text-lg font-semibold">
        <div className="brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-white">
          <Wallet className="h-4 w-4" />
        </div>
        Cobrança
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {navSections.map((section, i) => {
          const items = section.items.filter(
            (item) => !item.adminOnly || role === 'ADMIN',
          );
          if (items.length === 0) return null;
          return (
            <div key={section.title ?? i} className="space-y-1">
              {section.title && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.title}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t p-3">
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
  );
}
