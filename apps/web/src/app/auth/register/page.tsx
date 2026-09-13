import { AuthForm } from '@/components/auth-form';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'Create account',
  'Create a Motive Fashion account to track orders and save addresses.',
);

export default function RegisterPage() {
  return <AuthForm page="register" />;
}
