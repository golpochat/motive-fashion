'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  Modal,
  PrimaryButton,
  SecondaryButton,
  Select,
  Td,
  fieldClass,
} from '@/components/dashboard-ui';
import { formatEur } from '@motive-fashion/utils';
import { hasPerm } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';

type Category = { id: string; name: string; slug: string };
type Variant = { id: string; sku: string; size: string; color: string; priceCents: number; active: boolean };
type ProductImage = { id: string; url: string; alt: string };
type Product = {
  id: string;
  title: string;
  slug: string;
  description: string;
  published: boolean;
  categoryId: string;
  category?: { name: string };
  variants: Variant[];
  images?: ProductImage[];
};

function eurosToCents(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export default function AdminProducts() {
  const { me } = useSession();
  const canWrite = hasPerm(me, 'catalog.write');
  const { data, error, loading, reload } = useConsoleQuery<Product[]>('/admin/products', 'Could not load products');
  const cats = useConsoleQuery<Category[]>('/catalog/categories', 'Could not load categories');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [variantFor, setVariantFor] = useState<Product | null>(null);
  const [photosFor, setPhotosFor] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = data ?? [];
  const categories = cats.data ?? [];
  const photoProduct = photosFor ? (rows.find((row) => row.id === photosFor.id) ?? photosFor) : null;

  async function createProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/products`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        description: form.get('description'),
        categoryId: form.get('categoryId'),
        occasion: String(form.get('occasion') || '') || undefined,
      }),
    });
    const product = (await res.json().catch(() => null)) as Product | { message?: string };
    if (!res.ok) {
      setBusy(false);
      setFormError(apiErrorMessage(product, 'Could not create this product.'));
      return;
    }
    const sku = String(form.get('sku') || '').trim();
    if (sku && 'id' in product) {
      const variantRes = await fetch(`${API}/admin/products/${product.id}/variants`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku,
          size: form.get('size') || 'OS',
          color: form.get('color') || 'Black',
          costCents: eurosToCents(form.get('cost')),
          priceCents: eurosToCents(form.get('price')),
        }),
      });
      if (!variantRes.ok) {
        const payload = await variantRes.json().catch(() => null);
        setBusy(false);
        setFormError(apiErrorMessage(payload, 'Product saved; the first SKU could not be added.'));
        reload();
        return;
      }
    }
    setBusy(false);
    setCreating(false);
    reload();
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setFormError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/products/${editing.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.get('title'),
        description: form.get('description'),
        published: form.get('published') === 'true',
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not update this product.'));
      return;
    }
    setEditing(null);
    reload();
  }

  async function addVariant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!variantFor) return;
    setFormError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/products/${variantFor.id}/variants`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: form.get('sku'),
        size: form.get('size'),
        color: form.get('color'),
        costCents: eurosToCents(form.get('cost')),
        priceCents: eurosToCents(form.get('price')),
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not add this SKU.'));
      return;
    }
    setVariantFor(null);
    reload();
  }

  async function addPhoto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!photosFor) return;
    setFormError('');
    setBusy(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const res = await fetch(`${API}/admin/products/${photosFor.id}/images`, {
      method: 'POST',
      credentials: 'include',
      body: data,
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not upload this photo.'));
      return;
    }
    form.reset();
    reload();
  }

  async function removePhoto(imageId: string) {
    if (!photosFor) return;
    setFormError('');
    setBusy(true);
    const res = await fetch(`${API}/admin/products/${photosFor.id}/images/${imageId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not remove this photo.'));
      return;
    }
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Create pieces, publish them, and add SKUs. Print hang-tag barcodes from Labels. Stock is adjusted on Inventory."
        actions={
          canWrite ? (
            <PrimaryButton type="button" onClick={() => { setFormError(''); setCreating(true); }}>
              Add product
            </PrimaryButton>
          ) : null
        }
      />
      {formError && !creating && !editing && !variantFor && !photosFor ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="No products"
        emptyBody="Add a product to put it on the Dublin ledger."
      >
        <DataTable headers={['Title', 'Category', 'SKUs', 'Status', '']}>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-ink/5">
              <Td>
                {r.title}
                <span className="mt-1 block text-xs text-ink/45">{r.slug}</span>
              </Td>
              <Td muted>{r.category?.name ?? '—'}</Td>
              <Td>
                {r.variants.length
                  ? r.variants.map((v) => (
                      <span key={v.id} className="block text-xs">
                        {v.sku} · {v.size}/{v.color} · {formatEur(v.priceCents)}
                      </span>
                    ))
                  : 'None'}
              </Td>
              <Td muted>{r.published ? 'Published' : 'Hidden'}</Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/labels?product=${r.id}`}
                    className="inline-flex min-h-11 items-center rounded-lg border border-ink/15 px-3 py-2.5 text-sm no-underline hover:border-ink/40"
                  >
                    Labels
                  </Link>
                  {canWrite ? (
                    <>
                    <SecondaryButton type="button" onClick={() => { setFormError(''); setEditing(r); }}>
                      Edit
                    </SecondaryButton>
                    <SecondaryButton type="button" onClick={() => { setFormError(''); setVariantFor(r); }}>
                      Add SKU
                    </SecondaryButton>
                    <SecondaryButton type="button" onClick={() => { setFormError(''); setPhotosFor(r); }}>
                      Photos
                    </SecondaryButton>
                    </>
                  ) : null}
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>

      {creating ? (
        <Modal title="Add product" onClose={() => setCreating(false)} wide>
          {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
          <form onSubmit={(e) => void createProduct(e)} className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <input name="title" required minLength={2} className={fieldClass} />
            </Field>
            <Field label="Category">
              <Select
                name="categoryId"
                required
                className={fieldClass}
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Category"
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea name="description" required minLength={10} rows={3} className={fieldClass} />
              </Field>
            </div>
            <Field label="Occasion">
              <input name="occasion" className={fieldClass} placeholder="daily, eid…" />
            </Field>
            <Field label="First SKU">
              <input name="sku" className={fieldClass} placeholder="Optional" />
            </Field>
            <Field label="Size">
              <input name="size" defaultValue="OS" className={fieldClass} />
            </Field>
            <Field label="Colour">
              <input name="color" defaultValue="Black" className={fieldClass} />
            </Field>
            <Field label="Cost EUR">
              <input name="cost" defaultValue="0.00" inputMode="decimal" className={fieldClass} />
            </Field>
            <Field label="Price EUR">
              <input name="price" defaultValue="0.00" inputMode="decimal" className={fieldClass} />
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <PrimaryButton type="submit" disabled={busy}>
                Save
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => setCreating(false)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="Edit product" onClose={() => setEditing(null)}>
          {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
          <form onSubmit={(e) => void saveProduct(e)} className="space-y-3">
            <Field label="Title">
              <input name="title" required defaultValue={editing.title} className={fieldClass} />
            </Field>
            <Field label="Description">
              <textarea name="description" required minLength={10} rows={3} defaultValue={editing.description} className={fieldClass} />
            </Field>
            <Field label="Visibility">
              <Select
                name="published"
                defaultValue={editing.published ? 'true' : 'false'}
                options={[
                  { value: 'true', label: 'Published' },
                  { value: 'false', label: 'Hidden' },
                ]}
              />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="submit" disabled={busy}>
                Save
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => setEditing(null)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {variantFor ? (
        <Modal title={`Add SKU · ${variantFor.title}`} onClose={() => setVariantFor(null)}>
          {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
          <form onSubmit={(e) => void addVariant(e)} className="grid gap-3 sm:grid-cols-2">
            <Field label="SKU">
              <input name="sku" required className={fieldClass} />
            </Field>
            <Field label="Size">
              <input name="size" required defaultValue="OS" className={fieldClass} />
            </Field>
            <Field label="Colour">
              <input name="color" required className={fieldClass} />
            </Field>
            <Field label="Cost EUR">
              <input name="cost" defaultValue="0.00" inputMode="decimal" className={fieldClass} />
            </Field>
            <Field label="Price EUR">
              <input name="price" required defaultValue="0.00" inputMode="decimal" className={fieldClass} />
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <PrimaryButton type="submit" disabled={busy}>
                Add SKU
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => setVariantFor(null)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {photoProduct ? (
        <Modal title={`Photos · ${photoProduct.title}`} onClose={() => setPhotosFor(null)} wide>
          {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
          <ul className="mb-4 space-y-2">
            {(photoProduct.images ?? []).map((image) => (
              <li key={image.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{image.alt || image.url}</span>
                <SecondaryButton type="button" disabled={busy} onClick={() => void removePhoto(image.id)}>
                  Remove
                </SecondaryButton>
              </li>
            ))}
            {(photoProduct.images ?? []).length === 0 ? (
              <li className="text-sm text-ink/55">No photos yet. JPEG, PNG, WebP, or GIF up to 4 MB.</li>
            ) : null}
          </ul>
          <form onSubmit={(e) => void addPhoto(e)} className="space-y-3">
            <Field label="File">
              <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required className={fieldClass} />
            </Field>
            <Field label="Alt text">
              <input name="alt" className={fieldClass} placeholder={photoProduct.title} />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? 'Uploading…' : 'Upload'}
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => setPhotosFor(null)}>
                Close
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
