'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  IconButton,
  Modal,
  PrimaryButton,
  RowActions,
  SecondaryButton,
  Td,
  Toggle,
  fieldClass,
} from '@/components/dashboard-ui';
import {
  ProductEditor,
  type AdminCategory,
  type AdminProduct,
  type StyleCreateInput,
  type StyleSaveInput,
  type StyleVariantInput,
} from '@/components/product-editor';
import { ProductHub } from '@/components/product-hub';
import { catalogPriceLabel } from '@/lib/catalog';
import { uniqueColors, uniqueSizes } from '@motive-fashion/utils';
import { hasPerm } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';

type ProductImage = { id: string; url: string; alt: string };
type Product = AdminProduct & { images?: ProductImage[] };

export default function AdminProducts() {
  const { me } = useSession();
  const canWrite = hasPerm(me, 'catalog.write');
  const { data, error, loading, reload, setData } = useConsoleQuery<Product[]>('/admin/products', 'Could not load products');
  const cats = useConsoleQuery<AdminCategory[]>('/catalog/categories', 'Could not load categories');
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [variantFor, setVariantFor] = useState<Product | null>(null);
  const [photosFor, setPhotosFor] = useState<Product | null>(null);
  const [hubFor, setHubFor] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const openedHub = useRef(false);
  const rows = data ?? [];
  const categories = cats.data ?? [];
  const photoProduct = photosFor ? (rows.find((row) => row.id === photosFor.id) ?? photosFor) : null;
  const hubProduct = hubFor ? (rows.find((row) => row.id === hubFor.id) ?? hubFor) : null;

  useEffect(() => {
    if (openedHub.current || !rows.length) return;
    const id = new URLSearchParams(window.location.search).get('hub');
    if (!id) return;
    const row = rows.find((item) => item.id === id);
    if (row) {
      setHubFor(row);
      openedHub.current = true;
    }
  }, [rows]);

  async function createProduct(payload: StyleCreateInput) {
    setFormError('');
    setBusy(true);
    const res = await fetch(`${API}/admin/products`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const product = (await res.json().catch(() => null)) as Product | { message?: string };
    setBusy(false);
    if (!res.ok || !product || !('id' in product)) {
      setFormError(apiErrorMessage(product, 'Could not create this product.'));
      return;
    }
    setCreating(false);
    reload();
    setPhotosFor(product);
  }

  async function saveProduct(payload: StyleSaveInput) {
    if (!editing) return;
    setFormError('');
    setBusy(true);
    const res = await fetch(`${API}/admin/products/${editing.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: payload.title,
        description: payload.description,
        categoryId: payload.categoryId,
        occasion: payload.occasion,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setBusy(false);
      setFormError(apiErrorMessage(body, 'Could not update this product.'));
      return;
    }
    for (const row of payload.variants) {
      const original = editing.variants.find((item) => item.id === row.id);
      if (
        original &&
        original.sku === row.sku &&
        original.priceCents === row.priceCents &&
        (original.costCents ?? 0) === row.costCents &&
        original.active === row.active
      ) {
        continue;
      }
      const variantRes = await fetch(`${API}/admin/products/${editing.id}/variants/${row.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: row.sku,
          priceCents: row.priceCents,
          costCents: row.costCents,
          active: row.active,
        }),
      });
      if (!variantRes.ok) {
        const variantBody = await variantRes.json().catch(() => null);
        setBusy(false);
        setFormError(apiErrorMessage(variantBody, 'Product saved; one SKU could not be updated.'));
        reload();
        return;
      }
    }
    setBusy(false);
    setEditing(null);
    reload();
  }

  async function addVariants(variants: StyleVariantInput[]) {
    if (!variantFor) return;
    setFormError('');
    setBusy(true);
    const res = await fetch(`${API}/admin/products/${variantFor.id}/variants`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variants }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not add these SKUs.'));
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

  async function setPublished(product: Product, published: boolean) {
    setFormError('');
    if (published && product.variants.filter((row) => row.active).length === 0) {
      setFormError('Add at least one SKU before publishing.');
      return;
    }
    setData((current) =>
      (current ?? []).map((row) => (row.id === product.id ? { ...row, published } : row)),
    );
    const res = await fetch(`${API}/admin/products/${product.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published }),
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setData((current) =>
        (current ?? []).map((row) => (row.id === product.id ? { ...row, published: product.published } : row)),
      );
      setFormError(apiErrorMessage(payload, 'Could not update this product.'));
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Add a style, tap sizes and colours, and SKUs fill in. Publish when it is ready to sell. Print hang tags from Labels. Stock is on Inventory."
        actions={
          canWrite ? (
            <PrimaryButton type="button" onClick={() => { setFormError(''); setCreating(true); }}>
              Add product
            </PrimaryButton>
          ) : null
        }
      />
      {formError && !creating && !editing && !variantFor && !photosFor && !hubFor ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : error && rows.length ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <ConsoleSection
        loading={loading}
        error={rows.length ? '' : error}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="No products"
        emptyBody="Add a product to put it on the Dublin ledger."
      >
        <DataTable headers={['Title', 'Category', 'SKUs', 'Published', 'Action']}>
          {rows.map((r) => {
            const sizes = uniqueSizes(r.variants);
            const colors = uniqueColors(r.variants);
            return (
              <tr key={r.id} className="hover:bg-ink/5">
                <Td>
                  <button type="button" className="text-left" onClick={() => setHubFor(r)}>
                    {r.title}
                    <span className="mt-1 block text-xs text-ink/45">{r.slug}</span>
                  </button>
                </Td>
                <Td muted>{r.category?.name ?? '—'}</Td>
                <Td>
                  {r.variants.length ? (
                    <>
                      <span>
                        {r.variants.length} SKU{r.variants.length === 1 ? '' : 's'} · {catalogPriceLabel(r.variants)}
                      </span>
                      <span className="mt-1 block text-xs text-ink/45">
                        {sizes.join(', ')} / {colors.join(', ')}
                      </span>
                    </>
                  ) : (
                    'None'
                  )}
                </Td>
                <Td nowrap>
                  {canWrite ? (
                    <Toggle
                      checked={r.published}
                      onChange={(next) => void setPublished(r, next)}
                      label={r.published ? 'Unpublish product' : 'Publish product'}
                      showLabel={false}
                    />
                  ) : null}
                </Td>
                <Td nowrap>
                  <RowActions>
                    <IconButton label="Open style" icon="eye" onClick={() => setHubFor(r)} />
                    <IconButton label="Print labels" icon="barcode" href={`/admin/labels?product=${r.id}`} />
                    {canWrite ? (
                      <>
                        <IconButton label="Edit product" icon="edit" onClick={() => { setFormError(''); setEditing(r); }} />
                        <IconButton label="Add SKUs" icon="plus" onClick={() => { setFormError(''); setVariantFor(r); }} />
                        <IconButton label="Photos" icon="photo" onClick={() => { setFormError(''); setPhotosFor(r); }} />
                      </>
                    ) : null}
                  </RowActions>
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </ConsoleSection>

      {hubProduct && !creating && !editing && !variantFor && !photosFor ? (
        <ProductHub
          product={hubProduct}
          canWrite={canWrite}
          onClose={() => setHubFor(null)}
          onEdit={() => {
            setFormError('');
            setEditing(hubProduct);
            setHubFor(null);
          }}
          onAddSkus={() => {
            setFormError('');
            setVariantFor(hubProduct);
            setHubFor(null);
          }}
          onPhotos={() => {
            setFormError('');
            setPhotosFor(hubProduct);
            setHubFor(null);
          }}
        />
      ) : null}

      {creating ? (
        <ProductEditor
          mode="create"
          categories={categories}
          busy={busy}
          error={formError}
          onClose={() => setCreating(false)}
          onCreate={(payload) => void createProduct(payload)}
          onSave={() => undefined}
          onAddSkus={() => undefined}
        />
      ) : null}

      {editing ? (
        <ProductEditor
          mode="edit"
          product={editing}
          categories={categories}
          busy={busy}
          error={formError}
          onClose={() => setEditing(null)}
          onCreate={() => undefined}
          onSave={(payload) => void saveProduct(payload)}
          onAddSkus={() => undefined}
        />
      ) : null}

      {variantFor ? (
        <ProductEditor
          mode="add-skus"
          product={variantFor}
          categories={categories}
          busy={busy}
          error={formError}
          onClose={() => setVariantFor(null)}
          onCreate={() => undefined}
          onSave={() => undefined}
          onAddSkus={(payload) => void addVariants(payload)}
        />
      ) : null}

      {photoProduct ? (
        <Modal title={`Photos · ${photoProduct.title}`} onClose={() => setPhotosFor(null)} wide>
          {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
          <p className="mb-3 text-sm text-ink/70">JPEG, PNG, WebP, or GIF up to 4 MB. The first photo is the storefront image.</p>
          <ul className="mb-4 space-y-2">
            {(photoProduct.images ?? []).map((image) => (
              <li key={image.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{image.alt || image.url}</span>
                <IconButton label="Remove photo" icon="trash" tone="danger" disabled={busy} onClick={() => void removePhoto(image.id)} />
              </li>
            ))}
            {(photoProduct.images ?? []).length === 0 ? (
              <li className="text-sm text-ink/55">No photos yet.</li>
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
                Done
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
