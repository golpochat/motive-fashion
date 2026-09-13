import { AuthForm } from '@/components/auth-form';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta('Verify email', 'Confirm your Motive Fashion email address.');

export default function VerifyPage() {
  return <AuthForm page="verify" />;
}
