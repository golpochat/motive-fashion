'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CATALOG_COLORS,
  CATALOG_OCCASIONS,
  CATALOG_SIZES,
  cartesianStyleRows,
  defaultProductDescription,
  slugify,
  styleComboKey,
  styleDefaultsForCategory,
  uniqueColors,
  uniqueSizes,
  variantSku,
} from '@motive-fashion/utils';
import {
  ChoiceChip,
  Field,
  Modal,
  PrimaryButton,
  SecondaryButton,
  Select,
  Toggle,
  fieldClass,
} from '@/components/dashboard-ui';

export type AdminCategory = { id: string; name: string; slug: string };
export type AdminVariant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  priceCents: number;
  costCents?: number;
  active: boolean;
  inventory?: { onHand: number; reserved: number }[];
};
export type AdminProduct = {
  id: string;
  title: string;
  slug: string;
  description: string;
  published: boolean;
  categoryId: string;
  occasion?: string | null;
  category?: { name: string; slug?: string };
  variants: AdminVariant[];
  images?: { id: string; url: string; alt: string }[];
};

export type StyleVariantInput = {
  sku: string;
  size: string;
  color: string;
  costCents: number;
  priceCents: number;
};

export type StyleCreateInput = {
  title: string;
  description: string;
  categoryId: string;
  occasion?: string;
  published: false;
  variants: StyleVariantInput[];
};

export type StyleSaveInput = {
  title: string;
  description: string;
  categoryId: string;
  occasion: string | null;
  variants: { id: string; sku: string; costCents: number; priceCents: number; active: boolean }[];
};

type DraftRow = {
  key: string;
  size: string;
  color: string;
  sku: string;
  price: string;
  cost: string;
};

const OCCASION_LABEL: Record<(typeof CATALOG_OCCASIONS)[number], string> = {
  daily: 'Daily',
  eid: 'Eid',
  prayer: 'Prayer',
  winter: 'Winter',
};

