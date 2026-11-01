export type WorkspaceMergeDecision = "replace" | "keep-pending" | "keep-conflict";

export function decideWorkspaceMerge(input: {
  existingOwnerId: string | undefined;
  accountId: string;
  localRevision: string | undefined;
  remoteRevision: string;
  localSnapshotJson: string | undefined;
  remoteSnapshotJson: string;
}): WorkspaceMergeDecision {
  if (input.existingOwnerId !== input.accountId || input.localSnapshotJson === undefined) {
    return "replace";
  }
  if (input.localSnapshotJson === input.remoteSnapshotJson) return "replace";
  if (input.localRevision && input.localRevision === input.remoteRevision) {
    return "keep-pending";
  }
  return "keep-conflict";
}
