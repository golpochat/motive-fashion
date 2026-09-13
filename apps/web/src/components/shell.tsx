'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLockup } from '@/components/brand-logo';
import { ProfileMenu } from '@/components/profile-menu';
import { workspaceFromPath } from '@/lib/workspaces';
import { Icon } from '@/components/icons';
import { BRAND, liveSeasonalNav } from '@motive-fashion/config';
import { ShopSearch } from '@/components/shop-search';

const coreNav = [
  { href: '/shop', label: 'Shop' },
  { href: '/size-guide', label: 'Size guide' },
  { href: '/about', label: 'About' },
];

const footerShopCore = [
  { href: '/shop', label: 'Shop' },
  { href: '/size-guide', label: 'Size guide' },
];

function withSeasonalNav<T extends { href: string; label: string }>(items: T[]) {
  const seasonal = liveSeasonalNav().map(({ href, label }) => ({ href, label }));
  return [items[0], ...seasonal, ...items.slice(1)];
}

const footerCompany = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/legal/returns', label: '14-day returns' },
];

const footerLegal = [
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/privacy', label: 'Privacy' },
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
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = withSeasonalNav(coreNav);

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
          <div className="hidden lg:block">
            <ShopSearch compact id="header-q" />
          </div>
          <ProfileMenu variant="storefront" currentWorkspace={workspaceFromPath(pathname)?.id} />
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

function footerLinkClass() {
  return 'block min-h-9 py-1.5 text-sm text-cream/70 no-underline transition-colors hover:text-cream';
}

export function Footer() {
  const footerShop = withSeasonalNav(footerShopCore);
  return (
    <footer className="mt-auto bg-primary text-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="inline-flex text-accent no-underline">
            <BrandLockup />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/70">
            Premium modest wear from {BRAND.city}. Hijabs, abayas, jilbabs, and prayer sets — collection and Ireland
            delivery.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Shop</p>
          <ul className="mt-3 list-none space-y-0.5 p-0">
            {footerShop.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={footerLinkClass()}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Company</p>
          <ul className="mt-3 list-none space-y-0.5 p-0">
            {footerCompany.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={footerLinkClass()}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Legal</p>
          <ul className="mt-3 list-none space-y-0.5 p-0">
            {footerLegal.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={footerLinkClass()}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="border-t border-cream/15 px-4 py-4 text-center text-xs text-cream/55">
        © {new Date().getFullYear()} {BRAND.legalName} · {BRAND.country}. All rights reserved.
      </p>
    </footer>
  );
}
