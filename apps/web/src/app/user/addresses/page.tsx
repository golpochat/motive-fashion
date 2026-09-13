'use client';

import { FormEvent, useEffect, useState } from 'react';
import { addressLabelName, formatIrelandAddress, normalizeEircode } from '@motive-fashion/config';
import { API, apiErrorMessage } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/page-header';
import { PrimaryButton, SecondaryButton } from '@/components/dashboard-ui';
import { useSession, refreshSession } from '@/components/session-provider';
import {
  IrelandAddressFields,
  validateIrelandAddress,
  type AddressFieldErrors,
} from '@/components/ireland-address-fields';

type County = { code: string; name: string };
type Address = {
  id: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  county?: string | null;
  eircode?: string | null;
  isDefault?: boolean;
};

export default function UserAddresses() {
  const { me } = useSession();
  const [counties, setCounties] = useState<County[]>([]);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AddressFieldErrors>({});

  useEffect(() => {
    fetch(`${API}/checkout/options`)
      .then((r) => r.json() as Promise<{ counties: County[] }>)
      .then((data) => setCounties(data.counties ?? []));
  }, []);

  if (!me) return null;

  function clearEditor() {
    setEditing(null);
    setFieldErrors({});
    setError('');
  }

  async function save(e: FormEvent<HTMLFormElement>, id: string | 'new') {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const local = validateIrelandAddress(form);
    setFieldErrors(local);
    if (Object.keys(local).length) return;
    const body = {
      label: String(form.get('label') || 'HOME'),
      line1: String(form.get('line1')).trim(),
      line2: String(form.get('line2') || '').trim() || undefined,
      city: String(form.get('city')).trim(),
      county: String(form.get('county')),
      eircode: normalizeEircode(String(form.get('eircode') || '')),
      isDefault: form.get('isDefault') === 'on',
    };
    const res = await fetch(id === 'new' ? `${API}/account/addresses` : `${API}/account/addresses/${id}`, {
      method: id === 'new' ? 'POST' : 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not save this address. Check the details and try again.'));
      return;
    }
    clearEditor();
    await refreshSession();
  }

  async function makeDefault(id: string) {
    setError('');
    const res = await fetch(`${API}/account/addresses/${id}/default`, { method: 'POST', credentials: 'include' });
    const payload = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not set this as the default address'));
      return;
    }
    await refreshSession();
  }

  async function remove(id: string) {
    setError('');
    const res = await fetch(`${API}/account/addresses/${id}`, { method: 'DELETE', credentials: 'include' });
    const payload = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not remove this address'));
      return;
    }
    await refreshSession();
  }

  return (
    <div>
      <PageHeader
        title="Addresses"
        description="Ireland delivery addresses on this account. Eircode is required so parcels can be routed."
        actions={
          <SecondaryButton
            type="button"
            onClick={() => {
              setError('');
              setFieldErrors({});
              setEditing('new');
            }}
          >
            Add address
          </SecondaryButton>
        }
      />
      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {editing === 'new' ? (
        <AddressEditor
          counties={counties}
          fieldErrors={fieldErrors}
          onSubmit={(e) => void save(e, 'new')}
          onCancel={clearEditor}
        />
      ) : null}

      {me.addresses?.length ? (
        <ul className="space-y-3">
          {me.addresses.map((address) => (
            <li key={address.id} className="rounded-2xl border border-ink/10 bg-white p-4 text-sm">
              {editing === address.id ? (
                <AddressEditor
                  counties={counties}
                  address={address}
                  fieldErrors={fieldErrors}
                  onSubmit={(e) => void save(e, address.id)}
                  onCancel={clearEditor}
                />
              ) : (
                <>
                  <p className="text-sm">
                    {addressLabelName(address.label) || 'Address'}
                    {address.isDefault ? <span className="text-ink/45"> · Default</span> : null}
                  </p>
                  <p className="mt-2 text-ink/80">{formatIrelandAddress(address)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <SecondaryButton
                      type="button"
                      onClick={() => {
                        setError('');
                        setFieldErrors({});
                        setEditing(address.id);
                      }}
                    >
                      Edit
                    </SecondaryButton>
                    {!address.isDefault ? (
                      <SecondaryButton type="button" onClick={() => void makeDefault(address.id)}>
                        Set as default
                      </SecondaryButton>
                    ) : null}
                    <SecondaryButton type="button" onClick={() => void remove(address.id)}>
                      Remove
                    </SecondaryButton>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : editing !== 'new' ? (
        <EmptyState title="No addresses yet" body="Add an Ireland address with Eircode for faster checkout." />
      ) : null}
    </div>
  );
}

function AddressEditor({
  counties,
  address,
  fieldErrors,
  onSubmit,
  onCancel,
}: {
  counties: County[];
  address?: Address;
  fieldErrors: AddressFieldErrors;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form noValidate onSubmit={onSubmit} className="mb-4 max-w-lg space-y-3 rounded-2xl border border-ink/10 bg-white p-5">
      <IrelandAddressFields counties={counties} defaults={address} errors={fieldErrors} />
      <label className="flex items-center gap-2 text-sm">
        <input name="isDefault" type="checkbox" defaultChecked={address?.isDefault ?? true} className="accent-ink" />
        Default address
      </label>
      <div className="flex gap-3">
        <PrimaryButton type="submit">Save</PrimaryButton>
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
