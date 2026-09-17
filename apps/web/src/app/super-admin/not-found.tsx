import { WorkspaceNotFound, notFoundMeta } from '@/components/not-found-view';

export const metadata = notFoundMeta;

export default function SuperAdminNotFound() {
  return <WorkspaceNotFound workspace="super-admin" />;
}
