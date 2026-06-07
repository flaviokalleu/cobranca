'use client';

import { useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'next-themes';
import { store } from '@/store/store';
import { useAppDispatch } from '@/store/hooks';
import { hydrateFromStorage } from '@/store/authSlice';
import { PwaBootstrap } from '@/components/pwa-bootstrap';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Provider store={store}>
        <AuthHydrator>{children}</AuthHydrator>
        <PwaBootstrap />
      </Provider>
    </ThemeProvider>
  );
}

function AuthHydrator({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(hydrateFromStorage());
  }, [dispatch]);

  return <>{children}</>;
}
