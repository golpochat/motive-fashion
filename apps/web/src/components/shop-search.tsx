import { Icon } from '@/components/icons';

export function ShopSearch({
  action = '/shop',
  defaultQuery = '',
  compact = false,
  id = 'shop-q',
}: {
  action?: string;
  defaultQuery?: string;
  compact?: boolean;
  id?: string;
}) {
  if (compact) {
    return (
      <form action={action} method="get" role="search" className="relative">
        <label htmlFor={id} className="sr-only">
          Search the shop
        </label>
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/55" />
        <input
          id={id}
          name="q"
          defaultValue={defaultQuery}
          placeholder="Search"
          className="h-11 w-full rounded-full border border-ink/15 bg-white pl-9 pr-3 text-sm outline-none focus:border-accent lg:w-48"
        />
      </form>
    );
  }

  return (
    <form action={action} method="get" role="search" className="mt-6 flex flex-col gap-2 sm:flex-row">
      <label htmlFor={id} className="sr-only">
        Search the shop
      </label>
      <input
        id={id}
        name="q"
        defaultValue={defaultQuery}
        placeholder="Search hijabs, abayas, jilbabs…"
        className="min-h-11 w-full rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm outline-none focus:border-accent"
      />
      <button type="submit" className="min-h-11 shrink-0 rounded-full bg-primary px-6 py-2.5 text-sm text-cream">
        Search
      </button>
    </form>
  );
}
