'use client';

import { FormEvent, useEffect, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { DataTable, Field, IconButton, Modal, PrimaryButton, RowActions, SecondaryButton, Select, Td, fieldClass } from '@/components/dashboard-ui';
import { formatEuro, formatUnits } from '@/lib/supply';

export type SupplierLink = {
  productId: string;
  title: string;
  moq: number;
  unitCostCents: number;
  leadDays: number;
  skuCount: number;
};

type CatalogProduct = { id: string; title: string; skuCount: number; defaultCostCents: number };

function eurosToCents(value: FormDataEntryValue | null) {
  const n = Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function SupplierRange({
  supplierId,
  links,
  onChanged,
}: {
  supplierId: string;
  links: SupplierLink[];
  onChanged: () => void;
}) {
  const [catalog, setCatalog] = useState<CatalogProduct[] | null>(null);
  const [linking, setLinking] = useState(false);
  const [editing, setEditing] = useState<SupplierLink | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState('');
  const [cost, setCost] = useState('');

  const linkedIds = new Set(links.map((row) => row.productId));
  const available = (catalog ?? []).filter((row) => !linkedIds.has(row.id) && row.skuCount > 0);

  useEffect(() => {
    if (!linking || catalog) return;
    fetch(`${API}/admin/procurement/catalog`, { credentials: 'include' })
      .then(async (res) => {
        const payload = (await res.json().catch(() => null)) as CatalogProduct[] | null;
        if (!res.ok) {
          setFormError(apiErrorMessage(payload, 'Could not load products.'));
          return;
        }
        setCatalog(payload ?? []);
      })
      .catch(() => setFormError('Could not load products.'));
  }, [catalog, linking]);

  function pickProduct(id: string) {
    setProductId(id);
    const row = (catalog ?? []).find((item) => item.id === id);
    if (row) setCost((row.defaultCostCents / 100).toFixed(2));
  }

  async function link(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    if (!productId) {
      setFormError('Pick a product.');
      return;
    }
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/procurement/suppliers/${supplierId}/products`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        moq: Number(form.get('moq') || 1),
        unitCostCents: eurosToCents(form.get('cost')),
        leadDays: Number(form.get('leadDays') || 21),
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not link this product.'));
      return;
    }
    setLinking(false);
    setProductId('');
    setCost('');
    onChanged();
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setFormError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/procurement/suppliers/${supplierId}/products/${editing.productId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moq: Number(form.get('moq') || 1),
        unitCostCents: eurosToCents(form.get('cost')),
        leadDays: Number(form.get('leadDays') || 21),
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not update this link.'));
      return;
    }
    setEditing(null);
    onChanged();
  }

  async function unlink(productIdToRemove: string) {
    setFormError('');
    setBusy(true);
    const res = await fetch(`${API}/admin/procurement/suppliers/${supplierId}/products/${productIdToRemove}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not unlink this product.'));
      return;
    }
    onChanged();
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/55">
          Styles this mill makes. Set MOQ and factory cost here before the first purchase order. Changing cost does not rewrite drafts you already saved.
        </p>
        <PrimaryButton
          type="button"
          onClick={() => {
            setFormError('');
            setProductId('');
            setCost('');
            setLinking(true);
          }}
        >
          Link product
        </PrimaryButton>
      </div>
      {formError && !linking && !editing ? (
        <p className="mb-3 text-sm text-red-700" role="alert">
          {formError}
        </p>
      ) : null}
      {links.length === 0 ? (
        <p className="text-sm text-ink/55">Nothing linked yet. Add the styles this mill supplies, then raise a draft PO.</p>
      ) : (
        <DataTable headers={['Style', 'SKUs', 'MOQ', 'Cost', 'Lead', 'Action']}>
          {links.map((row) => (
            <tr key={row.productId} className="hover:bg-ink/5">
              <Td>{row.title}</Td>
              <Td muted>{formatUnits(row.skuCount)}</Td>
              <Td>{formatUnits(row.moq)}</Td>
              <Td>{formatEuro(row.unitCostCents)}</Td>
              <Td muted>{row.leadDays}d</Td>
              <Td nowrap>
                <RowActions>
                  <IconButton
                    label="Edit link"
                    icon="edit"
                    onClick={() => {
                      setFormError('');
                      setEditing(row);
                    }}
                  />
                  <IconButton label="Unlink product" icon="trash" tone="danger" disabled={busy} onClick={() => void unlink(row.productId)} />
                </RowActions>
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
      {linking ? (
        <Modal title="Link product" onClose={() => setLinking(false)}>
          {formError ? (
            <p className="mb-3 text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
          {catalog && available.length === 0 ? (
            <p className="text-sm text-ink/55">
              Every product with a SKU is already linked, or the catalogue is empty. Add a product under Products first.
            </p>
          ) : (
            <form onSubmit={(e) => void link(e)} className="space-y-3">
              <Field label="Product">
                <Select
                  value={productId}
                  onChange={pickProduct}
                  options={available.map((row) => ({ value: row.id, label: row.title }))}
                  placeholder={catalog ? 'Select a product' : 'Loading…'}
                  required
                  sortLabels
                  disabled={!catalog}
                />
              </Field>
              <Field label="Minimum order (MOQ)">
                <input name="moq" type="number" min={1} defaultValue={1} className={fieldClass} required />
              </Field>
              <Field label="Factory cost (€)">
                <input
                  name="cost"
                  type="number"
                  min={0}
                  step="0.01"
                  className={fieldClass}
                  required
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </Field>
              <Field label="Lead time (days)">
                <input name="leadDays" type="number" min={1} max={365} defaultValue={21} className={fieldClass} />
              </Field>
              <div className="flex gap-2">
                <PrimaryButton type="submit" disabled={busy || !productId}>
                  Link
                </PrimaryButton>
                <SecondaryButton type="button" onClick={() => setLinking(false)}>
                  Cancel
                </SecondaryButton>
              </div>
            </form>
          )}
        </Modal>
      ) : null}
      {editing ? (
        <Modal title={`Edit ${editing.title}`} onClose={() => setEditing(null)}>
          {formError ? (
            <p className="mb-3 text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
          <form onSubmit={(e) => void save(e)} className="space-y-3">
            <Field label="Minimum order (MOQ)">
              <input name="moq" type="number" min={1} defaultValue={editing.moq} className={fieldClass} required />
            </Field>
            <Field label="Factory cost (€)">
              <input
                name="cost"
                type="number"
                min={0}
                step="0.01"
                defaultValue={(editing.unitCostCents / 100).toFixed(2)}
                className={fieldClass}
                required
              />
            </Field>
            <Field label="Lead time (days)">
              <input name="leadDays" type="number" min={1} max={365} defaultValue={editing.leadDays} className={fieldClass} />
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
    </div>
  );
}
