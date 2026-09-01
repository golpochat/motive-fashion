import type { Metadata } from 'next';
import { Cormorant_Garamond, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import { Footer, Header } from '@/components/shell';
import { CookieBanner } from '@/components/cookie-banner';
import { BRAND } from '@motive-fashion/config';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-serif' });
const sans = Source_Sans_3({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: `${BRAND.name} — modest wear, Dublin`,
    template: `%s · ${BRAND.name}`,
  },
  description: 'Premium modest wear from Dublin. Hijabs, abayas, jilbabs, and prayer sets. VAT-inclusive prices. Collection and Ireland delivery.',
  openGraph: { locale: 'en_IE', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IE">
      <body className={`${serif.variable} ${sans.variable} font-sans`}>
        <Header />
        <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10">{children}</main>
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
