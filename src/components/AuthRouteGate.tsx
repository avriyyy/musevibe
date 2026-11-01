"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/supabase/use-auth-session";
import { getPostAuthDestination, isAuthEntryRoute, isPublicAuthRoute, signInUrl } from "@/lib/auth-routes";

export default function AuthRouteGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const auth = useAuthSession();
  const publicRoute = isPublicAuthRoute(pathname);
  const authEntry = isAuthEntryRoute(pathname);

  useEffect(() => {
    if (!auth.ready) return;
    if (publicRoute) {
      if (auth.user && authEntry) {
        router.replace(getPostAuthDestination(window.location.search));
      }
      return;
    }
    if (!auth.user) {
      const requestedPath = `${pathname}${window.location.search}`;
      router.replace(signInUrl(requestedPath));
    }
  }, [auth.ready, auth.user, authEntry, pathname, publicRoute, router]);

  if (publicRoute) {
    if (auth.user && authEntry) return <AuthGateScreen message="Opening your workspace…" />;
    return children;
  }
  if (!auth.configured) {
    return <AuthGateScreen message="Account access is unavailable until sign-in is configured." />;
  }
  if (!auth.ready) return <AuthGateScreen message="Checking your account…" />;
  if (!auth.user) return <AuthGateScreen message="Taking you to sign in…" />;
  return children;
}

export function AuthRouteGateFallback() {
  return <AuthGateScreen message="Checking your account…" />;
}

function AuthGateScreen({ message }: { message: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#0b0c10] px-5 text-center text-[#f5f6f8]" role="status" aria-live="polite">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#13151a] px-6 py-8 shadow-2xl">
        <span aria-hidden className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-meta text-[13px] font-bold text-white">MV</span>
        <p className="mt-5 text-[14px] text-[#b8bdc8]">{message}</p>
      </div>
    </main>
  );
}
