'use client';

import { type FocusEvent } from 'react';
import { ADDRESS_LABELS, addressLabelCode, isValidEircode, normalizeEircode } from '@motive-fashion/config';
import { fieldClass, Select } from '@/components/dashboard-ui';

export type IrelandAddressValue = {
  label?: string | null;
  line1?: string;
  line2?: string | null;
  city?: string;
  county?: string | null;
  eircode?: string | null;
};

export type AddressFieldErrors = {
  line1?: string;
  city?: string;
  county?: string;
  eircode?: string;
};

export function validateIrelandAddress(form: FormData): AddressFieldErrors {
  const errors: AddressFieldErrors = {};
  const line1 = String(form.get('line1') || '').trim();
  const city = String(form.get('city') || '').trim();
  const county = String(form.get('county') || '').trim();
  const eircode = String(form.get('eircode') || '').trim();
  if (line1.length < 3) errors.line1 = 'Enter the first line of the address.';
  if (city.length < 2) errors.city = 'Enter a town or city.';
  if (!county) errors.county = 'Choose a county.';
  if (!eircode) errors.eircode = 'Enter an Eircode.';
  else if (!isValidEircode(eircode)) errors.eircode = 'Enter a valid Eircode, like D02 AF30.';
  return errors;
}

function fieldErrorClass(invalid?: string) {
  return invalid ? `${fieldClass} border-red-600` : fieldClass;
}

export function IrelandAddressFields({
  counties,
  defaults,
  county,
  onCountyChange,
  showLabel = true,
  errors,
}: {
  counties: { code: string; name: string }[];
  defaults?: IrelandAddressValue;
  county?: string;
  onCountyChange?: (value: string) => void;
  showLabel?: boolean;
  errors?: AddressFieldErrors;
}) {
  const countyOptions = counties.map((row) => ({ value: row.code, label: row.name }));

  function formatEircode(e: FocusEvent<HTMLInputElement>) {
    const next = normalizeEircode(e.currentTarget.value);
    if (next) e.currentTarget.value = next;
  }

  return (
    <div className="space-y-3">
      {showLabel ? (
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Label</span>
          <Select
            name="label"
            defaultValue={addressLabelCode(defaults?.label)}
            placeholder="Label"
            className={fieldClass}
            options={ADDRESS_LABELS.map((row) => ({ value: row.code, label: row.name }))}
          />
        </label>
      ) : (
        <input type="hidden" name="label" value="HOME" />
      )}
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Address line 1</span>
        <input
          name="line1"
          required
          defaultValue={defaults?.line1 ?? ''}
          autoComplete="address-line1"
          aria-invalid={Boolean(errors?.line1)}
          className={fieldErrorClass(errors?.line1)}
        />
        {errors?.line1 ? (
          <p className="mt-1.5 text-sm text-red-700" role="alert">
            {errors.line1}
          </p>
        ) : null}
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Address line 2</span>
        <input name="line2" defaultValue={defaults?.line2 ?? ''} autoComplete="address-line2" className={fieldClass} />
        <span className="mt-1.5 block text-xs text-ink/55">Optional. Apartment, building, or estate name.</span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Town / city</span>
        <input
          name="city"
          required
          defaultValue={defaults?.city ?? ''}
          autoComplete="address-level2"
          aria-invalid={Boolean(errors?.city)}
          className={fieldErrorClass(errors?.city)}
        />
        {errors?.city ? (
          <p className="mt-1.5 text-sm text-red-700" role="alert">
            {errors.city}
          </p>
        ) : null}
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">County</span>
        {onCountyChange ? (
          <Select
            name="county"
            required
            value={county ?? ''}
            onChange={onCountyChange}
            placeholder="County"
            className={fieldErrorClass(errors?.county)}
            sortLabels
            options={countyOptions}
          />
        ) : (
          <Select
            name="county"
            required
            defaultValue={defaults?.county ?? ''}
            placeholder="County"
            className={fieldErrorClass(errors?.county)}
            sortLabels
            options={countyOptions}
          />
        )}
        {errors?.county ? (
          <p className="mt-1.5 text-sm text-red-700" role="alert">
            {errors.county}
          </p>
        ) : null}
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Eircode</span>
        <input
          name="eircode"
          required
          defaultValue={defaults?.eircode ?? ''}
          autoComplete="postal-code"
          aria-invalid={Boolean(errors?.eircode)}
          className={fieldErrorClass(errors?.eircode)}
          onBlur={formatEircode}
        />
        {errors?.eircode ? (
          <p className="mt-1.5 text-sm text-red-700" role="alert">
            {errors.eircode}
          </p>
        ) : (
          <span className="mt-1.5 block text-xs text-ink/55">Required for Ireland. Example: D02 AF30.</span>
        )}
      </label>
    </div>
  );
}
