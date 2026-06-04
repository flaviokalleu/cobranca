'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { cn } from '@/lib/utils';
import { Wallet, LogOut } from 'lucide-react';
import { navSections } from './nav';

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);

  function onLogout() {
    dispatch(logout());
    router.push('/');
  }

  const items = navSections
    .flatMap((s) => s.items)
    .filter((item) => !item.adminOnly || role === 'ADMIN');

  return (
    <header className="flex items-center gap-2 border-b bg-card px-4 py-3 md:hidden">
      <div className="flex shrink-0 items-center gap-2 font-semibold">
        <div className="brand-gradient flex h-7 w-7 items-center justify-center rounded-lg text-white">
          <Wallet className="h-4 w-4" />
        </div>
        Cobrança
      </div>
      <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                'shrink-0 rounded-md p-2 transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <Icon className="h-5 w-5" />
            </Link>
          );
        })}
      </nav>
      <button
        onClick={onLogout}
        title="Sair"
        className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </header>
  );
}
