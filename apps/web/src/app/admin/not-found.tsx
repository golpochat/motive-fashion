import { WorkspaceNotFound, notFoundMeta } from '@/components/not-found-view';

export const metadata = notFoundMeta;

export default function AdminNotFound() {
  return <WorkspaceNotFound workspace="admin" />;
}
