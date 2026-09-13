'use client';

import { useCallback, useEffect, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';

export function useConsoleQuery<T>(path: string, failed = 'Could not load this page') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    fetch(`${API}${path}`, { credentials: 'include' })
      .then(async (res) => {
        const payload = (await res.json().catch(() => null)) as unknown;
        if (!res.ok) {
          setData(null);
          setError(apiErrorMessage(payload, failed));
          return;
        }
        setData(payload as T);
        setError('');
      })
      .catch(() => {
        setData(null);
        setError(failed);
      })
      .finally(() => setLoading(false));
  }, [failed, path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading, reload, setData };
}
