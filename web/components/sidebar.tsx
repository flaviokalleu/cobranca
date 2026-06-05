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
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col md:flex"
      style={{ background: '#0f1729' }}>

      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
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
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(255,255,255,0.25)' }}>
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
                          ? 'text-white'
                          : 'hover:text-white',
                      )}
                      style={active
                        ? { background: 'rgba(229,57,53,0.18)', color: '#ff6b6b' }
                        : { color: 'rgba(255,255,255,0.45)' }
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" style={active ? { color: '#ff6b6b' } : {}} />
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
      <div className="shrink-0 px-3 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#e53935,#c62828)' }}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{tenantId}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{role}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sair"
            className="rounded-md p-1.5 transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
