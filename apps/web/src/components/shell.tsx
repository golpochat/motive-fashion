import Link from 'next/link';
import { BRAND } from '@motive-fashion/config';

const nav = [
  { href: '/shop', label: 'Shop' },
  { href: '/collections/ramadan', label: 'Ramadan' },
  { href: '/collections/eid', label: 'Eid' },
  { href: '/size-guide', label: 'Size guide' },
  { href: '/about', label: 'About' },
];

export function Header() {
  return (
    <header className="border-b border-ink/10 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-serif text-2xl tracking-tight no-underline">
          {BRAND.name}
        </Link>
        <nav className="hidden gap-6 text-sm md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="no-underline hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex gap-4 text-sm">
          <Link href="/account" className="no-underline hover:underline">
            Account
          </Link>
          <Link href="/cart" className="no-underline hover:underline">
            Cart
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3">
        <p className="font-serif text-xl">{BRAND.name}, {BRAND.city}</p>
        <div className="flex flex-col gap-2 text-sm">
          <Link href="/legal/returns">14-day returns</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/cookies">Cookies</Link>
        </div>
        <p className="text-sm text-ink/70">
          Prices include VAT. Collection in Dublin or delivery across Ireland.
        </p>
      </div>
    </footer>
  );
}
