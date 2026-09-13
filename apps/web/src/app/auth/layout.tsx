import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'Sign in',
  'Sign in to Motive Fashion to track orders, save addresses, or open a work console.',
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[28rem] rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-8">
      {children}
    </div>
  );
}
