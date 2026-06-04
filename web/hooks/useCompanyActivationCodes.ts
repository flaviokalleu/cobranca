'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createActivationCode,
  listActivationCodes,
  revokeActivationCode,
  type ActivationCode,
  type CreateActivationCodeInput,
} from '@/services/companyActivationApi';

export function useCompanyActivationCodes(companyRef: string | null) {
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [lastCreatedCode, setLastCreatedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!companyRef) return;
    try {
      setLoading(true);
      setCodes(await listActivationCodes(companyRef));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [companyRef]);

  const generate = useCallback(
    async (body: CreateActivationCodeInput) => {
      if (!companyRef) return;
      setSaving(true);
      try {
        const created = await createActivationCode(companyRef, body);
        setLastCreatedCode(created.code ?? null);
        await refresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [companyRef, refresh],
  );

  const revoke = useCallback(
    async (reference: string) => {
      if (!companyRef) return;
      setSaving(true);
      try {
        await revokeActivationCode(companyRef, reference);
        await refresh();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSaving(false);
      }
    },
    [companyRef, refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      codes,
      lastCreatedCode,
      loading,
      saving,
      error,
      refresh,
      generate,
      revoke,
      clearLastCreatedCode: () => setLastCreatedCode(null),
    }),
    [codes, error, generate, lastCreatedCode, loading, refresh, revoke, saving],
  );
}
