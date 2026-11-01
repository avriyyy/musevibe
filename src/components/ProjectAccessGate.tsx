"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { WorkspaceSkeleton } from "@/components/LoadingState";
import { useVibe } from "@/lib/store";
import { canViewWorkspace } from "@/lib/workspace-access";
import { useAuthSession } from "@/lib/supabase/use-auth-session";

export default function ProjectAccessGate({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const ownerId = useVibe((state) => state.cloudOwnerByProject[projectId]);
  const auth = useAuthSession();

  if (canViewWorkspace(ownerId, auth.ready, auth.user?.id ?? null)) return children;
  if (!auth.ready) return <WorkspaceSkeleton label="Checking workspace access" />;

  return (
    <main className="grid min-h-dvh place-items-center bg-[#0b0c10] px-5 text-center text-[#f5f6f8]">
      <section className="max-w-md">
        <h1 className="text-[22px] font-semibold">This workspace is not available</h1>
        <p className="mt-3 text-[14px] leading-6 text-[#9aa0ae]">
          This workspace is not linked to the signed-in account. Its saved browser data has been left untouched.
        </p>
        <Link
          href="/projects"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-white px-5 text-[13px] font-semibold text-[#0b0c10] hover:bg-white/90"
        >
          Back to your projects
        </Link>
      </section>
    </main>
  );
}
