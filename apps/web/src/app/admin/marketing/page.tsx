'use client';

import { FormEvent, useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, Field, Panel, PrimaryButton, Td, fieldClass, Select } from '@/components/dashboard-ui';

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
      <PageHeader title="Marketing" description="Captions only. Publish TikTok and Instagram yourself or via Buffer later." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Panel title="Add item">
          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Channel">
              <Select
                name="channel"
                className={fieldClass}
                defaultValue="INSTAGRAM"
                options={[
                  { value: 'INSTAGRAM', label: 'INSTAGRAM' },
                  { value: 'TIKTOK', label: 'TIKTOK' },
                  { value: 'EMAIL', label: 'EMAIL' },
                  { value: 'WHATSAPP', label: 'WHATSAPP' },
                ]}
              />
            </Field>
            <Field label="Caption">
              <textarea name="caption" required className={fieldClass} />
            </Field>
            <Field label="Publish on">
              <input name="publishOn" type="datetime-local" required className={fieldClass} />
            </Field>
            <PrimaryButton type="submit">Add item</PrimaryButton>
          </form>
        </Panel>
        <DataTable headers={['Channel', 'When', 'Caption']}>
          {items.map((i) => (
            <tr key={i.id} className="hover:bg-ink/[0.02]">
              <Td>{i.channel}</Td>
              <Td muted>{new Date(i.publishOn).toLocaleString('en-IE')}</Td>
              <Td>{i.caption}</Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
