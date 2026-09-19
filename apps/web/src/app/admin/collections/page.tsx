'use client';

import { FormEvent, useState } from 'react';
import { CAMPAIGN_SEASONS } from '@motive-fashion/config';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  IconButton,
  JobCard,
  Modal,
  PrimaryButton,
  RowActions,
  SecondaryButton,
  Select,
  Td,
  Toggle,
  fieldClass,
} from '@/components/dashboard-ui';
import { hasPerm } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';

type CollectionRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  season: string;
  published: boolean;
  inNav: boolean;
  sortOrder: number;
  bannerPath: string | null;
  _count?: { products: number };
};

const SEASONS = CAMPAIGN_SEASONS.map((row) => ({ value: row.value, label: row.label }));

export default function AdminCollections() {
  const { me } = useSession();
  const canWrite = hasPerm(me, 'catalog.write');
  const { data, error, loading, reload } = useConsoleQuery<CollectionRow[]>(
    '/admin/collections',
    'Could not load collections',
  );
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CollectionRow | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = data ?? [];

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/collections`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFromForm(form)),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not add this collection.'));
      return;
    }
    setCreating(false);
    reload();
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setFormError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/collections/${editing.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFromForm(form)),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not update this collection.'));
      return;
    }
    setEditing(null);
    reload();
  }

  async function patch(row: CollectionRow, body: Partial<Pick<CollectionRow, 'published' | 'inNav'>>) {
    setFormError('');
    const res = await fetch(`${API}/admin/collections/${row.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not update this collection.'));
      return;
    }
    reload();
  }

  async function remove(row: CollectionRow) {
    if (!window.confirm(`Delete ${row.name}? Styles stay in the catalog.`)) return;
    setFormError('');
    const res = await fetch(`${API}/admin/collections/${row.id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not delete this collection.'));
      return;
    }
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Collections"
        description="Publish Eid, Ramadan, Winter, Spring, or any house edit. Unpublished collections stay off the shop. Featured is the homepage hero button."
        actions={
          canWrite ? (
            <PrimaryButton
              type="button"
              onClick={() => {
                setFormError('');
                setCreating(true);
              }}
            >
              Add collection
            </PrimaryButton>
          ) : null
        }
      />
      {formError ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="No collections"
        emptyBody="Add Spring, Summer, or a named edit, then publish it when the season opens."
      >
        <DataTable
          headers={['Name', 'Season', 'Live', 'Featured', 'Action']}
          cards={rows.map((row) => (
            <JobCard
              key={row.id}
              title={row.name}
              meta={`${seasonLabel(row.season)} · ${row._count?.products ?? 0} styles`}
              actions={
                canWrite ? (
                  <RowActions>
                    <IconButton
                      label="Edit collection"
                      icon="edit"
                      onClick={() => {
                        setFormError('');
                        setEditing(row);
                      }}
                    />
                  </RowActions>
                ) : null
              }
            >
              <div className="mt-3 flex flex-wrap gap-4">
                {canWrite ? (
                  <>
                    <Toggle
                      checked={row.published}
                      onChange={(next) => void patch(row, { published: next })}
                      label={row.published ? 'Published' : 'Unpublished'}
                    />
                    <Toggle
                      checked={row.inNav}
                      onChange={(next) => void patch(row, { inNav: next })}
                      label="Featured"
                    />
                  </>
                ) : (
                  <p className="text-sm text-ink/70">{row.published ? 'Published' : 'Unpublished'}</p>
                )}
              </div>
            </JobCard>
          ))}
        >
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-ink/5">
              <Td>
                {row.name}
                <span className="mt-1 block font-mono text-xs text-ink/45">/{row.slug}</span>
              </Td>
              <Td muted>{seasonLabel(row.season)}</Td>
              <Td nowrap>
                {canWrite ? (
                  <Toggle
                    checked={row.published}
                    onChange={(next) => void patch(row, { published: next })}
                    label={row.published ? 'Unpublish collection' : 'Publish collection'}
                    showLabel={false}
                  />
                ) : (
                  row.published ? 'Yes' : 'No'
                )}
              </Td>
              <Td nowrap>
                {canWrite ? (
                  <Toggle
                    checked={row.inNav}
                    onChange={(next) => void patch(row, { inNav: next })}
                    label={row.inNav ? 'Stop featuring on homepage' : 'Feature on homepage'}
                    showLabel={false}
                  />
                ) : (
                  row.inNav ? 'Yes' : 'No'
                )}
              </Td>
              <Td nowrap>
                {canWrite ? (
                  <RowActions>
                    <IconButton
                      label="Edit collection"
                      icon="edit"
                      onClick={() => {
                        setFormError('');
                        setEditing(row);
                      }}
                    />
                    <IconButton label="Delete collection" icon="trash" tone="danger" onClick={() => void remove(row)} />
                  </RowActions>
                ) : null}
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
      {creating ? (
        <Modal title="Add collection" onClose={() => setCreating(false)}>
          <form className="space-y-4" onSubmit={(e) => void create(e)}>
            <CollectionFields />
            <div className="flex justify-end gap-2">
              <SecondaryButton type="button" onClick={() => setCreating(false)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={busy}>
                Save
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
      {editing ? (
        <Modal title={`Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <form className="space-y-4" onSubmit={(e) => void save(e)}>
            <CollectionFields row={editing} />
            <div className="flex justify-end gap-2">
              <SecondaryButton type="button" onClick={() => setEditing(null)}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={busy}>
                Save
              </PrimaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function CollectionFields({ row }: { row?: CollectionRow }) {
  const [published, setPublished] = useState(row?.published ?? false);
  const [inNav, setInNav] = useState(row?.inNav ?? false);
  return (
    <>
      <Field label="Name">
        <input className={fieldClass} name="name" defaultValue={row?.name} required />
      </Field>
      <Field label="Slug" hint="Leave blank on create to build it from the name.">
        <input className={fieldClass} name="slug" defaultValue={row?.slug} placeholder="spring" />
      </Field>
      <Field label="Description">
        <textarea className={fieldClass} name="description" rows={3} defaultValue={row?.description ?? ''} />
      </Field>
      <Field label="Season">
        <Select name="season" defaultValue={row?.season ?? 'EVERYDAY'} options={SEASONS} />
      </Field>
      <Field label="Sort order">
        <input className={fieldClass} name="sortOrder" type="number" min={0} max={999} defaultValue={row?.sortOrder ?? 0} />
      </Field>
      <Field label="Banner path" hint="Optional. Example: /brand/banner-eid.jpg">
        <input className={fieldClass} name="bannerPath" defaultValue={row?.bannerPath ?? ''} />
      </Field>
      <Toggle name="published" checked={published} onChange={setPublished} label="Published on the shop" />
      <Toggle name="inNav" checked={inNav} onChange={setInNav} label="Feature on the homepage hero" />
    </>
  );
}

function payloadFromForm(form: FormData) {
  const slug = String(form.get('slug') || '').trim();
  const banner = String(form.get('bannerPath') || '').trim();
  return {
    name: form.get('name'),
    ...(slug ? { slug } : {}),
    description: String(form.get('description') || '') || null,
    season: form.get('season'),
    sortOrder: Number(form.get('sortOrder') || 0),
    bannerPath: banner || null,
    published: form.get('published') === 'on',
    inNav: form.get('inNav') === 'on',
  };
}

function seasonLabel(season: string) {
  return CAMPAIGN_SEASONS.find((row) => row.value === season)?.label ?? season;
}
