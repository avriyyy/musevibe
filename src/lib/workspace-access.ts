export function canViewWorkspace(
  ownerId: string | undefined,
  authReady: boolean,
  userId: string | null,
): boolean {
  if (!authReady) return false;
  // Viewing requires a session and explicit account ownership. Signed-out
  // visitors cannot view any workspace, owned or local-only.
  if (userId === null) return false;
  if (ownerId === undefined) return false;
  return ownerId === userId;
}
