import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { NotificationBell } from '@/components/notification-bell';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: string;
}

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white/80 px-6 backdrop-blur"
      style={{ borderColor: '#f0f0f0' }}>
      <div className="flex flex-col justify-center">
        {/* Breadcrumb */}
        <div className="mb-0.5 flex items-center gap-1.5 text-xs" style={{ color: '#9ca3af' }}>
          <Link href="/dashboard" className="flex items-center gap-1 hover:text-gray-600 transition-colors">
            <Home className="h-3 w-3" />
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span style={{ color: '#374151' }} className="font-medium">{breadcrumb ?? title}</span>
        </div>
        <h1 className="text-lg font-bold tracking-tight text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        {actions}
      </div>
    </header>
  );
}
