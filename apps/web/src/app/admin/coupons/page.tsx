'use client';

import { FormEvent, useMemo, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  FilterTabs,
  IconButton,
  Modal,
  PrimaryButton,
  RowActions,
  SecondaryButton,
  Select,
  StatusBadge,
  Td,
  Toggle,
  fieldClass,
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

const STATUS_TONE: Record<PromoStatus, 'live' | 'muted' | 'warn' | 'info'> = {
  live: 'live',
  scheduled: 'info',
  expired: 'muted',
  exhausted: 'warn',
  inactive: 'muted',
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
  const [draft, setDraft] = useState<Promo | 'new' | null>(null);
  const [offerType, setOfferType] = useState('PERCENT');
  const [live, setLive] = useState(true);
  const rows = promos.data ?? [];
  const editing = draft && draft !== 'new' ? draft : null;

  const visible = useMemo(() => {
    return rows.filter((row) => {
      const status = promoStatus(row);
      if (tab === 'ALL') return true;
      if (tab === 'ENDED') return status === 'expired' || status === 'exhausted';
      return status === tab;
    });
  }, [rows, tab]);

  function openCreate() {
    setFormError('');
    setOfferType('PERCENT');
    setLive(true);
    setDraft('new');
  }

  function openEdit(row: Promo) {
    setFormError('');
    setOfferType(row.type);
    setLive(row.active);
    setDraft(row);
  }

  async function savePromo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    const form = new FormData(e.currentTarget);
    const type = String(form.get('type'));
    const raw = Number(form.get('value'));
    const maxRaw = String(form.get('maxUses') ?? '').trim();
    const body = {
      type,
      value: storedValue(raw),
      active: live,
      maxUses: maxRaw ? Number(maxRaw) : null,
      startsAt: toIso(form.get('startsAt')),
      endsAt: toIso(form.get('endsAt')),
    };
    const res = await fetch(editing ? `${API}/admin/promo-codes/${editing.id}` : `${API}/admin/promo-codes`, {
      method: editing ? 'PATCH' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing ? body : { ...body, code: form.get('code') }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, editing ? 'Could not update this coupon.' : 'Could not create this coupon.'));
      return;
    }
    setDraft(null);
    promos.reload();
  }

  async function togglePromo(promo: Promo, active: boolean) {
    setFormError('');
    const res = await fetch(`${API}/admin/promo-codes/${promo.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
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
        actions={
          <PrimaryButton type="button" onClick={openCreate}>
            Add coupon
          </PrimaryButton>
        }
      />
      {formError && !draft ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}
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
        emptyBody="Add a code with an optional start, end, and use cap."
      >
        <DataTable headers={['Code', 'Offer', 'Window', 'Uses', 'Status', 'Published', 'Action']}>
          {visible.map((row) => {
            const status = promoStatus({ ...row, active: true });
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
                  <StatusBadge tone={STATUS_TONE[status]}>{PROMO_STATUS_LABEL[status]}</StatusBadge>
                </Td>
                <Td nowrap>
                  <Toggle
                    checked={row.active}
                    onChange={(next) => void togglePromo(row, next)}
                    label={row.active ? 'Unpublish coupon' : 'Publish coupon'}
                    showLabel={false}
                  />
                </Td>
                <Td nowrap>
                  <RowActions>
                    <IconButton label="Edit coupon" icon="edit" onClick={() => openEdit(row)} />
                  </RowActions>
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </ConsoleSection>
      {draft ? (
        <Modal title={editing ? `Edit ${editing.code}` : 'Add coupon'} onClose={() => setDraft(null)}>
          {formError ? (
            <p className="mb-3 text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
          <form key={editing?.id ?? 'new'} onSubmit={(e) => void savePromo(e)} className="space-y-3">
            {editing ? null : (
              <Field label="Code">
                <input name="code" required minLength={2} maxLength={40} className={fieldClass} placeholder="EID10" />
              </Field>
            )}
            <Field label="Type">
              <Select
                name="type"
                value={offerType}
                onChange={setOfferType}
                options={[
                  { value: 'PERCENT', label: 'Percent off' },
                  { value: 'FIXED', label: 'Fixed EUR off' },
                ]}
              />
            </Field>
            <Field label={offerType === 'PERCENT' ? 'Percent' : 'Amount (EUR)'}>
              <input
                name="value"
                required
                inputMode="decimal"
                min={0.01}
                max={offerType === 'PERCENT' ? 100 : undefined}
                step="0.01"
                defaultValue={editing ? humanValue(editing.value) : undefined}
                className={fieldClass}
                placeholder={offerType === 'PERCENT' ? '10 for 10%' : '10 for €10'}
              />
            </Field>
            <Field label="Max uses">
              <input
                name="maxUses"
                inputMode="numeric"
                min={1}
                defaultValue={editing?.maxUses ?? ''}
                className={fieldClass}
                placeholder="Unlimited"
              />
            </Field>
            <Field label="Starts">
              <input name="startsAt" type="datetime-local" defaultValue={toLocalInput(editing?.startsAt)} className={fieldClass} />
            </Field>
            <Field label="Ends">
              <input name="endsAt" type="datetime-local" defaultValue={toLocalInput(editing?.endsAt)} className={fieldClass} />
            </Field>
            <Toggle
              checked={live}
              onChange={setLive}
              label={live ? 'Published' : 'Unpublished'}
            />
            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="submit">{editing ? 'Save' : 'Create coupon'}</PrimaryButton>
              <SecondaryButton type="button" onClick={() => setDraft(null)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
