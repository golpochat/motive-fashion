'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BRAND } from '@motive-fashion/config';
import { Icon, type IconName } from '@/components/icons';

export { Select, type SelectOption } from '@/components/select';

export const fieldClass =
  'w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent';

export function Panel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-white">
      {title ? (
        <h2 className="border-b border-ink/10 px-5 py-3 font-serif text-xl">{title}</h2>
      ) : null}
      <div className={title ? 'p-5' : 'p-0'}>{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink/45">{hint}</span> : null}
    </label>
  );
}

export function PrimaryButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-11 rounded-lg bg-primary px-4 py-2.5 text-sm text-cream hover:bg-primary/90 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`min-h-11 rounded-lg border border-ink/15 px-3 py-2.5 text-sm hover:border-ink/40 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function QtyStepper({
  value,
  onDecrease,
  onIncrease,
  decreaseLabel = 'Decrease',
  increaseLabel = 'Increase',
}: {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel?: string;
  increaseLabel?: string;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-ink/15">
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center text-sm hover:bg-ink/5"
        aria-label={decreaseLabel}
        onClick={onDecrease}
      >
        −
      </button>
      <span className="w-7 text-center text-sm tabular-nums">{value}</span>
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center text-sm hover:bg-ink/5"
        aria-label={increaseLabel}
        onClick={onIncrease}
      >
        +
      </button>
    </div>
  );
}

export function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white">
      <table className="w-full min-w-[36rem] text-left text-sm">
        <thead className="bg-accent/10 text-xs uppercase tracking-wider text-ink/55">
          <tr>
            {headers.map((header, i) => (
              <th
                key={`${header}-${i}`}
                className={`whitespace-nowrap px-4 py-3 font-medium ${header === 'Action' ? 'text-right' : ''}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/10">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  muted,
  nowrap,
}: {
  children: React.ReactNode;
  muted?: boolean;
  nowrap?: boolean;
}) {
  return (
    <td className={`px-4 py-3 align-top ${muted ? 'text-ink/55' : ''} ${nowrap ? 'whitespace-nowrap' : ''}`}>
      {children}
    </td>
  );
}

export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-0.5">{children}</div>;
}

export function IconButton({
  label,
  icon,
  onClick,
  disabled,
  href,
  tone = 'neutral',
}: {
  label: string;
  icon: IconName;
  onClick?: () => void;
  disabled?: boolean;
  href?: string;
  tone?: 'neutral' | 'danger' | 'success';
}) {
  const toneClass =
    tone === 'danger' ? 'hover:text-red-700' : tone === 'success' ? 'hover:text-emerald-800' : 'hover:text-ink';
  const className = `group relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink/60 hover:bg-ink/5 ${toneClass} disabled:pointer-events-none disabled:opacity-40`;
  const body = (
    <>
      <Icon name={icon} className="h-4 w-4" />
      <span className="pointer-events-none absolute right-full top-1/2 z-30 mr-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-primary px-2 py-1 text-xs text-cream opacity-0 shadow-sm group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} aria-label={label} className={`${className} no-underline`}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={className}>
      {body}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
  name,
  showLabel = true,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  name?: string;
  showLabel?: boolean;
}) {
  return (
    <div className="flex min-h-11 items-center gap-3">
      {name ? <input type="hidden" name={name} value={checked ? 'on' : ''} /> : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full ${checked ? 'bg-accent' : 'bg-ink/20'} disabled:opacity-40`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
      {showLabel ? <span className="text-sm">{label}</span> : null}
    </div>
  );
}

export function StatusBadge({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: 'live' | 'muted' | 'warn' | 'info';
}) {
  const cls = {
    live: 'bg-emerald-50 text-emerald-800',
    muted: 'bg-ink/5 text-ink/60',
    warn: 'bg-amber-50 text-amber-800',
    info: 'bg-sky-50 text-sky-800',
  }[tone];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${cls}`}>{children}</span>;
}

export function Tabs({
  items,
  current,
}: {
  items: { href: string; label: string }[];
  current: string;
}) {
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-ink/10">
      {items.map((item) => {
        const active = current === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`-mb-px min-h-11 border-b-2 px-4 py-2.5 text-sm no-underline ${active ? 'border-accent text-ink' : 'border-transparent text-ink/55 hover:text-ink'}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function FilterTabs({
  items,
  current,
  onChange,
  ariaLabel = 'Categories',
}: {
  items: { id: string; label: string }[];
  current: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}) {
  return (
    <nav className="flex flex-wrap gap-1 border-b border-ink/10" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = current === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.id)}
            className={`-mb-px min-h-11 border-b-2 px-3 py-2.5 text-sm ${active ? 'border-accent text-ink' : 'border-transparent text-ink/55 hover:text-ink'}`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function ChoiceChip({
  selected,
  onClick,
  children,
  disabled,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-11 rounded-full px-3.5 text-sm ${
        selected ? 'bg-ink text-cream' : 'border border-ink/15 bg-white text-ink hover:border-ink/40'
      } disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide,
  xl,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  xl?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-primary/40 px-4 py-10"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby="modal-title"
        className={`w-full rounded-2xl border border-ink/10 bg-white shadow-lg ${xl ? 'max-w-4xl' : wide ? 'max-w-2xl' : 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-3">
          <h2 id="modal-title" className="font-serif text-xl">
            {title}
          </h2>
          <button type="button" className="min-h-11 px-3 text-sm text-ink/55 hover:text-ink" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ConsoleFooter() {
  return (
    <footer className="mt-auto shrink-0 border-t border-ink/10 px-4 py-3 text-center text-xs text-ink/45 md:px-8">
      © {new Date().getFullYear()} {BRAND.legalName}
    </footer>
  );
}
