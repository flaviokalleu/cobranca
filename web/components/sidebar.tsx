'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, LogOut, Moon, Sun } from 'lucide-react';
import { navSections } from './nav';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

const COLLAPSED_KEY = 'sidebar-collapsed';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { role, tenantId } = useAppSelector((s) => s.auth);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(COLLAPSED_KEY);
    if (saved !== null) setCollapsed(saved === 'true');
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(COLLAPSED_KEY, String(next));
  }

  const initials = (tenantId ?? 'W').slice(0, 2).toUpperCase();
  const dark = mounted && resolvedTheme === 'dark';

  function onLogout() {
    dispatch(logout());
    router.push('/');
  }

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col md:flex bg-white border-r border-gray-200 transition-all duration-200',
        collapsed ? 'w-[64px]' : 'w-64',
      )}
    >
      {/* Logo + toggle */}
      <div className={cn(
        'flex h-16 shrink-0 items-center border-b border-gray-200 relative',
        collapsed ? 'justify-center px-0' : 'px-4',
      )}>
        {!collapsed && (
          <Image src="/logo.png" alt="WEBBA ERP" width={110} height={36} priority />
        )}
        {collapsed && (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'linear-gradient(135deg,#e53935,#c62828)' }}
          >
            <span className="text-[10px] font-black text-white">W</span>
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={toggleCollapse}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'absolute -right-3 top-1/2 -translate-y-1/2 z-10',
            'flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200',
            'text-gray-400 shadow-sm transition-colors hover:text-gray-700 hover:border-gray-300',
          )}
        >
          {collapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3" style={{ scrollbarWidth: 'none' }}>
        {navSections.map((section, i) => {
          const items = section.items.filter(
            (item) => !item.adminOnly || role === 'ADMIN' || role === 'SUPERADMIN',
          );
          if (items.length === 0) return null;
          return (
            <div key={section.title ?? i} className={cn('mb-4', collapsed ? 'px-1.5' : 'px-2')}>
              {section.title && !collapsed && (
                <p className="mb-1.5 px-2 text-[11px] font-semibold text-gray-500">
                  {section.title}
                </p>
              )}
              {section.title && collapsed && (
                <div className="my-1 mx-auto h-px w-6 bg-gray-100" />
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center rounded-lg transition-all',
                        collapsed
                          ? 'h-10 w-10 justify-center mx-auto'
                          : 'gap-3 px-3 py-2.5 text-sm font-medium',
                        active
                          ? 'bg-red-50 text-red-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      )}
                    >
                      <Icon
                        className={cn(
                          'shrink-0',
                          collapsed ? 'h-4 w-4' : 'h-4 w-4',
                          active ? 'text-red-500' : 'text-gray-400',
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className={cn('shrink-0 border-t border-gray-100', collapsed ? 'px-1.5 py-2' : 'px-2 py-2')}>
        {collapsed ? (
          /* Collapsed: just avatar + logout stacked */
          <div className="flex flex-col items-center gap-1.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#e53935,#c62828)' }}
            >
              {initials}
            </div>
            <button
              onClick={() => setTheme(dark ? 'light' : 'dark')}
              title={dark ? 'Tema claro' : 'Tema escuro'}
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onLogout}
              title="Sair"
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          /* Expanded: full user card */
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 bg-gray-50">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#e53935,#c62828)' }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-gray-800">{tenantId}</p>
              <p className="text-[10px] text-gray-400">Minha conta</p>
            </div>
            <button
              onClick={() => setTheme(dark ? 'light' : 'dark')}
              title={dark ? 'Tema claro' : 'Tema escuro'}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700"
            >
              {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={onLogout}
              title="Sair"
              className="rounded-md p-1 text-gray-400 transition-colors hover:text-red-500 hover:bg-red-50"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
