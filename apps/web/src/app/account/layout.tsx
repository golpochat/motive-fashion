import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta('Sign in', 'Sign in or create a Motive Fashion account to track orders and save addresses.');

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
