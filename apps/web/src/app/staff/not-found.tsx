import { WorkspaceNotFound, notFoundMeta } from '@/components/not-found-view';

export const metadata = notFoundMeta;

export default function StaffNotFound() {
  return <WorkspaceNotFound workspace="staff" />;
}
