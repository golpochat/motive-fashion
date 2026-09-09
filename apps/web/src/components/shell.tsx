'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLockup } from '@/components/brand-logo';
import { ProfileMenu } from '@/components/profile-menu';
import { workspaceFromPath } from '@/lib/workspaces';
import { Icon } from '@/components/icons';
import { useCart } from '@/lib/cart-store';
import { BRAND } from '@motive-fashion/config';
import { ShopSearch } from '@/components/shop-search';

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
  return `inline-flex min-h-11 items-center text-sm no-underline transition-colors hover:text-accent ${active ? 'text-accent' : 'text-ink'}`;
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.body.classList.add('overflow-hidden');
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('overflow-hidden');
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-ink/10 bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2">
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
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <div className="hidden xl:block">
            <ShopSearch compact id="header-q" />
          </div>
          <ProfileMenu variant="storefront" currentWorkspace={workspaceFromPath(pathname)?.id} />
          <button
            type="button"
            className={`relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors hover:text-accent ${cartActive ? 'text-accent' : 'text-ink'}`}
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
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-cream">
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((openMenu) => !openMenu)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" />
          </button>
        </div>
      </div>
      {menuOpen ? (
        <div className="border-t border-ink/10 bg-surface px-4 py-4 lg:hidden">
          <ShopSearch compact id="menu-q" />
          <nav className="mt-3 flex flex-col">
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
            <Link href="/contact" className={chromeLink(pathActive(pathname, '/contact'))}>
              Contact
            </Link>
          </nav>
        </div>
      ) : null}
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
          <div className="mt-3 flex flex-col gap-1">
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className={chromeLink(false)}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-ink/45">Help</p>
          <div className="mt-3 flex flex-col gap-1">
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
