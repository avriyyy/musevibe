export function canViewWorkspace(
  ownerId: string | undefined,
  authReady: boolean,
  userId: string | null,
): boolean {
  if (!authReady) return false;
  // Local-only work belongs to whoever holds this browser: guests may view
  // unowned workspaces, while a signed-in session keeps the legacy boundary
  // and still requires explicit account ownership.
  if (ownerId === undefined) return userId === null;
  return userId !== null && ownerId === userId;
}
