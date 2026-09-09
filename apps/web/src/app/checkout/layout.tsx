import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'Checkout',
  'Pay as a guest or sign in. Ireland delivery and Dublin collection. Card payments via Stripe.',
);

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
