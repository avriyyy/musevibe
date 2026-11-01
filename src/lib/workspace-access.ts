export function canViewWorkspace(
  ownerId: string | undefined,
  authReady: boolean,
  userId: string | null,
): boolean {
  return authReady && userId !== null && ownerId !== undefined && ownerId === userId;
}
