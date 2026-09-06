'use client';

import { useEffect, useId, useRef, useState } from 'react';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function Select({
  name,
  value,
  defaultValue = '',
  onChange,
  options,
  placeholder = 'Select',
  required,
  className,
  disabled,
  sortLabels,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  sortLabels?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const list = sortLabels
    ? [...options].sort((a, b) => a.label.localeCompare(b.label, 'en-IE'))
    : options;
  const selected = value ?? uncontrolled;
  const selectedOption = list.find((o) => o.value === selected);
  const enabled = list.filter((o) => !o.disabled);

  function pick(next: string) {
    if (value === undefined) setUncontrolled(next);
    onChange?.(next);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!enabled.length) return;
        const idx = enabled.findIndex((o) => o.value === selected);
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const next = enabled[(idx + delta + enabled.length) % enabled.length];
        if (next) {
          if (value === undefined) setUncontrolled(next.value);
          onChange?.(next.value);
        }
      }
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    const active = listRef.current?.querySelector('[data-selected="true"]');
    if (active instanceof HTMLElement) active.scrollIntoView({ block: 'nearest' });
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, selected, value, onChange, options]);

  return (
    <div ref={rootRef} className="relative">
      {name ? (
        <select
          name={name}
          required={required}
          value={selected}
          onChange={(e) => pick(e.target.value)}
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        >
          {required ? <option value="">{placeholder}</option> : null}
          {list.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={`${className ?? 'w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent'} flex items-center justify-between gap-3 text-left ${open ? 'relative z-50 !rounded-b-none' : ''}`}
      >
        <span className={selectedOption ? '' : 'text-ink/45'}>{selectedOption?.label ?? placeholder}</span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 text-ink/50 ${open ? 'rotate-180' : ''}`} aria-hidden>
          <path fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="m5 7.5 5 5 5-5" />
        </svg>
      </button>
      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-40 -mt-px max-h-60 w-full overflow-y-auto rounded-b-xl border border-t-0 border-ink/15 bg-white py-1 shadow-lg [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink/25 [&::-webkit-scrollbar-track]:bg-ink/5"
        >
          {list.map((o) => {
            const isSelected = o.value === selected;
            return (
              <li key={o.value} role="option" aria-selected={isSelected} aria-disabled={o.disabled} data-selected={isSelected}>
                <button
                  type="button"
                  disabled={o.disabled}
                  onClick={() => pick(o.value)}
                  className={`flex w-full px-3 py-2 text-left text-sm ${
                    isSelected
                      ? 'bg-ink text-cream'
                      : o.disabled
                        ? 'cursor-not-allowed text-ink/35'
                        : 'text-ink hover:bg-ink/5'
                  }`}
                >
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
