'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logout } from '@/store/authSlice';
import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';
import { navSections } from './nav';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { role, tenantId } = useAppSelector((s) => s.auth);

  const initials = (tenantId ?? 'W').slice(0, 2).toUpperCase();

  function onLogout() {
    dispatch(logout());
    router.push('/');
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col md:flex bg-white border-r border-gray-100">

      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-5 border-b border-gray-100">
        <Image src="/logo.png" alt="WEBBA ERP" width={120} height={40} priority />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" style={{ scrollbarWidth: 'none' }}>
        {navSections.map((section, i) => {
          const items = section.items.filter(
            (item) => !item.adminOnly || role === 'ADMIN' || role === 'SUPERADMIN',
          );
          if (items.length === 0) return null;
          return (
            <div key={section.title ?? i} className="mb-5">
              {section.title && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        active
                          ? 'bg-red-50 text-red-600'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-red-500' : 'text-gray-400')} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="shrink-0 px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 bg-gray-50">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#e53935,#c62828)' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-gray-800">{tenantId}</p>
            <p className="text-[10px] text-gray-400">{role}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sair"
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:text-red-500 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
