'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Wallet,
  Users,
  Target,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { navSections } from './nav';

const BOTTOM_TABS = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/dashboard/cobrancas', label: 'Receita', icon: Wallet },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/crm', label: 'CRM', icon: Target },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);
  const tenantId = useAppSelector((s) => s.auth.tenantId);
  const [menuOpen, setMenuOpen] = useState(false);

  function onLogout() {
    dispatch(logout());
    router.push('/');
  }

  const allItems = navSections
    .flatMap((s) => s.items)
    .filter((item) => !item.adminOnly || role === 'ADMIN' || role === 'SUPERADMIN');

  const initials = (tenantId ?? 'W').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Full-screen menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden">
          {/* Header do menu */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#e53935,#c62828)' }}>
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{tenantId}</p>
                <p className="text-xs text-gray-400">{role}</p>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Itens de navegação */}
          <nav className="flex-1 overflow-y-auto px-4 py-3">
            {navSections.map((section, i) => {
              const items = section.items.filter(
                (item) => !item.adminOnly || role === 'ADMIN' || role === 'SUPERADMIN',
              );
              if (items.length === 0) return null;
              return (
                <div key={section.title ?? i} className="mb-5">
                  {section.title && (
                    <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      {section.title}
                    </p>
                  )}
                  <div className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                            active
                              ? 'bg-red-50 text-red-600'
                              : 'text-gray-600 hover:bg-gray-50',
                          )}
                        >
                          <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-red-500' : 'text-gray-400')} />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="border-t border-gray-100 px-4 py-4">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Sair da conta
            </button>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center border-t border-gray-100 bg-white md:hidden"
        style={{ boxShadow: '0 -1px 12px rgba(0,0,0,0.06)' }}>
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3 transition-colors"
            >
              <Icon className={cn('h-5 w-5', active ? 'text-red-500' : 'text-gray-400')} />
              <span className={cn('text-[10px] font-medium', active ? 'text-red-500' : 'text-gray-400')}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* Botão Menu */}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3 transition-colors"
        >
          <Menu className="h-5 w-5 text-gray-400" />
          <span className="text-[10px] font-medium text-gray-400">Menu</span>
        </button>
      </nav>
    </>
  );
}
