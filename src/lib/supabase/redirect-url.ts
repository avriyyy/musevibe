const CANONICAL_PRODUCTION_ORIGIN = "https://musevibe.vercel.app";

/** Use the configured canonical site URL, never an accidental preview hostname for auth emails. */
export function authRedirectUrl(path: string, browserOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const currentOrigin = browserOrigin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const localOrigin = currentOrigin && new URL(currentOrigin).hostname === "localhost"
    ? currentOrigin
    : undefined;
  const base = configured || localOrigin || CANONICAL_PRODUCTION_ORIGIN;
  const normalizedBase = new URL(base).origin;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, normalizedBase).toString();
}
