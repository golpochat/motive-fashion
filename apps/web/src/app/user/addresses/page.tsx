'use client';

import { FormEvent, useEffect, useState } from 'react';
import { addressLabelName, formatIrelandAddress, normalizeEircode } from '@motive-fashion/config';
import { API, apiErrorMessage } from '@/lib/api';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  IconButton,
  JobCard,
  Modal,
  PrimaryButton,
  RowActions,
  SecondaryButton,
  Td,
} from '@/components/dashboard-ui';
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
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [removing, setRemoving] = useState<Address | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AddressFieldErrors>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`${API}/checkout/options`)
      .then((r) => r.json() as Promise<{ counties: County[] }>)
      .then((data) => setCounties(data.counties ?? []));
  }, []);

  if (!me) return null;

  const addresses = me.addresses ?? [];

  function clearEditor() {
    setEditing(null);
    setFieldErrors({});
    setError('');
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError('');
    const form = new FormData(e.currentTarget);
    const local = validateIrelandAddress(form);
    setFieldErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    const id = editing === 'new' ? 'new' : editing.id;
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
    setBusy(false);
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

  async function remove() {
    if (!removing) return;
    setError('');
    setBusy(true);
    const res = await fetch(`${API}/account/addresses/${removing.id}`, { method: 'DELETE', credentials: 'include' });
    const payload = (await res.json().catch(() => null)) as unknown;
    setBusy(false);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not remove this address'));
      return;
    }
    setRemoving(null);
    await refreshSession();
  }

  return (
    <div>
      <PageHeader
        title="Addresses"
        description="Ireland delivery addresses on this account. Eircode is required so parcels can be routed."
        actions={
          <PrimaryButton
            type="button"
            onClick={() => {
              setError('');
              setFieldErrors({});
              setEditing('new');
            }}
          >
            Add address
          </PrimaryButton>
        }
      />
      {error && !editing ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <ConsoleSection
        loading={false}
        error=""
        empty={addresses.length === 0}
        emptyTitle="No addresses yet"
        emptyBody="Add an Ireland address with Eircode for faster checkout."
      >
        <DataTable
          headers={['Label', 'Address', 'Default', 'Action']}
          cards={addresses.map((address) => (
            <JobCard
              key={address.id}
              title={addressLabelName(address.label) || 'Address'}
              meta={address.isDefault ? 'Default' : undefined}
              actions={<AddressActions address={address} onEdit={setEditing} onDefault={makeDefault} onRemove={setRemoving} />}
            >
              <p className="mt-2 text-sm text-ink/80">{formatIrelandAddress(address)}</p>
            </JobCard>
          ))}
        >
          {addresses.map((address) => (
            <tr key={address.id} className="hover:bg-ink/5">
              <Td>{addressLabelName(address.label) || 'Address'}</Td>
              <Td>{formatIrelandAddress(address)}</Td>
              <Td muted>{address.isDefault ? 'Yes' : '—'}</Td>
              <Td nowrap>
                <AddressActions address={address} onEdit={setEditing} onDefault={makeDefault} onRemove={setRemoving} />
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>

      {editing ? (
        <Modal title={editing === 'new' ? 'Add address' : 'Edit address'} onClose={clearEditor}>
          {error ? (
            <p className="mb-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <form noValidate onSubmit={(e) => void save(e)} className="space-y-3">
            <IrelandAddressFields
              counties={counties}
              defaults={editing === 'new' ? undefined : editing}
              errors={fieldErrors}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                name="isDefault"
                type="checkbox"
                defaultChecked={editing === 'new' ? true : Boolean(editing.isDefault)}
                className="accent-ink"
              />
              Default address
            </label>
            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save address'}
              </PrimaryButton>
              <SecondaryButton type="button" onClick={clearEditor}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {removing ? (
        <Modal title="Remove this address?" onClose={() => setRemoving(null)}>
          <p className="text-sm text-ink/70">
            {addressLabelName(removing.label) || 'This address'} will be removed from checkout.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <PrimaryButton type="button" disabled={busy} onClick={() => void remove()}>
              {busy ? 'Removing…' : 'Remove address'}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setRemoving(null)}>
              Keep address
            </SecondaryButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function AddressActions({
  address,
  onEdit,
  onDefault,
  onRemove,
}: {
  address: Address;
  onEdit: (address: Address) => void;
  onDefault: (id: string) => void;
  onRemove: (address: Address) => void;
}) {
  return (
    <RowActions>
      <IconButton label="Edit address" icon="edit" onClick={() => onEdit(address)} />
      {address.isDefault ? null : (
        <IconButton label="Set as default" icon="check" onClick={() => onDefault(address.id)} />
      )}
      <IconButton label="Remove address" icon="trash" tone="danger" onClick={() => onRemove(address)} />
    </RowActions>
  );
}
