import Link from 'next/link';
import { Icon, type IconName } from '@/components/icons';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/70">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 border-t-2 border-t-accent bg-white p-5">
      <p className="text-xs uppercase tracking-widest text-ink/50">{label}</p>
      <p className="mt-2 truncate font-serif text-3xl">{value}</p>
      {hint ? <p className="mt-1 truncate text-sm text-ink/60">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/15 px-6 py-12 text-center">
      <p className="font-serif text-xl">{title}</p>
      <p className="mt-2 text-sm text-ink/60">{body}</p>
    </div>
  );
}

export function DashCard({
  href,
  icon,
  label,
  body,
}: {
  href: string;
  icon: IconName;
  label: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-ink/10 bg-white p-5 no-underline transition-colors hover:border-accent"
    >
      <Icon name={icon} className="h-5 w-5 text-accent" />
      <p className="mt-3 font-serif text-2xl">{label}</p>
      <p className="mt-2 text-sm text-ink/60">{body}</p>
    </Link>
  );
}
