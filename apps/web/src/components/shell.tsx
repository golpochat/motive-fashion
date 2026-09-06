'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLockup } from '@/components/brand-logo';
import { ProfileMenu } from '@/components/profile-menu';
import { Icon } from '@/components/icons';
import { useCart } from '@/lib/cart-store';
import { BRAND } from '@motive-fashion/config';

const nav = [
  { href: '/shop', label: 'Shop' },
  { href: '/collections/ramadan', label: 'Ramadan' },
  { href: '/collections/eid', label: 'Eid' },
  { href: '/size-guide', label: 'Size guide' },
  { href: '/about', label: 'About' },
];

const help = [
  { href: '/contact', label: 'Contact' },
  { href: '/legal/returns', label: '14-day returns' },
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/cookies', label: 'Cookies' },
];

function chromeLink(active: boolean) {
  return `text-sm no-underline transition-colors hover:text-accent ${active ? 'text-accent' : 'text-ink'}`;
}

function pathActive(pathname: string, href: string) {
  if (href === '/shop') return pathname === '/shop' || pathname.startsWith('/shop/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const { count, isOpen, open, close } = useCart();
  const onCartPage = pathname === '/cart';
  const cartActive = onCartPage || pathname.startsWith('/checkout') || isOpen;

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="shrink-0 no-underline">
          <BrandLockup />
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathActive(pathname, item.href) ? 'page' : undefined}
              className={chromeLink(pathActive(pathname, item.href))}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <ProfileMenu variant="storefront" />
          <button
            type="button"
            className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:text-accent ${cartActive ? 'text-accent' : 'text-ink'}`}
            aria-label={count ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'}
            aria-expanded={onCartPage ? undefined : isOpen}
            aria-current={onCartPage ? 'page' : undefined}
            onClick={() => {
              if (onCartPage) {
                close();
                return;
              }
              if (isOpen) close();
              else open();
            }}
          >
            <Icon name="cart" className="h-5 w-5" />
            {count > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-cream">
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </button>
        </div>
      </div>
      <nav className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 pb-3 lg:hidden">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathActive(pathname, item.href) ? 'page' : undefined}
            className={`shrink-0 ${chromeLink(pathActive(pathname, item.href))}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-ink/10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <BrandLockup />
          <p className="mt-3 text-sm text-ink/70">
            {BRAND.city}, {BRAND.country}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-ink/45">Shop</p>
          <div className="mt-3 flex flex-col gap-2">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={chromeLink(false)}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-ink/45">Help</p>
          <div className="mt-3 flex flex-col gap-2">
            {help.map((item) => (
              <Link key={item.href} href={item.href} className={chromeLink(false)}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <p className="border-t border-ink/10 px-4 py-4 text-center text-xs text-ink/45">
        © {new Date().getFullYear()} {BRAND.legalName}
      </p>
    </footer>
  );
}
