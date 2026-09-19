import { WorkspaceNotFound } from '@/components/not-found-view';
import type { WorkspaceId } from '@/lib/workspaces';

export function unmatchedPage(workspace: WorkspaceId) {
  return function UnmatchedWorkspacePage() {
    return <WorkspaceNotFound workspace={workspace} />;
  };
}
