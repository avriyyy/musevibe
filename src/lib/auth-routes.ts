const PUBLIC_AUTH_ROUTES = new Set([
  "/",
  "/sign-in",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/account",
  "/login",
]);

export function isPublicAuthRoute(pathname: string): boolean {
  // Signed-out visitors stop at the landing and auth pages. Everything else,
  // including /form-wizard and /project/[id], requires a session.
  return PUBLIC_AUTH_ROUTES.has(pathname);
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
