'use client';

import { FormEvent, useMemo, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  FilterTabs,
  Modal,
  Panel,
  PrimaryButton,
  SecondaryButton,
  Td,
  fieldClass,
  Select,
} from '@/components/dashboard-ui';
import { PROMO_STATUS_LABEL, promoOfferLabel, promoStatus, type PromoStatus } from '@motive-fashion/utils';

type Promo = {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  active: boolean;
  usedCount: number;
  maxUses: number | null;
  startsAt: string | null;
  endsAt: string | null;
};

const STATUS_CLASS: Record<PromoStatus, string> = {
  live: 'bg-emerald-50 text-emerald-800',
  scheduled: 'bg-sky-50 text-sky-800',
  expired: 'bg-ink/5 text-ink/60',
  exhausted: 'bg-amber-50 text-amber-800',
  inactive: 'bg-ink/5 text-ink/55',
};

function toIso(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function storedValue(raw: number) {
  return Math.round(raw * 100);
}

function humanValue(value: number) {
  return value / 100;
}

function windowLabel(row: Promo) {
  if (!row.startsAt && !row.endsAt) return 'Always';
  const start = row.startsAt ? new Date(row.startsAt).toLocaleString('en-IE', { hour12: false }) : 'Now';
  const end = row.endsAt ? new Date(row.endsAt).toLocaleString('en-IE', { hour12: false }) : 'Open';
  return `${start} → ${end}`;
}

export default function AdminCoupons() {
  const promos = useConsoleQuery<Promo[]>('/admin/promo-codes', 'Could not load coupons');
  const [formError, setFormError] = useState('');
  const [tab, setTab] = useState('ALL');
  const [createType, setCreateType] = useState('PERCENT');
  const [editing, setEditing] = useState<Promo | null>(null);
  const [editType, setEditType] = useState('PERCENT');
  const rows = promos.data ?? [];

  const visible = useMemo(() => {
    return rows.filter((row) => {
      const status = promoStatus(row);
      if (tab === 'ALL') return true;
      if (tab === 'ENDED') return status === 'expired' || status === 'exhausted';
      return status === tab;
    });
  }, [rows, tab]);

  async function addPromo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    const form = new FormData(e.currentTarget);
    const type = String(form.get('type'));
    const raw = Number(form.get('value'));
    const maxRaw = String(form.get('maxUses') ?? '').trim();
    const res = await fetch(`${API}/admin/promo-codes`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.get('code'),
        type,
        value: storedValue(raw),
        active: form.get('active') === 'on',
        maxUses: maxRaw ? Number(maxRaw) : null,
        startsAt: toIso(form.get('startsAt')),
        endsAt: toIso(form.get('endsAt')),
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not create this coupon.'));
      return;
    }
    e.currentTarget.reset();
    setCreateType('PERCENT');
    promos.reload();
  }

  async function savePromo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setFormError('');
    const form = new FormData(e.currentTarget);
    const type = String(form.get('type'));
    const raw = Number(form.get('value'));
    const maxRaw = String(form.get('maxUses') ?? '').trim();
    const res = await fetch(`${API}/admin/promo-codes/${editing.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        value: storedValue(raw),
        active: form.get('active') === 'on',
        maxUses: maxRaw ? Number(maxRaw) : null,
        startsAt: toIso(form.get('startsAt')),
        endsAt: toIso(form.get('endsAt')),
      }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not update this coupon.'));
      return;
    }
    setEditing(null);
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
      setFormError(apiErrorMessage(payload, 'Could not update this coupon.'));
      return;
    }
    promos.reload();
  }

  return (
    <div>
      <PageHeader
        title="Coupons"
        description="Checkout and till codes. Percent is off the goods subtotal; a start/end and a use cap are optional."
      />
      {formError ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Panel title="New coupon">
          <form onSubmit={(e) => void addPromo(e)} className="space-y-3">
            <Field label="Code">
              <input name="code" required minLength={2} maxLength={40} className={fieldClass} placeholder="EID10" />
            </Field>
            <Field label="Type">
              <Select
                name="type"
                value={createType}
                onChange={setCreateType}
                options={[
                  { value: 'PERCENT', label: 'Percent off' },
                  { value: 'FIXED', label: 'Fixed EUR off' },
                ]}
              />
            </Field>
            <Field label={createType === 'PERCENT' ? 'Percent' : 'Amount (EUR)'}>
              <input
                name="value"
                required
                inputMode="decimal"
                min={createType === 'PERCENT' ? 0.01 : 0.01}
                max={createType === 'PERCENT' ? 100 : undefined}
                step="0.01"
                className={fieldClass}
                placeholder={createType === 'PERCENT' ? '10 for 10%' : '10 for €10'}
              />
            </Field>
            <Field label="Max uses">
              <input name="maxUses" inputMode="numeric" min={1} className={fieldClass} placeholder="Unlimited" />
            </Field>
            <Field label="Starts">
              <input name="startsAt" type="datetime-local" className={fieldClass} />
            </Field>
            <Field label="Ends">
              <input name="endsAt" type="datetime-local" className={fieldClass} />
            </Field>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input name="active" type="checkbox" defaultChecked className="h-4 w-4 accent-ink" />
              Live when the window opens
            </label>
            <PrimaryButton type="submit">Create coupon</PrimaryButton>
          </form>
        </Panel>
        <div>
          <div className="mb-4">
            <FilterTabs
              ariaLabel="Coupon status"
              current={tab}
              onChange={setTab}
              items={[
                { id: 'ALL', label: 'All' },
                { id: 'live', label: 'Live' },
                { id: 'scheduled', label: 'Scheduled' },
                { id: 'ENDED', label: 'Ended' },
                { id: 'inactive', label: 'Off' },
              ]}
            />
          </div>
          <ConsoleSection
            loading={promos.loading}
            error={promos.error}
            onRetry={promos.reload}
            empty={visible.length === 0}
            emptyTitle={tab === 'ALL' ? 'No coupons' : 'No coupons in this filter'}
            emptyBody="Create a code with an optional start, end, and use cap."
          >
            <DataTable headers={['Code', 'Offer', 'Window', 'Uses', 'Status', '']}>
              {visible.map((row) => {
                const status = promoStatus(row);
                return (
                  <tr key={row.id} className="hover:bg-ink/5">
                    <Td>
                      <span className="font-mono text-xs tracking-wide">{row.code}</span>
                    </Td>
                    <Td muted>{promoOfferLabel(row.type, row.value)}</Td>
                    <Td muted>{windowLabel(row)}</Td>
                    <Td muted>
                      {row.usedCount}
                      {row.maxUses ? ` / ${row.maxUses}` : ' / ∞'}
                    </Td>
                    <Td>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[status]}`}>
                        {PROMO_STATUS_LABEL[status]}
                      </span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <SecondaryButton
                          type="button"
                          onClick={() => {
                            setEditing(row);
                            setEditType(row.type);
                          }}
                        >
                          Edit
                        </SecondaryButton>
                        <SecondaryButton type="button" onClick={() => void togglePromo(row)}>
                          {row.active ? 'Turn off' : 'Turn on'}
                        </SecondaryButton>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </DataTable>
          </ConsoleSection>
        </div>
      </div>
      {editing ? (
        <Modal title={`Edit ${editing.code}`} onClose={() => setEditing(null)}>
          <form key={editing.id} onSubmit={(e) => void savePromo(e)} className="space-y-3">
            <Field label="Type">
              <Select
                name="type"
                value={editType}
                onChange={setEditType}
                options={[
                  { value: 'PERCENT', label: 'Percent off' },
                  { value: 'FIXED', label: 'Fixed EUR off' },
                ]}
              />
            </Field>
            <Field label={editType === 'PERCENT' ? 'Percent' : 'Amount (EUR)'}>
              <input
                name="value"
                required
                inputMode="decimal"
                min={0.01}
                max={editType === 'PERCENT' ? 100 : undefined}
                step="0.01"
                defaultValue={humanValue(editing.value)}
                className={fieldClass}
              />
            </Field>
            <Field label="Max uses">
              <input
                name="maxUses"
                inputMode="numeric"
                min={1}
                defaultValue={editing.maxUses ?? ''}
                className={fieldClass}
                placeholder="Unlimited"
              />
            </Field>
            <Field label="Starts">
              <input name="startsAt" type="datetime-local" defaultValue={toLocalInput(editing.startsAt)} className={fieldClass} />
            </Field>
            <Field label="Ends">
              <input name="endsAt" type="datetime-local" defaultValue={toLocalInput(editing.endsAt)} className={fieldClass} />
            </Field>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input name="active" type="checkbox" defaultChecked={editing.active} className="h-4 w-4 accent-ink" />
              Switched on
            </label>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="submit">Save</PrimaryButton>
              <SecondaryButton type="button" onClick={() => setEditing(null)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
