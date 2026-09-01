'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { homePath, type Me } from '@/lib/rbac';

export default function UserHome() {
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<{ id: string; status: string; trackingToken?: string }[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    fetch(`${API}/account/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((user: Me | null) => {
        setMe(user);
        if (user) {
          fetch(`${API}/account/orders`, { credentials: 'include' })
            .then((r) => r.json())
            .then(setOrders);
        }
      });
  }, []);

  if (!me) return <p>Loading…</p>;

  return (
    <div>
      <h1 className="font-serif text-3xl">Your account</h1>
      <p className="mt-4">{me.name}</p>
      <p>{me.email}</p>
      <p className="mt-2 text-sm text-ink/60">
        {me.roles?.length ? me.roles.map((r) => r.name).join(', ') : 'Customer'}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-full border px-4 py-2"
          onClick={async () => {
            await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
            window.location.replace('/account');
          }}
        >
          Sign out
        </button>
        <button
          type="button"
          className="rounded-full border px-4 py-2"
          onClick={async () => {
            const data = await fetch(`${API}/account/gdpr-export`, { credentials: 'include' }).then((r) => r.json());
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'motive-fashion-data.json';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export my data
        </button>
        <button
          type="button"
          className="rounded-full border px-4 py-2"
          onClick={async () => {
            if (!confirm('Delete your account? Orders are retained for legal records.')) return;
            await fetch(`${API}/account/gdpr-delete`, { method: 'POST', credentials: 'include' });
            await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
            setNotice('Account deleted.');
            window.location.replace('/account');
          }}
        >
          Delete account
        </button>
      </div>
      {notice ? <p className="mt-4 text-sm">{notice}</p> : null}
      {homePath(me) !== '/user' ? (
        <p className="mt-6 text-sm">
          Staff consoles are in the sidebar. This page is your customer account.
        </p>
      ) : null}
      <h2 className="mt-8 font-serif text-2xl">Orders</h2>
      <ul className="mt-3 space-y-2">
        {orders.map((o) => (
          <li key={o.id}>
            <a href={`/order/${o.id}${o.trackingToken ? `?token=${o.trackingToken}` : ''}`}>
              {o.id.slice(0, 8)} — {o.status}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
