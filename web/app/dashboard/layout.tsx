'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCustomers, fetchCharges, clearError } from '@/store/dataSlice';
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { GlobalSearch } from '@/components/global-search';
import { QuickAdd } from '@/components/quick-add';
import { Tour } from '@/components/tour';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, hydrated } = useAppSelector((s) => s.auth);
  const error = useAppSelector((s) => s.data.error);

  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.push('/');
      return;
    }
    void dispatch(fetchCustomers());
    void dispatch(fetchCharges());
  }, [token, hydrated, dispatch, router]);

  // some erro vira um toast que some sozinho
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => dispatch(clearError()), 5000);
    return () => clearTimeout(t);
  }, [error, dispatch]);

  if (!hydrated) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-950">
      <Sidebar />
      <GlobalSearch />
      <div className="flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        <MobileNav />
        {children}
      </div>

      <QuickAdd />
      <Tour />

      {error && (
        <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg bg-destructive px-4 py-3 text-sm text-destructive-foreground shadow-lg">
          <span>{error}</span>
          <button onClick={() => dispatch(clearError())} aria-label="Fechar">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
