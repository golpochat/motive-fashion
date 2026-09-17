import { WorkspaceNotFound, notFoundMeta } from '@/components/not-found-view';

export const metadata = notFoundMeta;

export default function UserNotFound() {
  return <WorkspaceNotFound workspace="customer" />;
}
