import { AuthForm } from '@/components/auth-form';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'Sign in',
  'Sign in to Motive Fashion to track orders, save addresses, or open a work console.',
);

export default function LoginPage() {
  return <AuthForm page="login" />;
}
