'use client';

import { FormEvent } from 'react';
import { API } from '@/lib/api';

export default function AdminWhatsapp() {
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch(`${API}/admin/whatsapp/broadcast`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: String(form.get('message')) }),
    });
    alert('Queued to opted-in numbers only');
  }
  return (
    <div>
      <h1 className="font-serif text-3xl">WhatsApp</h1>
      <p className="mt-2 text-sm">Webhook: POST /api/v1/webhooks/whatsapp. Customers text MENU, CAT:hijabs, ADD:slug, CHECKOUT.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <textarea name="message" className="w-full rounded-xl border px-3 py-2" placeholder="Broadcast (opt-in only)" />
        <button className="rounded-full bg-ink px-4 py-2 text-cream" type="submit">
          Send broadcast
        </button>
      </form>
    </div>
  );
}
