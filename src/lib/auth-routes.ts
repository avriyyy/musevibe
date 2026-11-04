const PUBLIC_AUTH_ROUTES = new Set([
  "/",
  "/sign-in",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/account",
  "/login",
  "/form-wizard",
]);

export function isPublicAuthRoute(pathname: string): boolean {
  if (PUBLIC_AUTH_ROUTES.has(pathname)) return true;
  // Guest workspaces live under /project/[id]; the project-level ownership
  // gate still decides which workspaces a visitor may actually view.
  return pathname.startsWith("/project/");
}

export function isAuthEntryRoute(pathname: string): boolean {
  return pathname === "/sign-in" || pathname === "/register" || pathname === "/account" || pathname === "/login";
}

export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  return value;
}

export function signInUrl(returnTo: string): string {
  return `/sign-in?next=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

export function getPostAuthDestination(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return safeReturnTo(params.get("next"));
}
