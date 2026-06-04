'use client';

import { useEffect, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { useAppDispatch } from '@/store/hooks';
import { hydrateFromStorage } from '@/store/authSlice';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <AuthHydrator>{children}</AuthHydrator>
    </Provider>
  );
}

function AuthHydrator({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(hydrateFromStorage());
  }, [dispatch]);

  return <>{children}</>;
}
