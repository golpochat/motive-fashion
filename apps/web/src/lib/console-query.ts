'use client';

import { useCallback, useEffect, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';

export function useConsoleQuery<T>(path: string, failed = 'Could not load this page') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [fetching, setFetching] = useState(true);

  const reload = useCallback(() => {
    setFetching(true);
    fetch(`${API}${path}`, { credentials: 'include' })
      .then(async (res) => {
        const payload = (await res.json().catch(() => null)) as unknown;
        if (!res.ok) {
          setError(apiErrorMessage(payload, failed));
          return;
        }
        setData(payload as T);
        setError('');
      })
      .catch(() => {
        setError(failed);
      })
      .finally(() => setFetching(false));
  }, [failed, path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, error, loading: fetching && data === null, refreshing: fetching && data !== null, reload, setData };
}
