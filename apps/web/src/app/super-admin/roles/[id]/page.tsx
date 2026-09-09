import { redirect } from 'next/navigation';

export default function SuperAdminRoleEditRedirect() {
  redirect('/super-admin/roles');
}
