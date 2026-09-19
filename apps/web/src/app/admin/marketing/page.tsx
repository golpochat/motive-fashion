'use client';

import { FormEvent, useMemo, useState } from 'react';
import { CAMPAIGN_SEASONS } from '@motive-fashion/config';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  FilterTabs,
  IconButton,
  JobCard,
  Modal,
  PrimaryButton,
  RowActions,
  SecondaryButton,
  Td,
  fieldClass,
  Select,
} from '@/components/dashboard-ui';

type Item = {
  id: string;
  channel: string;
  caption: string;
  publishOn: string;
  published?: boolean;
  campaignId?: string | null;
  campaign?: { id: string; name: string; landingSlug?: string | null } | null;
};
type Campaign = {
  id: string;
  name: string;
  season: string;
  audience: string | null;
  landingSlug?: string | null;
  promoCodeId?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};
type Promo = { id: string; code: string; active: boolean };

const SEASONS = CAMPAIGN_SEASONS.map((row) => ({ value: row.value, label: row.label }));

const CHANNELS = [
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
];

function localInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function itemStatus(item: Item, now: number) {
  if (item.published) return 'POSTED';
  if (new Date(item.publishOn).getTime() < now) return 'OVERDUE';
  return 'UPCOMING';
}

export default function AdminMarketing() {
  const calendar = useConsoleQuery<Item[]>('/admin/marketing/calendar', 'Could not load the marketing calendar');
  const campaigns = useConsoleQuery<Campaign[]>('/admin/marketing/campaigns', 'Could not load campaigns');
  const promos = useConsoleQuery<Promo[]>('/admin/promo-codes', 'Could not load coupons');
  const [formError, setFormError] = useState('');
  const [tab, setTab] = useState('calendar');
  const [statusTab, setStatusTab] = useState('DUE');
  const [creating, setCreating] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const items = calendar.data ?? [];
  const campaignRows = campaigns.data ?? [];
  const promoRows = promos.data ?? [];
  const now = Date.now();
  const dueSoon = useMemo(() => {
    const week = now + 7 * 86_400_000;
    return items.filter((item) => !item.published && new Date(item.publishOn).getTime() <= week);
  }, [items, now]);
  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      const status = itemStatus(item, now);
      if (statusTab === 'DUE') return status === 'OVERDUE' || status === 'UPCOMING';
      if (statusTab === 'POSTED') return status === 'POSTED';
      return true;
    });
  }, [items, now, statusTab]);

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
        campaignId: String(form.get('campaignId') || '') || undefined,
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not add this item.'));
      return;
    }
    setCreating(false);
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
        landingSlug: String(form.get('landingSlug') || '') || undefined,
        promoCodeId: String(form.get('promoCodeId') || '') || undefined,
        startsAt: String(form.get('startsAt') || '') || undefined,
        endsAt: String(form.get('endsAt') || '') || undefined,
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not create this campaign.'));
      return;
    }
    setCreating(false);
    campaigns.reload();
  }

  async function saveCampaign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editCampaign) return;
    setFormError('');
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/marketing/campaigns/${editCampaign.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        season: form.get('season'),
        audience: String(form.get('audience') || '') || null,
        landingSlug: String(form.get('landingSlug') || ''),
        promoCodeId: String(form.get('promoCodeId') || '') || null,
        startsAt: String(form.get('startsAt') || '') || null,
        endsAt: String(form.get('endsAt') || '') || null,
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not save this campaign.'));
      return;
    }
    setEditCampaign(null);
    campaigns.reload();
  }

  async function saveItem(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editItem) return;
    setFormError('');
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/marketing/calendar/${editItem.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: form.get('channel'),
        caption: form.get('caption'),
        publishOn: form.get('publishOn'),
        campaignId: String(form.get('campaignId') || '') || undefined,
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not save this item.'));
      return;
    }
    setEditItem(null);
    calendar.reload();
  }

  async function removeCampaign(id: string) {
    setFormError('');
    const res = await fetch(`${API}/admin/marketing/campaigns/${id}`, { method: 'DELETE', credentials: 'include' });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not delete this campaign.'));
      return;
    }
    campaigns.reload();
  }

  async function removeItem(id: string) {
    setFormError('');
    const res = await fetch(`${API}/admin/marketing/calendar/${id}`, { method: 'DELETE', credentials: 'include' });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not delete this item.'));
      return;
    }
    calendar.reload();
  }

  async function markPosted(item: Item, published: boolean) {
    setFormError('');
    const res = await fetch(`${API}/admin/marketing/calendar/${item.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not update this item.'));
      return;
    }
    calendar.reload();
  }

  async function copyCaption(caption: string) {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      setFormError('Could not copy that caption.');
    }
  }

  async function exportCsv() {
    const res = await fetch(`${API}/admin/marketing/calendar/export`, { credentials: 'include' });
    if (!res.ok) {
      setFormError('Could not export the calendar.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marketing-calendar.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function promoLabel(id?: string | null) {
    return promoRows.find((row) => row.id === id)?.code ?? '—';
  }

  const promoOptions = [
    { value: '', label: 'No coupon' },
    ...promoRows.map((row) => ({ value: row.id, label: row.active ? row.code : `${row.code} (off)` })),
  ];

  return (
    <div>
      <PageHeader
        title="Marketing"
        description="Plan captions and seasons here. Discount codes live under Coupons. This is not a social publisher."
        actions={
          <>
            {tab === 'calendar' ? (
              <SecondaryButton type="button" onClick={() => void exportCsv()}>
                Export CSV
              </SecondaryButton>
            ) : null}
            <PrimaryButton
              type="button"
              onClick={() => {
                setFormError('');
                setCreating(true);
              }}
            >
              {tab === 'campaigns' ? 'Add campaign' : 'Add calendar item'}
            </PrimaryButton>
          </>
        }
      />
      {formError && !creating && !editCampaign && !editItem ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}
      {dueSoon.length && tab === 'calendar' ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {dueSoon.length} caption{dueSoon.length === 1 ? '' : 's'} due in the next 7 days or overdue. Copy, post off-platform, then mark posted.
        </p>
      ) : null}
      <div className="mb-6">
        <FilterTabs
          ariaLabel="Marketing"
          current={tab}
          onChange={(id) => {
            setTab(id);
            setCreating(false);
          }}
          items={[
            { id: 'calendar', label: 'Calendar' },
            { id: 'campaigns', label: 'Campaigns' },
          ]}
        />
      </div>
      {tab === 'campaigns' ? (
        <ConsoleSection
          loading={campaigns.loading}
          error={campaigns.error}
          onRetry={campaigns.reload}
          empty={campaignRows.length === 0}
          emptyTitle="No campaigns"
          emptyBody="Add a season campaign to group calendar captions."
        >
          <DataTable
            headers={['Name', 'Season', 'Landing', 'Coupon', 'Window', 'Action']}
            cards={campaignRows.map((row) => (
              <JobCard
                key={row.id}
                title={row.name}
                meta={`${row.season}${row.landingSlug ? ` · /${row.landingSlug}` : ''}${row.promoCodeId ? ` · ${promoLabel(row.promoCodeId)}` : ''}`}
                actions={
                  <RowActions>
                    <IconButton label="Edit campaign" icon="edit" onClick={() => { setFormError(''); setEditCampaign(row); }} />
                    <IconButton label="Delete campaign" icon="trash" onClick={() => void removeCampaign(row.id)} />
                  </RowActions>
                }
              />
            ))}
          >
            {campaignRows.map((row) => (
              <tr key={row.id} className="hover:bg-ink/5">
                <Td>{row.name}</Td>
                <Td muted>{row.season}</Td>
                <Td muted>{row.landingSlug ? `/${row.landingSlug}` : '—'}</Td>
                <Td muted>{promoLabel(row.promoCodeId)}</Td>
                <Td muted>
                  {row.startsAt ? new Date(row.startsAt).toLocaleDateString('en-IE') : '—'}
                  {row.endsAt ? ` – ${new Date(row.endsAt).toLocaleDateString('en-IE')}` : ''}
                </Td>
                <Td nowrap>
                  <RowActions>
                    <IconButton label="Edit campaign" icon="edit" onClick={() => { setFormError(''); setEditCampaign(row); }} />
                    <IconButton label="Delete campaign" icon="trash" onClick={() => void removeCampaign(row.id)} />
                  </RowActions>
                </Td>
              </tr>
            ))}
          </DataTable>
        </ConsoleSection>
      ) : (
        <>
          <div className="mb-6">
            <FilterTabs
              ariaLabel="Calendar status"
              current={statusTab}
              onChange={setStatusTab}
              items={[
                { id: 'DUE', label: 'Due' },
                { id: 'POSTED', label: 'Posted' },
                { id: 'ALL', label: 'All' },
              ]}
            />
          </div>
          <ConsoleSection
            loading={calendar.loading}
            error={calendar.error}
            onRetry={calendar.reload}
            empty={visibleItems.length === 0}
            emptyTitle="No calendar items"
            emptyBody="Add a caption and publish time to plan a post."
          >
            <DataTable
              headers={['Channel', 'When', 'Status', 'Caption', 'Action']}
              cards={visibleItems.map((i) => (
                <JobCard
                  key={i.id}
                  title={i.channel}
                  meta={`${new Date(i.publishOn).toLocaleString('en-IE')} · ${itemStatus(i, now)}${i.campaign?.name ? ` · ${i.campaign.name}` : ''}`}
                  actions={
                    <RowActions>
                      <IconButton label="Copy caption" icon="copy" onClick={() => void copyCaption(i.caption)} />
                      {i.published ? (
                        <IconButton label="Mark unposted" icon="x" onClick={() => void markPosted(i, false)} />
                      ) : (
                        <IconButton label="Mark posted" icon="check" tone="success" onClick={() => void markPosted(i, true)} />
                      )}
                      <IconButton label="Edit item" icon="edit" onClick={() => { setFormError(''); setEditItem(i); }} />
                      <IconButton label="Delete item" icon="trash" onClick={() => void removeItem(i.id)} />
                    </RowActions>
                  }
                >
                  <p className="mt-2 line-clamp-3 text-sm">{i.caption}</p>
                </JobCard>
              ))}
            >
              {visibleItems.map((i) => (
                <tr key={i.id} className="hover:bg-ink/5">
                  <Td>
                    {i.channel}
                    {i.campaign?.name ? <span className="mt-1 block text-xs text-ink/45">{i.campaign.name}</span> : null}
                  </Td>
                  <Td muted>{new Date(i.publishOn).toLocaleString('en-IE')}</Td>
                  <Td muted>{itemStatus(i, now)}</Td>
                  <Td>{i.caption}</Td>
                  <Td nowrap>
                    <RowActions>
                      <IconButton label="Copy caption" icon="copy" onClick={() => void copyCaption(i.caption)} />
                      {i.published ? (
                        <IconButton label="Mark unposted" icon="x" onClick={() => void markPosted(i, false)} />
                      ) : (
                        <IconButton label="Mark posted" icon="check" tone="success" onClick={() => void markPosted(i, true)} />
                      )}
                      <IconButton label="Edit item" icon="edit" onClick={() => { setFormError(''); setEditItem(i); }} />
                      <IconButton label="Delete item" icon="trash" onClick={() => void removeItem(i.id)} />
                    </RowActions>
                  </Td>
                </tr>
              ))}
            </DataTable>
          </ConsoleSection>
        </>
      )}
      {creating && tab === 'campaigns' ? (
        <Modal title="Add campaign" onClose={() => setCreating(false)}>
          {formError ? <p className="mb-3 text-sm text-red-700" role="alert">{formError}</p> : null}
          <form onSubmit={(e) => void addCampaign(e)} className="space-y-3">
            <Field label="Name">
              <input name="name" required className={fieldClass} />
            </Field>
            <Field label="Season">
              <Select name="season" defaultValue="EVERYDAY" options={SEASONS} />
            </Field>
            <Field label="Audience">
              <input name="audience" className={fieldClass} />
            </Field>
            <Field label="Landing slug" hint="Shop path without slash, e.g. ramadan">
              <input name="landingSlug" className={fieldClass} />
            </Field>
            <Field label="Coupon">
              <Select name="promoCodeId" options={promoOptions} />
            </Field>
            <Field label="Starts">
              <input name="startsAt" type="datetime-local" className={fieldClass} />
            </Field>
            <Field label="Ends">
              <input name="endsAt" type="datetime-local" className={fieldClass} />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="submit">Add campaign</PrimaryButton>
              <SecondaryButton type="button" onClick={() => setCreating(false)}>Cancel</SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
      {creating && tab === 'calendar' ? (
        <Modal title="Add calendar item" onClose={() => setCreating(false)}>
          {formError ? <p className="mb-3 text-sm text-red-700" role="alert">{formError}</p> : null}
          <form onSubmit={(e) => void addCalendar(e)} className="space-y-3">
            <Field label="Channel">
              <Select name="channel" defaultValue="INSTAGRAM" options={CHANNELS} />
            </Field>
            <Field label="Campaign">
              <Select
                name="campaignId"
                options={[{ value: '', label: 'None' }, ...campaignRows.map((row) => ({ value: row.id, label: row.name }))]}
              />
            </Field>
            <Field label="Caption">
              <textarea name="caption" required className={fieldClass} />
            </Field>
            <Field label="Publish on">
              <input name="publishOn" type="datetime-local" required className={fieldClass} />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="submit">Add item</PrimaryButton>
              <SecondaryButton type="button" onClick={() => setCreating(false)}>Cancel</SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
      {editCampaign ? (
        <Modal title="Edit campaign" onClose={() => setEditCampaign(null)}>
          {formError ? <p className="mb-3 text-sm text-red-700" role="alert">{formError}</p> : null}
          <form onSubmit={(e) => void saveCampaign(e)} className="space-y-3">
            <Field label="Name">
              <input name="name" required defaultValue={editCampaign.name} className={fieldClass} />
            </Field>
            <Field label="Season">
              <Select name="season" defaultValue={editCampaign.season} options={SEASONS} />
            </Field>
            <Field label="Audience">
              <input name="audience" defaultValue={editCampaign.audience ?? ''} className={fieldClass} />
            </Field>
            <Field label="Landing slug" hint="Shop path without slash, e.g. ramadan">
              <input name="landingSlug" defaultValue={editCampaign.landingSlug ?? ''} className={fieldClass} />
            </Field>
            <Field label="Coupon">
              <Select name="promoCodeId" defaultValue={editCampaign.promoCodeId ?? ''} options={promoOptions} />
            </Field>
            <Field label="Starts">
              <input name="startsAt" type="datetime-local" defaultValue={localInput(editCampaign.startsAt)} className={fieldClass} />
            </Field>
            <Field label="Ends">
              <input name="endsAt" type="datetime-local" defaultValue={localInput(editCampaign.endsAt)} className={fieldClass} />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="submit">Save</PrimaryButton>
              <SecondaryButton type="button" onClick={() => setEditCampaign(null)}>Cancel</SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
      {editItem ? (
        <Modal title="Edit calendar item" onClose={() => setEditItem(null)}>
          {formError ? <p className="mb-3 text-sm text-red-700" role="alert">{formError}</p> : null}
          <form onSubmit={(e) => void saveItem(e)} className="space-y-3">
            <Field label="Channel">
              <Select name="channel" defaultValue={editItem.channel} options={CHANNELS} />
            </Field>
            <Field label="Campaign">
              <Select
                name="campaignId"
                defaultValue={editItem.campaignId ?? ''}
                options={[{ value: '', label: 'None' }, ...campaignRows.map((row) => ({ value: row.id, label: row.name }))]}
              />
            </Field>
            <Field label="Caption">
              <textarea name="caption" required defaultValue={editItem.caption} className={fieldClass} />
            </Field>
            <Field label="Publish on">
              <input name="publishOn" type="datetime-local" required defaultValue={localInput(editItem.publishOn)} className={fieldClass} />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="submit">Save</PrimaryButton>
              <SecondaryButton type="button" onClick={() => setEditItem(null)}>Cancel</SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
