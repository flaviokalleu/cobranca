'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Wallet, Users, Target, Menu, X, LogOut, Moon, Sun,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { navSections } from './nav';
import { useTheme } from 'next-themes';

const BOTTOM_TABS = [
  { href: '/dashboard',          label: 'Painel',   icon: LayoutDashboard },
  { href: '/dashboard/cobrancas',label: 'Receita',  icon: Wallet },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/crm',      label: 'CRM',      icon: Target },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);
  const tenantId = useAppSelector((s) => s.auth.tenantId);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Fecha drawer ao navegar
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Bloqueia scroll do body quando drawer aberto
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const dark = mounted && resolvedTheme === 'dark';
  const initials = (tenantId ?? 'W').slice(0, 2).toUpperCase();

  function onLogout() {
    setDrawerOpen(false);
    dispatch(logout());
    router.push('/');
  }

  const allSections = navSections.map((s) => ({
    ...s,
    items: s.items.filter(
      (item) => !item.adminOnly || role === 'ADMIN' || role === 'SUPERADMIN',
    ),
  })).filter((s) => s.items.length > 0);

  return (
    <>
      {/* ── Overlay ───────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Drawer lateral (desliza da esquerda) ─────────────────────────── */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-2xl md:hidden',
          'transition-transform duration-250 ease-in-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Drawer header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#e53935,#c62828)' }}
            >
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{tenantId}</p>
              <p className="text-xs text-gray-400">{role}</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'none' }}>
          {allSections.map((section, i) => (
            <div key={section.title ?? i} className="mb-4">
              {section.title && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                        active
                          ? 'bg-red-50 text-red-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-red-500' : 'text-gray-400')} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="shrink-0 border-t border-gray-100 px-3 py-3 space-y-1">
          <button
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {dark ? <Sun className="h-4 w-4 text-gray-400" /> : <Moon className="h-4 w-4 text-gray-400" />}
            {dark ? 'Tema claro' : 'Tema escuro'}
          </button>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </button>
        </div>
      </div>

      {/* ── Bottom tab bar ────────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-stretch border-t border-gray-100 bg-white md:hidden"
        style={{ boxShadow: '0 -1px 16px rgba(0,0,0,0.07)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {BOTTOM_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
            >
              <div className={cn(
                'flex h-6 w-6 items-center justify-center rounded-lg transition-all',
                active ? 'bg-red-50' : '',
              )}>
                <Icon className={cn('h-4 w-4', active ? 'text-red-500' : 'text-gray-400')} />
              </div>
              <span className={cn('text-[10px] font-medium', active ? 'text-red-500' : 'text-gray-400')}>
                {tab.label}
              </span>
            </Link>
          );
        })}

        {/* Botão Menu → abre drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors"
        >
          <div className="flex h-6 w-6 items-center justify-center">
            <Menu className="h-4 w-4 text-gray-400" />
          </div>
          <span className="text-[10px] font-medium text-gray-400">Menu</span>
        </button>
      </nav>
    </>
  );
}
