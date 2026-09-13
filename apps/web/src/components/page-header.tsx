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
        <h1 className="font-serif text-3xl tracking-tight [[data-theme=admin]_&]:font-sans [[data-theme=super-admin]_&]:font-sans">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/70">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 border-t-2 border-t-accent bg-white p-5">
      <p className="text-xs uppercase tracking-widest text-ink/55">{label}</p>
      <p className="mt-2 truncate font-serif text-3xl [[data-theme=admin]_&]:font-sans [[data-theme=super-admin]_&]:font-sans">{value}</p>
      {hint ? <p className="mt-1 truncate text-sm text-ink/55">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/15 px-6 py-12 text-center">
      <p className="font-serif text-xl">{title}</p>
      <p className="mt-2 text-sm text-ink/70">{body}</p>
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="text-sm text-ink/70" aria-busy="true">
      {label}
    </p>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
      <p className="text-sm text-red-800" role="alert">
        {message}
      </p>
      {onRetry ? (
        <button type="button" className="mt-3 min-h-11 rounded-full bg-primary px-5 py-2.5 text-sm text-cream" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function ConsoleSection({
  loading,
  error,
  empty,
  emptyTitle,
  emptyBody,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string;
  empty?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (empty) return <EmptyState title={emptyTitle ?? 'Nothing here yet'} body={emptyBody ?? 'Records will appear here when they exist.'} />;
  return <>{children}</>;
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
      <p className="mt-2 text-sm text-ink/70">{body}</p>
    </Link>
  );
}
