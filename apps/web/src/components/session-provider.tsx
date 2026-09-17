'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { API } from '@/lib/api';
import { fetchAuthed } from '@/lib/auth-fetch';
import type { Me } from '@/lib/rbac';

type Snapshot = { me: Me | null; loading: boolean };

let snapshot: Snapshot = { me: null, loading: true };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: Snapshot) {
  snapshot = next;
  emit();
}

async function fetchMe(): Promise<Me | null> {
  try {
    const res = await fetchAuthed(`${API}/account/me`);
    if (!res.ok) return null;
    return (await res.json()) as Me;
  } catch {
    return null;
  }
}

export async function refreshSession() {
  const user = await fetchMe();
  setSnapshot({ me: user, loading: false });
  return user;
}

export async function logoutSession() {
  try {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch {
    /* still leave */
  }
  setSnapshot({ me: null, loading: false });
  window.location.replace('/auth/login');
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void refreshSession();
  }, []);
  return <>{children}</>;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverSnapshot: Snapshot = { me: null, loading: true };

export function useSession() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  const refresh = useCallback(() => refreshSession(), []);
  const logout = useCallback(() => logoutSession(), []);
  return { ...state, refresh, logout };
}
