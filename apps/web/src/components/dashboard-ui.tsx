'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BRAND } from '@motive-fashion/config';

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
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">{label}</span>
      {children}
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
      className={`rounded-lg bg-primary px-4 py-2 text-sm text-cream hover:bg-primary/90 disabled:opacity-50 ${className}`}
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
      className={`rounded-lg border border-ink/15 px-3 py-1.5 text-sm hover:border-ink/40 disabled:opacity-50 ${className}`}
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
        className="flex h-8 w-8 items-center justify-center text-sm hover:bg-ink/5"
        aria-label={decreaseLabel}
        onClick={onDecrease}
      >
        −
      </button>
      <span className="w-7 text-center text-sm tabular-nums">{value}</span>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center text-sm hover:bg-ink/5"
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
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-3 font-medium">
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
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return <td className={`px-4 py-3 align-top ${muted ? 'text-ink/55' : ''}`}>{children}</td>;
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
            className={`-mb-px border-b-2 px-4 py-2 text-sm no-underline ${active ? 'border-accent text-ink' : 'border-transparent text-ink/55 hover:text-ink'}`}
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
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${active ? 'border-accent text-ink' : 'border-transparent text-ink/55 hover:text-ink'}`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
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
        className={`w-full rounded-2xl border border-ink/10 bg-white shadow-lg ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-3">
          <h2 id="modal-title" className="font-serif text-xl">
            {title}
          </h2>
          <button type="button" className="text-sm text-ink/55 hover:text-ink" onClick={onClose}>
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
