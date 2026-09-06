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
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/50">{label}</span>
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
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm hover:border-ink/40"
    >
      {children}
    </button>
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

export function ConsoleFooter() {
  return (
    <footer className="mt-auto shrink-0 border-t border-ink/10 px-4 py-3 text-center text-xs text-ink/45 md:px-8">
      © {new Date().getFullYear()} {BRAND.legalName}
    </footer>
  );
}
