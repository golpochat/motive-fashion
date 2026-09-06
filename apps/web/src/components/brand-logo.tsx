import { BRAND } from '@motive-fashion/config';

const markPath =
  'M16.05 20h4.84L24.71 28.91V44.77H16.05zm25.41 0H46.3V44.77H41.46zM35.02 20h6.44l-.39 8.91-6.24 15.86h-3.24L27.7 35.28l3.19-6.37z';

export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="14.5" className="fill-clay" />
      <path d={markPath} className="fill-cream" />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return <BrandMark className="h-8 w-8 shrink-0" />;
  }
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
      <span className="whitespace-nowrap text-[15px] font-medium leading-none tracking-[0.02em] sm:text-base">
        {BRAND.name}
      </span>
    </span>
  );
}