function eurosToCents(value: string) {
  const n = Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function centsToInput(cents: number | undefined) {
  if (cents == null || !Number.isFinite(cents)) return '';
  return (cents / 100).toFixed(2);
}

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function normalizeSize(value: string) {
  const trimmed = value.trim();
  if (/^[a-z0-9]{1,4}$/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed;
}

function normalizeColor(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function ProductEditor({
  mode,
  product,
  categories,
  busy,
  error,
  onClose,
  onCreate,
  onSave,
  onAddSkus,
}: {
  mode: 'create' | 'edit' | 'add-skus';
  product?: AdminProduct;
  categories: AdminCategory[];
  busy: boolean;
  error: string;
  onClose: () => void;
  onCreate: (payload: StyleCreateInput) => void;
  onSave: (payload: StyleSaveInput) => void;
  onAddSkus: (payload: StyleVariantInput[]) => void;
}) {
  const editing = mode === 'edit' ? product : null;
  const addingTo = mode === 'add-skus' ? product : null;
  const initialCategory = categories.find((row) => row.id === (editing ?? addingTo)?.categoryId);
  const initialDefaults = styleDefaultsForCategory(initialCategory?.slug ?? addingTo?.category?.slug);

  const [title, setTitle] = useState(editing?.title ?? addingTo?.title ?? '');
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? addingTo?.categoryId ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [descTouched, setDescTouched] = useState(mode !== 'create');
  const [occasion, setOccasion] = useState(
    editing?.occasion ?? addingTo?.occasion ?? initialDefaults.occasion,
  );
  const [sizes, setSizes] = useState<string[]>(() => {
    if (mode === 'create') return [];
    const current = uniqueSizes((editing ?? addingTo)?.variants ?? []);
    return current.length ? current : initialDefaults.sizes;
  });
  const [colors, setColors] = useState<string[]>(mode === 'create' ? [] : []);
  const [extraSizes, setExtraSizes] = useState<string[]>([]);
  const [extraColors, setExtraColors] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState('');
  const [customColor, setCustomColor] = useState('');
  const [sharedPrice, setSharedPrice] = useState(
    centsToInput((editing ?? addingTo)?.variants[0]?.priceCents),
  );
  const [sharedCost, setSharedCost] = useState(centsToInput((editing ?? addingTo)?.variants[0]?.costCents) || '0.00');
  const [skipped, setSkipped] = useState<string[]>([]);
  const [skuOverride, setSkuOverride] = useState<Record<string, string>>({});
  const [priceOverride, setPriceOverride] = useState<Record<string, string>>({});
  const [costOverride, setCostOverride] = useState<Record<string, string>>({});
  const [variantDrafts, setVariantDrafts] = useState(
    () =>
      (editing?.variants ?? []).map((row) => ({
        id: row.id,
        sku: row.sku,
        size: row.size,
        color: row.color,
        price: centsToInput(row.priceCents),
        cost: centsToInput(row.costCents) || '0.00',
        active: row.active,
      })),
  );

  const category = categories.find((row) => row.id === categoryId);
  const existingComboKeys = ((editing ?? addingTo)?.variants ?? []).map((row) => styleComboKey(row.size, row.color));
  const existingCombos = new Set(existingComboKeys);
  const slug = slugify(title) || (editing ?? addingTo)?.slug || 'style';

  useEffect(() => {
    if (mode !== 'create' || descTouched || title.trim().length < 2) return;
    setDescription(defaultProductDescription(title, category?.name));
  }, [title, category?.name, descTouched, mode]);

  const sizeOptions = useMemo(() => {
    const known = new Set<string>([...CATALOG_SIZES, ...extraSizes, ...sizes]);
    return [...known];
  }, [extraSizes, sizes]);

  const colorOptions = useMemo(() => {
    const known = new Set<string>([...CATALOG_COLORS, ...extraColors, ...colors]);
    return [...known];
  }, [extraColors, colors]);

  const draftRows: DraftRow[] = useMemo(() => {
    if (mode === 'edit') return [];
    return cartesianStyleRows(sizes, colors)
      .filter((row) => {
        const key = styleComboKey(row.size, row.color);
        if (skipped.includes(key)) return false;
        if (mode === 'add-skus' && existingCombos.has(key)) return false;
        return true;
      })
      .map((row) => {
        const key = styleComboKey(row.size, row.color);
        return {
          key,
          size: row.size,
          color: row.color,
          sku: skuOverride[key] || variantSku(slug, row.size, row.color),
          price: priceOverride[key] ?? sharedPrice,
          cost: costOverride[key] ?? sharedCost,
        };
      });
  }, [mode, sizes, colors, skipped, existingComboKeys, skuOverride, slug, priceOverride, sharedPrice, costOverride, sharedCost]);

  function applyCategory(nextId: string) {
    setCategoryId(nextId);
    if (mode !== 'create') return;
    const next = categories.find((row) => row.id === nextId);
    const defaults = styleDefaultsForCategory(next?.slug);
    setSizes(defaults.sizes);
    setColors(defaults.colors);
    setOccasion(defaults.occasion);
    setSkipped([]);
    setSkuOverride({});
  }

  function addCustomSize() {
    const value = normalizeSize(customSize);
    if (!value) return;
    setExtraSizes((current) => (current.includes(value) ? current : [...current, value]));
    setSizes((current) => (current.includes(value) ? current : [...current, value]));
    setCustomSize('');
  }

  function addCustomColor() {
    const value = normalizeColor(customColor);
    if (!value) return;
    setExtraColors((current) => (current.includes(value) ? current : [...current, value]));
    setColors((current) => (current.includes(value) ? current : [...current, value]));
    setCustomColor('');
  }

  function toVariantPayload(rows: DraftRow[]): StyleVariantInput[] {
    return rows.map((row) => ({
      sku: row.sku.trim(),
      size: row.size,
      color: row.color,
      costCents: eurosToCents(row.cost),
      priceCents: eurosToCents(row.price),
    }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === 'create') {
      onCreate({
        title: title.trim(),
        description: description.trim() || defaultProductDescription(title, category?.name),
        categoryId,
        occasion,
        published: false,
        variants: toVariantPayload(draftRows),
      });
      return;
    }
    if (mode === 'add-skus') {
      onAddSkus(toVariantPayload(draftRows));
      return;
    }
    if (!editing) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      categoryId,
      occasion,
      variants: variantDrafts.map((row) => ({
        id: row.id,
        sku: row.sku.trim(),
        costCents: eurosToCents(row.cost),
        priceCents: eurosToCents(row.price),
        active: row.active,
      })),
    });
  }

  const saveBlocked =
    mode === 'edit'
      ? title.trim().length < 2 || description.trim().length < 10 || !categoryId
      : title.trim().length < 2 || !categoryId || !draftRows.length || draftRows.some((row) => eurosToCents(row.price) < 1);

  const titleText =
    mode === 'edit' ? 'Edit product' : mode === 'add-skus' ? `Add SKUs · ${addingTo?.title ?? ''}` : 'Add product';

  return (
    <Modal title={titleText} onClose={onClose} xl={mode !== 'add-skus'} wide={mode === 'add-skus'}>
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
      <form onSubmit={submit} className="grid gap-4">
        {mode !== 'add-skus' ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={2}
                  className={fieldClass}
                  placeholder="French jilbab"
                />
              </Field>
              <Field label="Category">
                <Select
                  value={categoryId}
                  onChange={applyCategory}
                  required
                  className={fieldClass}
                  options={categories.map((row) => ({ value: row.id, label: row.name }))}
                  placeholder="Category"
                />
              </Field>
            </div>
            <Field label="Description" hint="Filled from the title. Edit if you want a different line.">
              <textarea
                value={description}
                onChange={(e) => {
                  setDescTouched(true);
                  setDescription(e.target.value);
                }}
                required
                minLength={10}
                rows={2}
                className={fieldClass}
              />
            </Field>
            <fieldset>
              <legend className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Occasion</legend>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Occasion">
                {CATALOG_OCCASIONS.map((item) => (
                  <ChoiceChip key={item} selected={occasion === item} onClick={() => setOccasion(item)}>
                    {OCCASION_LABEL[item]}
                  </ChoiceChip>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <p className="text-sm text-ink/70">
            Existing SKUs stay as they are. Pick more sizes or colours and the new rows fill in at the current price.
          </p>
        )}

        {mode !== 'edit' ? (
          <>
            <fieldset>
              <legend className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Sizes</legend>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Sizes">
                {sizeOptions.map((item) => (
                  <ChoiceChip
                    key={item}
                    selected={sizes.includes(item)}
                    onClick={() => {
                      if (sizes.length === 1 && sizes.includes(item)) return;
                      setSizes(toggleValue(sizes, item));
                    }}
                  >
                    {item}
                  </ChoiceChip>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomSize();
                    }
                  }}
                  className={fieldClass}
                  placeholder="Add size"
                />
                <SecondaryButton type="button" onClick={addCustomSize}>
                  Add
                </SecondaryButton>
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Colours</legend>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Colours">
                {colorOptions.map((item) => (
                  <ChoiceChip
                    key={item}
                    selected={colors.includes(item)}
                    disabled={mode === 'add-skus' && sizes.every((size) => existingCombos.has(styleComboKey(size, item)))}
                    onClick={() => {
                      if (colors.length === 1 && colors.includes(item) && mode === 'create') return;
                      setColors(toggleValue(colors, item));
                    }}
                  >
                    {item}
                  </ChoiceChip>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomColor();
                    }
                  }}
                  className={fieldClass}
                  placeholder="Add colour"
                />
                <SecondaryButton type="button" onClick={addCustomColor}>
                  Add
                </SecondaryButton>
              </div>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price EUR" hint="Applies to every new SKU. Change a row if one colour costs more.">
                <input
                  value={sharedPrice}
                  onChange={(e) => setSharedPrice(e.target.value)}
                  required
                  inputMode="decimal"
                  placeholder="0.00"
                  className={fieldClass}
                />
              </Field>
              <Field label="Cost EUR" hint="Optional. Defaults to 0.00.">
                <input
                  value={sharedCost}
                  onChange={(e) => setSharedCost(e.target.value)}
                  inputMode="decimal"
                  className={fieldClass}
                />
              </Field>
            </div>
            <div>
              <p className="mb-1.5 text-xs uppercase tracking-wider text-ink/55">
                SKUs · {draftRows.length} {draftRows.length === 1 ? 'row' : 'rows'}
              </p>
              {draftRows.length ? (
                <div className="overflow-x-auto rounded-xl border border-ink/10">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <thead className="bg-accent/10 text-xs uppercase tracking-wider text-ink/55">
                      <tr>
                        <th className="px-3 py-2 font-medium">Size</th>
                        <th className="px-3 py-2 font-medium">Colour</th>
                        <th className="px-3 py-2 font-medium">SKU</th>
                        <th className="px-3 py-2 font-medium">Price</th>
                        <th className="px-3 py-2 font-medium">Cost</th>
                        <th className="px-3 py-2 font-medium" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10">
                      {draftRows.map((row) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2">{row.size}</td>
                          <td className="px-3 py-2">{row.color}</td>
                          <td className="px-3 py-2">
                            <input
                              value={row.sku}
                              onChange={(e) => setSkuOverride((current) => ({ ...current, [row.key]: e.target.value }))}
                              className={fieldClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.price}
                              onChange={(e) => setPriceOverride((current) => ({ ...current, [row.key]: e.target.value }))}
                              inputMode="decimal"
                              className={fieldClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.cost}
                              onChange={(e) => setCostOverride((current) => ({ ...current, [row.key]: e.target.value }))}
                              inputMode="decimal"
                              className={fieldClass}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <SecondaryButton type="button" onClick={() => setSkipped((current) => [...current, row.key])}>
                              Skip
                            </SecondaryButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-ink/55">
                  {mode === 'add-skus'
                    ? 'Pick a colour or size that is not already on this style.'
                    : 'Pick a category to fill sizes and colours.'}
                </p>
              )}
            </div>
          </>
        ) : (
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wider text-ink/55">SKUs</p>
            <div className="overflow-x-auto rounded-xl border border-ink/10">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="bg-accent/10 text-xs uppercase tracking-wider text-ink/55">
                  <tr>
                    <th className="px-3 py-2 font-medium">Size / colour</th>
                    <th className="px-3 py-2 font-medium">SKU</th>
                    <th className="px-3 py-2 font-medium">Price</th>
                    <th className="px-3 py-2 font-medium">Cost</th>
                    <th className="px-3 py-2 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {variantDrafts.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2">
                        {row.size} / {row.color}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.sku}
                          onChange={(e) =>
                            setVariantDrafts((current) =>
                              current.map((item) => (item.id === row.id ? { ...item, sku: e.target.value } : item)),
                            )
                          }
                          className={fieldClass}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.price}
                          onChange={(e) =>
                            setVariantDrafts((current) =>
                              current.map((item) => (item.id === row.id ? { ...item, price: e.target.value } : item)),
                            )
                          }
                          inputMode="decimal"
                          className={fieldClass}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={row.cost}
                          onChange={(e) =>
                            setVariantDrafts((current) =>
                              current.map((item) => (item.id === row.id ? { ...item, cost: e.target.value } : item)),
                            )
                          }
                          inputMode="decimal"
                          className={fieldClass}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Toggle
                          checked={row.active}
                          onChange={(next) =>
                            setVariantDrafts((current) =>
                              current.map((item) => (item.id === row.id ? { ...item, active: next } : item)),
                            )
                          }
                          label={row.active ? 'Active' : 'Off'}
                          showLabel={false}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <PrimaryButton type="submit" disabled={busy || saveBlocked}>
            {mode === 'add-skus' ? 'Add SKUs' : 'Save'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          {mode === 'create' ? (
            <span className="self-center text-xs text-ink/45">Saved unpublished. Use the Published slider when it is ready.</span>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
