import { AuthForm } from '@/components/auth-form';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta('Choose a new password', 'Set a new password for your Motive Fashion account.');

export default function ResetPage() {
  return <AuthForm page="reset" />;
}
