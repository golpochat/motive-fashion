'use client';

import { FormEvent, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, Field, FilterTabs, Panel, PrimaryButton, SecondaryButton, Td, fieldClass, Select } from '@/components/dashboard-ui';
import { formatEur } from '@motive-fashion/utils';

type Item = { id: string; channel: string; caption: string; publishOn: string };
type Campaign = { id: string; name: string; season: string; audience: string | null };
type Promo = { id: string; code: string; type: string; value: number; active: boolean; usedCount: number; maxUses: number | null };

export default function AdminMarketing() {
  const calendar = useConsoleQuery<Item[]>('/admin/marketing/calendar', 'Could not load the marketing calendar');
  const campaigns = useConsoleQuery<Campaign[]>('/admin/marketing/campaigns', 'Could not load campaigns');
  const promos = useConsoleQuery<Promo[]>('/admin/promo-codes', 'Could not load promo codes');
  const [formError, setFormError] = useState('');
  const [tab, setTab] = useState('calendar');
  const items = calendar.data ?? [];
  const campaignRows = campaigns.data ?? [];
  const promoRows = promos.data ?? [];

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

  async function addPromo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    const form = new FormData(e.currentTarget);
    const type = String(form.get('type'));
    const raw = Number(form.get('value'));
    const value = type === 'PERCENT' ? Math.round(raw * 100) : Math.round(raw * 100);
    const res = await fetch(`${API}/admin/promo-codes`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.get('code'),
        type,
        value,
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not create this promo code.'));
      return;
    }
    e.currentTarget.reset();
    promos.reload();
  }

  async function togglePromo(promo: Promo) {
    setFormError('');
    const res = await fetch(`${API}/admin/promo-codes/${promo.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !promo.active }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not update this promo code.'));
      return;
    }
    promos.reload();
  }

  return (
    <div>
      <PageHeader title="Marketing" description="Campaigns, promo codes, and captions. Publish TikTok and Instagram yourself or via Buffer later." />
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
            { id: 'promos', label: 'Promo codes' },
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
      {tab === 'promos' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <Panel title="Add promo code">
            <form onSubmit={(e) => void addPromo(e)} className="space-y-3">
              <Field label="Code">
                <input name="code" required className={fieldClass} />
              </Field>
              <Field label="Type">
                <Select
                  name="type"
                  defaultValue="PERCENT"
                  options={[
                    { value: 'PERCENT', label: 'Percent' },
                    { value: 'FIXED', label: 'Fixed EUR' },
                  ]}
                />
              </Field>
              <Field label="Value">
                <input name="value" required inputMode="decimal" className={fieldClass} placeholder="10 for 10% or €10" />
              </Field>
              <PrimaryButton type="submit">Add code</PrimaryButton>
            </form>
          </Panel>
          <ConsoleSection
            loading={promos.loading}
            error={promos.error}
            onRetry={promos.reload}
            empty={promoRows.length === 0}
            emptyTitle="No promo codes"
            emptyBody="Add a code to discount checkout."
          >
            <DataTable headers={['Code', 'Offer', 'Uses', '']}>
              {promoRows.map((row) => (
                <tr key={row.id} className="hover:bg-ink/5">
                  <Td>{row.code}</Td>
                  <Td muted>
                    {row.type === 'PERCENT' ? `${(row.value / 100).toFixed(0)}%` : formatEur(row.value)}
                  </Td>
                  <Td muted>
                    {row.usedCount}
                    {row.maxUses ? ` / ${row.maxUses}` : ''}
                  </Td>
                  <Td>
                    <SecondaryButton type="button" onClick={() => void togglePromo(row)}>
                      {row.active ? 'Deactivate' : 'Activate'}
                    </SecondaryButton>
                  </Td>
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
