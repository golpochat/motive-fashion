'use client';

import { FormEvent, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, Field, FilterTabs, Panel, PrimaryButton, Td, fieldClass, Select } from '@/components/dashboard-ui';

type Item = { id: string; channel: string; caption: string; publishOn: string };
type Campaign = { id: string; name: string; season: string; audience: string | null };

export default function AdminMarketing() {
  const calendar = useConsoleQuery<Item[]>('/admin/marketing/calendar', 'Could not load the marketing calendar');
  const campaigns = useConsoleQuery<Campaign[]>('/admin/marketing/campaigns', 'Could not load campaigns');
  const [formError, setFormError] = useState('');
  const [tab, setTab] = useState('calendar');
  const items = calendar.data ?? [];
  const campaignRows = campaigns.data ?? [];

  async function addCalendar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/marketing/calendar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: form.get('channel'),
        caption: form.get('caption'),
        publishOn: form.get('publishOn'),
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not add this item.'));
      return;
    }
    e.currentTarget.reset();
    calendar.reload();
  }

  async function addCampaign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/marketing/campaigns`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        season: form.get('season'),
        audience: String(form.get('audience') || '') || undefined,
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not create this campaign.'));
      return;
    }
    e.currentTarget.reset();
    campaigns.reload();
  }

  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Campaigns and captions. Discount codes live under Coupons. Publish TikTok and Instagram yourself or via Buffer later."
      />
      {formError ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="mb-6">
        <FilterTabs
          ariaLabel="Marketing"
          current={tab}
          onChange={setTab}
          items={[
            { id: 'calendar', label: 'Calendar' },
            { id: 'campaigns', label: 'Campaigns' },
          ]}
        />
      </div>
      {tab === 'campaigns' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <Panel title="Add campaign">
            <form onSubmit={(e) => void addCampaign(e)} className="space-y-3">
              <Field label="Name">
                <input name="name" required className={fieldClass} />
              </Field>
              <Field label="Season">
                <Select
                  name="season"
                  defaultValue="EVERYDAY"
                  options={[
                    { value: 'EVERYDAY', label: 'Everyday' },
                    { value: 'RAMADAN', label: 'Ramadan' },
                    { value: 'EID', label: 'Eid' },
                    { value: 'WINTER', label: 'Winter' },
                    { value: 'SUMMER', label: 'Summer' },
                  ]}
                />
              </Field>
              <Field label="Audience">
                <input name="audience" className={fieldClass} />
              </Field>
              <PrimaryButton type="submit">Add campaign</PrimaryButton>
            </form>
          </Panel>
          <ConsoleSection
            loading={campaigns.loading}
            error={campaigns.error}
            onRetry={campaigns.reload}
            empty={campaignRows.length === 0}
            emptyTitle="No campaigns"
            emptyBody="Add a season campaign to group calendar captions."
          >
            <DataTable headers={['Name', 'Season', 'Audience']}>
              {campaignRows.map((row) => (
                <tr key={row.id} className="hover:bg-ink/5">
                  <Td>{row.name}</Td>
                  <Td muted>{row.season}</Td>
                  <Td muted>{row.audience ?? '—'}</Td>
                </tr>
              ))}
            </DataTable>
          </ConsoleSection>
        </div>
      ) : null}
      {tab === 'calendar' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <Panel title="Add calendar item">
            <form onSubmit={(e) => void addCalendar(e)} className="space-y-3">
              <Field label="Channel">
                <Select
                  name="channel"
                  className={fieldClass}
                  defaultValue="INSTAGRAM"
                  options={[
                    { value: 'INSTAGRAM', label: 'Instagram' },
                    { value: 'TIKTOK', label: 'TikTok' },
                    { value: 'EMAIL', label: 'Email' },
                    { value: 'WHATSAPP', label: 'WhatsApp' },
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
          <ConsoleSection
            loading={calendar.loading}
            error={calendar.error}
            onRetry={calendar.reload}
            empty={items.length === 0}
            emptyTitle="No calendar items"
            emptyBody="Add a caption and publish time to plan a post."
          >
            <DataTable headers={['Channel', 'When', 'Caption']}>
              {items.map((i) => (
                <tr key={i.id} className="hover:bg-ink/5">
                  <Td>{i.channel}</Td>
                  <Td muted>{new Date(i.publishOn).toLocaleString('en-IE')}</Td>
                  <Td>{i.caption}</Td>
                </tr>
              ))}
            </DataTable>
          </ConsoleSection>
        </div>
      ) : null}
    </div>
  );
}
