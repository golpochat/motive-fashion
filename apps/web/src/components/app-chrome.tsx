'use client';

import { usePathname } from 'next/navigation';
import { Footer, Header } from '@/components/shell';
import { CookieBanner } from '@/components/cookie-banner';
import { CartBoot, MiniCart } from '@/components/mini-cart';
import { isAuthPath, isWorkspacePath } from '@/lib/rbac';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isWorkspacePath(pathname)) {
    return <>{children}</>;
  }
  const auth = isAuthPath(pathname);
  return (
    <div data-theme="storefront" className="flex min-h-dvh flex-col bg-surface">
      <CartBoot />
      <Header />
      <main
        className={
          auth
            ? 'flex w-full flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12'
            : 'mx-auto w-full max-w-6xl flex-1 px-4 py-8'
        }
      >
        {children}
      </main>
      <Footer />
      <MiniCart />
      <CookieBanner />
    </div>
  );
}
