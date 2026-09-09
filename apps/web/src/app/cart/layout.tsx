import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta('Cart', 'Your reserved Motive Fashion bag. Stock is held for a short window while you check out.');

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
