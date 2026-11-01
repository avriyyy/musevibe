export function canViewWorkspace(
  ownerId: string | undefined,
  authReady: boolean,
  userId: string | null,
): boolean {
  return ownerId === undefined || (authReady && userId !== null && ownerId === userId);
}
