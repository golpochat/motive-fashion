'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import { authHref } from '@/lib/rbac';
import { Icon } from '@/components/icons';
import { useSession } from '@/components/session-provider';

const PENDING_KEY = 'mf_wish';

type Snapshot = { ids: Set<string>; loaded: boolean; userId: string | null };

let snapshot: Snapshot = { ids: new Set(), loaded: false, userId: null };
let inflight: Promise<void> | null = null;
let pendingApplied = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: Snapshot) {
  snapshot = next;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function fetchWishlist(userId: string) {
  if (snapshot.userId === userId && snapshot.loaded) return;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(`${API}/account/wishlist`, { credentials: 'include' });
      if (!res.ok) {
        setSnapshot({ ids: new Set(), loaded: true, userId });
        return;
      }
      const rows = (await res.json()) as { productId: string }[];
      setSnapshot({ ids: new Set(rows.map((row) => row.productId)), loaded: true, userId });
    } catch {
      setSnapshot({ ids: new Set(), loaded: true, userId });
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function WishlistButton({
  productId,
  className = '',
}: {
  productId: string;
  className?: string;
}) {
  const { me, loading } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const state = useSyncExternalStore(subscribe, () => snapshot, () => snapshot);
  const saved = state.ids.has(productId);

  useEffect(() => {
    if (loading) return;
    if (!me) {
      pendingApplied = false;
      setSnapshot({ ids: new Set(), loaded: true, userId: null });
      return;
    }
    void fetchWishlist(me.id);
  }, [me, loading]);

  useEffect(() => {
    if (!me || loading) return;
    const pending = sessionStorage.getItem(PENDING_KEY);
    if (!pending || pendingApplied) return;
    pendingApplied = true;
    sessionStorage.removeItem(PENDING_KEY);
    void fetch(`${API}/account/wishlist/${pending}`, { method: 'POST', credentials: 'include' }).then(() => {
      inflight = null;
      setSnapshot({ ...snapshot, loaded: false, userId: null });
      return fetchWishlist(me.id);
    });
  }, [me, loading]);

  const toggle = useCallback(async () => {
    if (!me) {
      sessionStorage.setItem(PENDING_KEY, productId);
      router.push(authHref('/auth/login', pathname || '/shop'));
      return;
    }
    const next = new Set(state.ids);
    if (next.has(productId)) next.delete(productId);
    else next.add(productId);
    setSnapshot({ ids: next, loaded: true, userId: me.id });
    const method = saved ? 'DELETE' : 'POST';
    const res = await fetch(`${API}/account/wishlist/${productId}`, { method, credentials: 'include' });
    if (!res.ok) {
      inflight = null;
      setSnapshot({ ...snapshot, loaded: false, userId: null });
      await fetchWishlist(me.id);
    }
  }, [me, pathname, productId, router, saved, state.ids]);

  return (
    <button
      type="button"
      className={`flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-surface/95 text-ink shadow-sm transition-colors hover:border-accent hover:text-accent ${saved ? 'text-accent' : ''} ${className}`}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
    >
      <Icon name="wishlist" className="h-5 w-5" />
    </button>
  );
}
