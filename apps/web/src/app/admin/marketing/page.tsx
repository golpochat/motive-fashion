'use client';

import { FormEvent, useEffect, useState } from 'react';
import { API } from '@/lib/api';

export default function AdminMarketing() {
  const [items, setItems] = useState<{ id: string; channel: string; caption: string; publishOn: string }[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/marketing/calendar`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch(`${API}/admin/marketing/calendar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: form.get('channel'),
        caption: form.get('caption'),
        publishOn: form.get('publishOn'),
      }),
    });
    location.reload();
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">Content calendar</h1>
      <p className="text-sm">Captions only. Publish TikTok/Instagram yourself or via Buffer later.</p>
      <form onSubmit={onSubmit} className="mt-6 max-w-lg space-y-3">
        <select name="channel" className="w-full rounded-xl border px-3 py-2">
          <option>INSTAGRAM</option>
          <option>TIKTOK</option>
          <option>EMAIL</option>
          <option>WHATSAPP</option>
        </select>
        <textarea name="caption" required className="w-full rounded-xl border px-3 py-2" />
        <input name="publishOn" type="datetime-local" required className="w-full rounded-xl border px-3 py-2" />
        <button className="rounded-full bg-ink px-4 py-2 text-cream" type="submit">
          Add item
        </button>
      </form>
      <ul className="mt-8 space-y-3 text-sm">
        {items.map((i) => (
          <li key={i.id} className="border-b py-2">
            {i.channel} · {new Date(i.publishOn).toLocaleString('en-IE')}
            <div>{i.caption}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
