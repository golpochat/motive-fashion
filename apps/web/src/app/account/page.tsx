'use client';

import { FormEvent, useEffect, useState } from 'react';
import { API } from '@/lib/api';

export default function AccountPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [me, setMe] = useState<{ name: string; email: string } | null>(null);
  const [orders, setOrders] = useState<{ id: string; status: string }[]>([]);

  async function refresh() {
    const res = await fetch(`${API}/account/me`, { credentials: 'include' });
    if (res.ok) {
      setMe(await res.json());
      const o = await fetch(`${API}/account/orders`, { credentials: 'include' }).then((r) => r.json());
      setOrders(o);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const path = mode === 'login' ? '/auth/login' : '/auth/register';
    await fetch(`${API}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
        name: form.get('name'),
      }),
    });
    await refresh();
  }

  if (me) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Account</h1>
        <p className="mt-4">{me.name}</p>
        <p>{me.email}</p>
        <h2 className="mt-8 font-serif text-2xl">Orders</h2>
        <ul className="mt-3 space-y-2">
          {orders.map((o) => (
            <li key={o.id}>
              {o.id.slice(0, 8)} — {o.status}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-3">
      <h1 className="font-serif text-4xl">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      {mode === 'register' ? (
        <input name="name" required placeholder="Name" className="w-full rounded-xl border px-3 py-2" />
      ) : null}
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border px-3 py-2" />
      <input name="password" type="password" required placeholder="Password" className="w-full rounded-xl border px-3 py-2" />
      <button className="rounded-full bg-ink px-6 py-2 text-cream" type="submit">
        Continue
      </button>
      <button type="button" className="block text-sm underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account?' : 'Already registered?'}
      </button>
    </form>
  );
}
