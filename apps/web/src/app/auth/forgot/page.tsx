import { AuthForm } from '@/components/auth-form';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta('Reset password', 'Request a Motive Fashion password reset link.');

export default function ForgotPage() {
  return <AuthForm page="forgot" />;
}
