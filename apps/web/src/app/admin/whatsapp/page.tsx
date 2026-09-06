'use client';

import { FormEvent } from 'react';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Field, Panel, PrimaryButton, fieldClass } from '@/components/dashboard-ui';

export default function AdminWhatsapp() {
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      await fetch(`${API}/admin/whatsapp/broadcast`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: String(form.get('message')) }),
      }).then(async (res) => {
        if (!res.ok) throw new Error('broadcast');
      });
      alert('Queued to opted-in numbers only');
    } catch {
      alert('Broadcast failed. Admin only, and the number must be opted in.');
    }
  }
  return (
    <div>
      <PageHeader title="WhatsApp" description="Broadcasts go only to opted-in numbers. Customers can text MENU, CAT:hijabs, ADD:slug, CHECKOUT." />
      <div className="max-w-lg">
        <Panel title="Broadcast">
          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Message">
              <textarea name="message" className={fieldClass} rows={5} />
            </Field>
            <PrimaryButton type="submit">Send broadcast</PrimaryButton>
          </form>
        </Panel>
      </div>
    </div>
  );
}
